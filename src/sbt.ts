import { ChildProcess, spawn, type SpawnOptions } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { SbtBuildTool } from './types.js'

const ANSI_ESCAPE = /\u001b\[[0-9;]*[A-Za-z]/g

export interface SbtInvokeOptions {
  maxAttempts?: number
  retryDelayMs?: number
  onRetry?: (message: string) => void
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE, '')
}

/** Extract an absolute filesystem path from a single line of sbt output. */
function extractPathFromLine(line: string): string | null {
  const trimmed = stripAnsi(line).replace(/^\[info\]\s*/, '').trim()
  if (!trimmed) return null

  if (/^\/[^\s]*$/.test(trimmed) || /^[A-Za-z]:[\\/][^\s]*$/.test(trimmed)) {
    return trimmed
  }

  const unixMatch = trimmed.match(/(\/[^\s\[\]\u001b]+)/)
  if (unixMatch) return unixMatch[1]

  const windowsMatch = trimmed.match(/([A-Za-z]:[\\/][^\s\[\]\u001b]+)/)
  if (windowsMatch) return windowsMatch[1]

  return null
}

function isLinkerOutputDir(path: string): boolean {
  return /-(?:fastopt|opt)$/.test(path)
}

function extractPathsFromOutput(fullOutput: string): string[] {
  const candidates: string[] = []

  for (const rawLine of fullOutput.split('\n')) {
    const line = stripAnsi(rawLine).trim()
    if (!line || line.startsWith('[success]') || line.startsWith('[error]')) continue

    const path = extractPathFromLine(line)
    if (path) candidates.push(path)
  }

  if (candidates.length === 0) {
    const fallback = stripAnsi(fullOutput).match(/(\/[^\s\[\]\u001b]+)/g)
    if (fallback) candidates.push(...fallback)
  }

  return candidates
}

function extractSbtPrintOutput(fullOutput: string): string {
  const candidates = extractPathsFromOutput(fullOutput)

  if (candidates.length === 0) {
    throw new Error(`Could not parse sbt print output:\n${fullOutput}`)
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    if (isLinkerOutputDir(candidates[i])) {
      return candidates[i]
    }
  }

  return candidates[candidates.length - 1]
}

/** @internal Exported for unit tests. */
export function parseSbtPrintOutput(fullOutput: string): string {
  return extractSbtPrintOutput(fullOutput)
}

function shouldLogSbtOutput(): boolean {
  return process.env.DEBUG != null && process.env.DEBUG !== ''
}

function getSbtScript(buildTool: SbtBuildTool): string {
  return buildTool.script || (process.platform === 'win32' ? 'sbt.bat' : 'sbt')
}

/** Escape a string as a Scala string literal safe for sbt shell arguments. */
function scalaString(s: string): string {
  const escaped = s.replace(/[\u0000- \\"']/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
  return '"' + escaped + '"'
}

/** sbt command that writes `${task}` value to a temp file (avoids stdout parsing issues). */
export function buildSbtOutputFileCommand(task: string, outputFile: string): string {
  const disableAggregate = `set ${task} / aggregate := false`
  const writeOutput = `set TaskKey[Unit](${scalaString('scalajsVitePluginCapture')}) := sbt.IO.write(file(${scalaString(outputFile)}), (${task}).value.toString, java.nio.charset.StandardCharsets.UTF_8)`
  return `${disableAggregate}; ${writeOutput}; scalajsVitePluginCapture`
}

function sbtBaseArgs(): string[] {
  return ['--batch', '-no-colors', '-Dsbt.supershell=false']
}

function formatSpawnFailure(code: number | null, fullOutput: string): Error {
  let errorMessage = `sbt build failed with exit code ${code ?? 'unknown'}`
  if (fullOutput.includes('Not a valid command: --')) {
    errorMessage += '\nCause: Your sbt launcher script version is too old (<1.3.3).'
    errorMessage += '\nFix: Re-install the latest version of sbt launcher script from https://www.scala-sbt.org/'
  }
  const errorLines = fullOutput.split('\n').filter((line) => line.includes('[error]'))
  if (errorLines.length > 0) {
    errorMessage += `\n${errorLines.join('\n')}`
  }
  return new Error(errorMessage)
}

function spawnSbtCommand(
  buildTool: SbtBuildTool,
  sbtCommand: string,
  cwd?: string,
): Promise<{ code: number | null; fullOutput: string }> {
  const script = getSbtScript(buildTool)
  const args = [...sbtBaseArgs(), sbtCommand]
  console.debug(`🔍 Starting sbt with command "${sbtCommand}" in workspace root ${cwd}`)

  return new Promise((resolve, reject) => {
    const options: SpawnOptions = {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
    const child =
      process.platform === 'win32'
        ? spawn(
            script,
            args.map((x) => `"${x.replace(/"/g, '""')}"`),
            { shell: true, ...options },
          )
        : spawn(script, args, options)

    let fullOutput = ''
    child.stdout?.setEncoding('utf-8')
    child.stdout?.on('data', (data: string) => {
      fullOutput += data
      if (shouldLogSbtOutput()) process.stdout.write(data)
    })
    child.stderr?.setEncoding('utf-8')
    child.stderr?.on('data', (data: string) => {
      fullOutput += data
      if (shouldLogSbtOutput()) process.stderr.write(data)
    })

    child.on('error', (err) => {
      reject(new Error(`sbt invocation for Scala.js compilation could not start. Is it installed?\n${err}`))
    })
    child.on('close', (code) => {
      resolve({ code, fullOutput })
    })
  })
}

function isRetryableSbtFailure(fullOutput: string): boolean {
  return fullOutput.includes('sbt thinks that server is already booting')
}

async function runSbtPrintOnce(
  task: string,
  buildTool: SbtBuildTool,
  cwd?: string,
  invokeOptions: SbtInvokeOptions = {},
): Promise<string> {
  const baseTmp = os.tmpdir()
  const myTmp = await mkdtemp(path.join(baseTmp, 'scalajs-vite-plugin-'))
  const myTmpFile = path.join(myTmp, 'out')

  try {
    const sbtCommand = buildSbtOutputFileCommand(task, myTmpFile)
    const { code, fullOutput } = await spawnSbtCommand(buildTool, sbtCommand, cwd)
    if (code !== 0) {
      throw formatSpawnFailure(code, fullOutput)
    }
    const raw = (await readFile(myTmpFile, 'utf-8')).trim()
    if (!raw) {
      throw new Error(`sbt wrote an empty path for task ${task}`)
    }
    return raw
  } finally {
    await rm(myTmp, { recursive: true, force: true })
  }
}

async function runSbtPrint(
  task: string,
  buildTool: SbtBuildTool,
  cwd?: string,
  invokeOptions: SbtInvokeOptions = {},
): Promise<string> {
  const maxAttempts = invokeOptions.maxAttempts ?? buildTool.maxAttempts ?? 1
  const retryDelayMs = invokeOptions.retryDelayMs ?? buildTool.retryDelayMs ?? 1000
  const onRetry = invokeOptions.onRetry

  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await runSbtPrintOnce(task, buildTool, cwd, invokeOptions)
    } catch (err) {
      lastError = err
      const message = err instanceof Error ? err.message : String(err)
      const output = message
      if (attempt < maxAttempts - 1 && isRetryableSbtFailure(output)) {
        onRetry?.(
          `Scala.js plugin: sbt server was booting, retrying (${attempt + 1}/${maxAttempts - 1})…`,
        )
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
        continue
      }
      throw err
    }
  }
  throw lastError
}

function spawnSbt(task: string, buildTool: SbtBuildTool, cwd?: string): ChildProcess {
  const args = [...sbtBaseArgs(), task]
  const options: SpawnOptions = {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  }
  console.debug(`🔍 Starting sbt watch task "${task}" in workspace root ${cwd}`)
  const script = getSbtScript(buildTool)
  const child =
    process.platform === 'win32'
      ? spawn(
          script,
          args.map((x) => `"${x.replace(/"/g, '""')}"`),
          { shell: true, ...options },
        )
      : spawn(script, args, options)

  if (shouldLogSbtOutput()) {
    child.stdout!.setEncoding('utf-8')
    child.stdout!.on('data', (data) => process.stdout.write(data))
    child.stderr!.setEncoding('utf-8')
    child.stderr!.on('data', (data) => process.stderr.write(data))
  }

  child.on('error', (err) => {
    console.error(`sbt invocation for Scala.js compilation could not start. Is it installed?\n${err}`)
  })

  return child
}

function scopedSbtTask(projectID: string, taskName: string): string {
  const normalized = taskName.includes('/') ? taskName : `Compile/${taskName}`
  return `${projectID}/${normalized}`
}

export function getSbtTask(projectID: string, isDev: boolean, customTask?: string): string {
  if (customTask?.trim()) {
    return scopedSbtTask(projectID, customTask.trim())
  }
  const task = isDev ? 'fastLinkJSOutput' : 'fullLinkJSOutput'
  return scopedSbtTask(projectID, task)
}

export function getSbtLinkTask(projectID: string, isDev: boolean): string {
  const task = isDev ? 'fastLinkJS' : 'fullLinkJS'
  return scopedSbtTask(projectID, task)
}

export function sbtBuildAndReturnOutputDir(
  projectID: string,
  buildTool: SbtBuildTool,
  isDev: boolean,
  cwd?: string,
  invokeOptions?: SbtInvokeOptions,
): Promise<string> {
  const task = getSbtTask(projectID, isDev, buildTool.outputTask)
  return runSbtPrint(task, buildTool, cwd, invokeOptions)
}

export function sbtBuild(projectID: string, buildTool: SbtBuildTool, isDev: boolean, cwd?: string): ChildProcess {
  const task = getSbtLinkTask(projectID, isDev)
  const watchOrNot = isDev ? `~${task}` : task
  return spawnSbt(watchOrNot, buildTool, cwd)
}
