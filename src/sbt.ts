import { ChildProcess, spawn, SpawnOptions } from 'child_process'
import type { SbtBuildTool } from './types.js'

// Utility to invoke a given sbt task and fetch its output
export function _build(task: string, buildTool: SbtBuildTool, cwd?: string): [Promise<string>, ChildProcess] {
  const args = ['--batch', '-no-colors', '-Dsbt.supershell=false', `print ${task}`]
  const options: SpawnOptions = {
    cwd: cwd,
    stdio: ['ignore', 'pipe', 'inherit'],
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
    process.stdout.write(data) // tee on my own stdout
  })

  return [
    new Promise((resolve, reject) => {
      child.on('exit', (code) => {
        if (code === 0) {
          resolve(fullOutput.trimEnd().split('\n').at(-1)!)
        } else {
          const errorLines = fullOutput.split('\n').filter((line) => line.startsWith('[error]'))
          reject(new Error(`sbt build failed with exit code ${code}\n${errorLines.join('\n')}`))
        }
      })
      child.on('error', (err) => {
        console.error(`sbt invocation for Scala.js compilation could not start. Is it installed?\n${err}`)
        reject(new Error(`sbt invocation for Scala.js compilation could not start. Is it installed?\n${err}`))
      })
      child.on('close', (code) => {
        if (code !== 0) {
          let errorMessage = `sbt invocation for Scala.js compilation failed with exit code ${code}.`
          if (fullOutput.includes('Not a valid command: --')) {
            errorMessage += '\nCause: Your sbt launcher script version is too old (<1.3.3).'
            errorMessage +=
              '\nFix: Re-install the latest version of sbt launcher script from https://www.scala-sbt.org/'
          }
          reject(new Error(errorMessage))
        } else {
          resolve(fullOutput.trimEnd().split('\n').at(-1)!)
        }
      })
    }),
    child,
  ]
}

export function getSbtTask(projectID: string, isDev: boolean): string {
  const task = isDev ? 'fastLinkJSOutput' : 'fullLinkJSOutput'
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
  const task = getSbtTask(projectID, isDev)
  const watchOrNot = isDev ? '~' : ''
  return _build(watchOrNot + task, buildTool, cwd)[1]
}
