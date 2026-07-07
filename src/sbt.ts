import { ChildProcess, execFile, spawn, SpawnOptions, type ExecFileException } from 'child_process'
import type { SbtBuildTool } from './types.js'

const ANSI_ESCAPE = /\u001b\[[0-9;]*[A-Za-z]/g
const SBT_PRINT_MAX_BUFFER = 10 * 1024 * 1024

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

function sbtPrintArgs(task: string): string[] {
  return ['--batch', '-no-colors', '-Dsbt.supershell=false', `print ${task}`]
}

function formatSbtExecFailure(err: ExecFileException, fullOutput: string): Error {
  const code = err.code ?? 'unknown'
  const errorLines = fullOutput.split('\n').filter((line) => line.includes('[error]'))
  let errorMessage = `sbt build failed with exit code ${code}`
  if (errorLines.length > 0) {
    errorMessage += `\n${errorLines.join('\n')}`
  } else if (fullOutput.includes('Not a valid command: --')) {
    errorMessage += '\nCause: Your sbt launcher script version is too old (<1.3.3).'
    errorMessage += '\nFix: Re-install the latest version of sbt launcher script from https://www.scala-sbt.org/'
  }
  return new Error(errorMessage)
}

function runSbtPrintOnce(task: string, buildTool: SbtBuildTool, cwd?: string): Promise<string> {
  const script = getSbtScript(buildTool)
  const args = sbtPrintArgs(task)
  console.debug(`🔍 Starting sbt print task with args ${args.join(' ')} in workspace root ${cwd}`)

  return new Promise((resolve, reject) => {
    const callback = (err: ExecFileException | null, stdout: string, stderr: string) => {
      const fullOutput = stdout + stderr
      if (shouldLogSbtOutput()) {
        process.stdout.write(stdout)
        process.stderr.write(stderr)
      }
      if (err) {
        reject(formatSbtExecFailure(err, fullOutput))
        return
      }
      try {
        resolve(extractSbtPrintOutput(fullOutput))
      } catch (parseErr) {
        reject(parseErr)
      }
    }

    if (process.platform === 'win32') {
      execFile(
        script,
        args.map((x) => `"${x}"`),
        { shell: true, cwd, maxBuffer: SBT_PRINT_MAX_BUFFER, encoding: 'utf-8' },
        callback,
      )
    } else {
      execFile(script, args, { cwd, maxBuffer: SBT_PRINT_MAX_BUFFER, encoding: 'utf-8' }, callback)
    }
  })
}

async function runSbtPrint(task: string, buildTool: SbtBuildTool, cwd?: string): Promise<string> {
  try {
    return await runSbtPrintOnce(task, buildTool, cwd)
  } catch (err) {
    if (!(err instanceof Error) || !err.message.startsWith('Could not parse sbt print output:')) {
      throw err
    }
    // Rare CI race: sbt exits 0 before the printed path is flushed. Retry once.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return runSbtPrintOnce(task, buildTool, cwd)
  }
}

function spawnSbt(task: string, buildTool: SbtBuildTool, cwd?: string): ChildProcess {
  const args = sbtPrintArgs(task)
  const options: SpawnOptions = {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  }
  console.debug(`🔍 Starting sbt watch task with args ${args.join(' ')} in workspace root ${cwd}`)
  const script = getSbtScript(buildTool)
  const child =
    process.platform === 'win32'
      ? spawn(
          script,
          args.map((x) => `"${x}"`),
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

export function getSbtTask(projectID: string, isDev: boolean): string {
  const task = isDev ? 'fastLinkJSOutput' : 'fullLinkJSOutput'
  return `${projectID}/${task}`
}

export function getSbtLinkTask(projectID: string, isDev: boolean): string {
  const task = isDev ? 'fastLinkJS' : 'fullLinkJS'
  return `${projectID}/${task}`
}

export function sbtBuildAndReturnOutputDir(
  projectID: string,
  buildTool: SbtBuildTool,
  isDev: boolean,
  cwd?: string,
): Promise<string> {
  const task = getSbtTask(projectID, isDev)
  return runSbtPrint(task, buildTool, cwd)
}

export function sbtBuild(projectID: string, buildTool: SbtBuildTool, isDev: boolean, cwd?: string): ChildProcess {
  const task = getSbtLinkTask(projectID, isDev)
  const watchOrNot = isDev ? '~' : ''
  return spawnSbt(watchOrNot + task, buildTool, cwd)
}
