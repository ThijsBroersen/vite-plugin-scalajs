import { watch, existsSync } from 'fs'
import { execSync, spawn, type ChildProcess } from 'child_process'
import { join } from 'path'
import type { ViteDevServer } from 'vite'
import type { MillBuildTool } from './types.js'

export function startMillBuildTask(
  projectID: string,
  buildTool: MillBuildTool,
  isDev: boolean,
  workspaceRoot: string,
): ChildProcess | undefined {
  const script = buildTool.script || './mill'
  const args = isDev ? ['-w', `${projectID}.fastLinkJS`] : [`${projectID}.fullLinkJS`]

  try {
    console.debug(`🔍 Starting Mill build task ${script} ${args.join(' ')} in workspace root ${workspaceRoot}`)
    const childProcess = spawn(script, args, {
      stdio: 'inherit',
      shell: true,
      cwd: workspaceRoot,
    })

    childProcess.on('error', (error: Error) => {
      console.error(`❌ Build task ${script} ${args.join(' ')} failed:`, error)
    })

    childProcess.on('exit', (code: number | null) => {
      if (code !== 0) {
        console.warn(`⚠️ Build task ${script} ${args.join(' ')} exited with code ${code}`)
      }
    })

    return childProcess
  } catch (error) {
    console.error(`❌ Failed to start build task ${script} ${args.join(' ')}:`, error)
  }
}

export function getMillTargetDir(projectID: string, workspaceRoot: string, isDev: boolean): string {
  if (isDev) {
    return join(workspaceRoot, 'out', projectID.split('.').join('/'), 'fastLinkJS.dest')
  } else {
    return join(workspaceRoot, 'out', projectID.split('.').join('/'), 'fullLinkJS.dest')
  }
}

export function millBuildAndReturnOutputDir(
  projectID: string,
  buildTool: MillBuildTool,
  workspaceRoot: string,
  isDev: boolean,
): Promise<string> {
  const targetDir = getMillTargetDir(projectID, workspaceRoot, isDev)
  const buildProcess = startMillBuildTask(projectID, buildTool, isDev, workspaceRoot)
  return new Promise((resolve, reject) => {
    buildProcess?.on('error', (error: Error) => {
      reject(new Error(`Mill build task ${projectID} failed: ${error.message}`))
    })

    buildProcess?.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Mill build task ${projectID} failed with exit code ${code}`))
      } else {
        resolve(targetDir)
      }
    })
  })
}
