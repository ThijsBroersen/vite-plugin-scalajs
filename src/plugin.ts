import { watch } from 'fs'
import type { Plugin, ViteDevServer, PluginOption } from 'vite'
import { Match } from 'effect'
import type { ScalaJSPluginOptions, BuildTool } from './types.js'
import { sbtBuildAndReturnOutputDir, sbtBuild, getSbtLinkTask } from './sbt.js'
import { startMillBuildTask, getMillTargetDir } from './mill.js'
import { createThrottledWatcherWithRetry } from './util.js'
import { ChildProcess } from 'child_process'

/**
 * Vite plugin for automatically watching and building Scala.js projects as input to Vite.
 * Supports both SBT and Mill build tools
 * @param options - Plugin configuration options
 * @returns Vite plugin object
 */
export default function scalajsPlugin(options: ScalaJSPluginOptions = { projects: [] }): Plugin {
  const { projects, projectRoot, cwd, reloadThrottleMs } = options

  // Auto-detect workspace root if not provided
  const workspaceRoot = projectRoot || cwd || process.env.INIT_CWD || process.cwd()

  let isDev: boolean | undefined = undefined
  const scalaJSOutputDirs = new Map<string, string>()

  return {
    name: '@thijsbroersen/vite-plugin-scalajs',

    // Vite-specific
    configResolved(resolvedConfig) {
      // Store mode for later use
      isDev = resolvedConfig.mode === 'development'
    },

    // standard Rollup
    async buildStart(options) {
      if (isDev === undefined) throw new Error('configResolved must be called before buildStart')

      await Promise.all(
        projects.map(async (project) => {
          console.info(`🚀 Scala.js plugin: start build for ${project.projectID}`)
          const outputDir = await Match.value(project.buildTool).pipe(
            Match.when({ tool: 'sbt' }, async (buildTool) => {
              const outputDir = await sbtBuildAndReturnOutputDir(project.projectID, buildTool, isDev || false, cwd)
              console.debug(`📂 Scala.js plugin: outputDir ${project.projectID} = `, outputDir)
              return outputDir
            }),
            Match.when({ tool: 'mill' }, async (buildTool) => {
              // const outputDir = await millBuildAndReturnOutputDir(
              //   buildTool,
              //   workspaceRoot,
              //   isDev || false
              // );
              const outputDir = getMillTargetDir(project.projectID, workspaceRoot, isDev || false)
              console.debug(`📂 Scala.js plugin: outputDir ${project.projectID} = `, outputDir)
              return outputDir
            }),
            Match.orElse(() => {
              throw new Error(`Unsupported build tool: ${(project.buildTool as BuildTool).tool}`)
            }),
          )

          const key = project.uriPrefix ? `${project.uriPrefix}:` : `${project.projectID}:`
          scalaJSOutputDirs.set(key, outputDir)
        }),
      )
    },

    // standard Rollup
    resolveId(source, importer, options) {
      if (scalaJSOutputDirs.size === 0) {
        throw new Error('buildStart must be called before resolveId')
      }

      // Find the project that matches this source
      for (const [uriPrefix, outputDir] of scalaJSOutputDirs.entries()) {
        if (source.startsWith(uriPrefix)) {
          const path = source.substring(uriPrefix.length)
          return `${outputDir}/${path}`
        }
      }

      return null
    },

    configureServer(server: ViteDevServer) {
      // Start background tasks and watch for changes
      type BackgroundProcess = {
        ref: ChildProcess
        name: string
      }
      const backgroundProcesses: BackgroundProcess[] = []
      let watchers: ReturnType<typeof watch>[] = []

      // Cleanup function to stop all processes
      const cleanup = () => {
        if (watchers.length > 0) {
          watchers.forEach((watcher) => watcher.close())
          watchers = []
        }

        backgroundProcesses.forEach(({ ref, name }) => {
          if (!ref.killed) {
            console.log(`🛑 Stopping background processes for ${name}`)
            ref.kill()
          }
        })
        backgroundProcesses.length = 0
      }

      projects.forEach((project) => {
        const { buildTool, projectID } = project

        Match.value(buildTool).pipe(
          Match.when({ tool: 'sbt' }, (buildTool) => {
            // SBT projects are handled in buildStart, no additional setup needed here
            if (isDev) {
              console.info(`🔍 Scala.js plugin: start SBT task in watch mode: ~${getSbtLinkTask(projectID, isDev)}`)
              const compileTask = sbtBuild(projectID, buildTool, isDev, cwd)
              if (compileTask) backgroundProcesses.push({ ref: compileTask, name: `SBT ${projectID}` })

              // Add throttled file watcher for SBT output
              const key = project.uriPrefix ? `${project.uriPrefix}:` : `${projectID}:`
              const outputDir = scalaJSOutputDirs.get(key)
              if (outputDir) {
                createThrottledWatcherWithRetry(outputDir, server, reloadThrottleMs, (watcher) => {
                  watchers.push(watcher)
                })
              } else throw new Error(`Output directory not found for project ${projectID}`)
            }
          }),
          Match.when({ tool: 'mill' }, (buildTool) => {
            if (isDev) {
              console.info(`🔍 Scala.js plugin: start Mill task in watch mode: -w ${projectID}.fastLinkJS`)

              const compileTask = startMillBuildTask(projectID, buildTool, isDev, workspaceRoot)
              if (compileTask) backgroundProcesses.push({ ref: compileTask, name: `Mill ${projectID}` })

              // Add throttled file watcher for Mill output
              const outputDir = getMillTargetDir(projectID, workspaceRoot, isDev)
              createThrottledWatcherWithRetry(outputDir, server, reloadThrottleMs, (watcher) => {
                watchers.push(watcher)
              })
            }
          }),
          Match.orElse(() => {
            throw new Error(`Unsupported build tool: ${(buildTool as BuildTool).tool}`)
          }),
        )
      })

      // Clean up watcher and background processes when server closes
      server.httpServer?.on('close', cleanup)

      // Handle process exit signals for more robust cleanup
      const handleExit = (signal: string) => {
        console.log(`\n🛑 Received ${signal}, cleaning up background processes...`)
        cleanup()
        process.exit(0)
      }

      // Register cleanup handlers for various exit scenarios
      process.on('SIGINT', () => handleExit('SIGINT')) // Ctrl+C
      process.on('SIGTERM', () => handleExit('SIGTERM')) // Termination signal
      process.on('SIGHUP', () => handleExit('SIGHUP')) // Hangup signal
      process.on('exit', cleanup) // Final cleanup on process exit
    },
  }
}
