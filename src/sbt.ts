import { ChildProcess, spawn, SpawnOptions } from 'child_process'
import type { SbtBuildTool } from './types.js'

/** Extract an absolute filesystem path from a single line of sbt output. */
function extractPathFromLine(line: string): string | null {
  const trimmed = line.replace(/^\[info\]\s*/, '').trim()
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
  return path.endsWith('-fastopt') || path.endsWith('-opt')
}

function extractSbtPrintOutput(fullOutput: string): string {
  const candidates: string[] = []

  for (const line of fullOutput.trimEnd().split('\n')) {
    if (!line || line.includes('\u001b')) continue
    if (line.startsWith('[success]') || line.startsWith('[error]')) continue
    if (line.startsWith('[')) continue

    const path = extractPathFromLine(line)
    if (path) candidates.push(path)
  }

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

function shouldLogSbtOutput(): boolean {
  return process.env.DEBUG != null && process.env.DEBUG !== ''
}

// Utility to invoke a given sbt task and fetch its output
export function _build(task: string, buildTool: SbtBuildTool, cwd?: string): [Promise<string>, ChildProcess] {
  const args = ['--batch', '-no-colors', '-Dsbt.supershell=false', `print ${task}`]
  const options: SpawnOptions = {
    cwd: cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  }
  console.debug(`🔍 Starting sbt build task with args ${args.join(' ')} in workspace root ${cwd}`)
  const script = buildTool.script || (process.platform === 'win32' ? 'sbt.bat' : 'sbt')
  const child =
    process.platform === 'win32'
      ? spawn(
          script,
          args.map((x) => `"${x}"`),
          { shell: true, ...options },
        )
      : spawn(script, args, options)

  let fullOutput: string = ''

  child.stdout!.setEncoding('utf-8')
  child.stdout!.on('data', (data) => {
    fullOutput += data
    if (shouldLogSbtOutput()) {
      process.stdout.write(data)
    }
  })

  child.stderr!.setEncoding('utf-8')
  child.stderr!.on('data', (data) => {
    fullOutput += data
    if (shouldLogSbtOutput()) {
      process.stderr.write(data)
    }
  })

  return [
    new Promise((resolve, reject) => {
      child.on('error', (err) => {
        console.error(`sbt invocation for Scala.js compilation could not start. Is it installed?\n${err}`)
        reject(new Error(`sbt invocation for Scala.js compilation could not start. Is it installed?\n${err}`))
      })
      child.on('close', (code) => {
        if (code !== 0) {
          const errorLines = fullOutput.split('\n').filter((line) => line.includes('[error]'))
          let errorMessage = `sbt build failed with exit code ${code}`
          if (errorLines.length > 0) {
            errorMessage += `\n${errorLines.join('\n')}`
          } else if (fullOutput.includes('Not a valid command: --')) {
            errorMessage += '\nCause: Your sbt launcher script version is too old (<1.3.3).'
            errorMessage +=
              '\nFix: Re-install the latest version of sbt launcher script from https://www.scala-sbt.org/'
          }
          reject(new Error(errorMessage))
          return
        }
        resolve(extractSbtPrintOutput(fullOutput))
      })
    }),
    child,
  ]
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
  return _build(task, buildTool, cwd)[0]
}

export function sbtBuild(projectID: string, buildTool: SbtBuildTool, isDev: boolean, cwd?: string): ChildProcess {
  const task = getSbtLinkTask(projectID, isDev)
  const watchOrNot = isDev ? '~' : ''
  return _build(watchOrNot + task, buildTool, cwd)[1]
}
