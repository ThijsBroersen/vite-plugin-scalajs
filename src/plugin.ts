import { watch } from 'fs'
import type { Plugin, ViteDevServer } from 'vite'
import { Match } from 'effect'
import type { ScalaJSPluginOptions, BuildTool, SbtBuildTool } from './types.js'
import { sbtBuildAndReturnOutputDir, sbtBuild, getSbtLinkTask } from './sbt.js'
import { startMillBuildTask, getMillTargetDir } from './mill.js'
import { createThrottledWatcherWithRetry } from './util.js'
import { resolveScalaJsModuleId, uriPrefixKey } from './resolve.js'
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
      isDev = resolvedConfig.mode === 'development'
    },

    // Run before plugins that resolve ids early (e.g. @crxjs/vite-plugin — upstream #11)
    buildStart: {
      order: 'pre',
      sequential: true,
      async handler() {
        if (isDev === undefined) throw new Error('configResolved must be called before buildStart')

        await Promise.all(
          projects.map(async (project) => {
            if (project.outputDir?.trim()) {
              console.info(
                `📂 Scala.js plugin: using configured outputDir for ${project.projectID} (skip link)`,
              )
              scalaJSOutputDirs.set(uriPrefixKey(project.uriPrefix, project.projectID), project.outputDir.trim())
              return
            }

            console.info(`🚀 Scala.js plugin: start build for ${project.projectID}`)
            const outputDir = await Match.value(project.buildTool).pipe(
              Match.when({ tool: 'sbt' }, async (buildTool) => {
                const sbtTool = buildTool as SbtBuildTool
                const outputDir = await sbtBuildAndReturnOutputDir(
                  project.projectID,
                  sbtTool,
                  isDev || false,
                  cwd,
                  {
                    onRetry: (message) => console.warn(message),
                  },
                )
                console.debug(`📂 Scala.js plugin: outputDir ${project.projectID} = `, outputDir)
                return outputDir
              }),
              Match.when({ tool: 'mill' }, async () => {
                const outputDir = getMillTargetDir(project.projectID, workspaceRoot, isDev || false)
                console.debug(`📂 Scala.js plugin: outputDir ${project.projectID} = `, outputDir)
                return outputDir
              }),
              Match.orElse(() => {
                throw new Error(`Unsupported build tool: ${(project.buildTool as BuildTool).tool}`)
              }),
            )

            scalaJSOutputDirs.set(uriPrefixKey(project.uriPrefix, project.projectID), outputDir)
          }),
        )
      },
    },

    resolveId(source) {
      if (scalaJSOutputDirs.size === 0) {
        throw new Error('buildStart must be called before resolveId')
      }

      for (const project of projects) {
        const outputDir = scalaJSOutputDirs.get(uriPrefixKey(project.uriPrefix, project.projectID))
        const resolved = resolveScalaJsModuleId(
          source,
          project.uriPrefix,
          project.projectID,
          outputDir,
          'buildStart must be called before resolveId',
        )
        if (resolved !== null) {
          return resolved
        }
      }

      return null
    },

    configureServer(server: ViteDevServer) {
      type BackgroundProcess = {
        ref: ChildProcess
        name: string
      }
      const backgroundProcesses: BackgroundProcess[] = []
      let watchers: ReturnType<typeof watch>[] = []

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
        const resolverOnly = Boolean(project.outputDir?.trim())

        Match.value(buildTool).pipe(
          Match.when({ tool: 'sbt' }, (buildTool) => {
            if (resolverOnly) {
              const outputDir = scalaJSOutputDirs.get(uriPrefixKey(project.uriPrefix, projectID))
              if (outputDir) {
                createThrottledWatcherWithRetry(outputDir, server, reloadThrottleMs, (watcher) => {
                  watchers.push(watcher)
                })
              }
              return
            }

            if (isDev) {
              console.info(`🔍 Scala.js plugin: start SBT task in watch mode: ~${getSbtLinkTask(projectID, isDev)}`)
              const compileTask = sbtBuild(projectID, buildTool, isDev, cwd)
              if (compileTask) backgroundProcesses.push({ ref: compileTask, name: `SBT ${projectID}` })

              const outputDir = scalaJSOutputDirs.get(uriPrefixKey(project.uriPrefix, projectID))
              if (outputDir) {
                createThrottledWatcherWithRetry(outputDir, server, reloadThrottleMs, (watcher) => {
                  watchers.push(watcher)
                })
              } else throw new Error(`Output directory not found for project ${projectID}`)
            }
          }),
          Match.when({ tool: 'mill' }, (buildTool) => {
            if (isDev && !resolverOnly) {
              console.info(`🔍 Scala.js plugin: start Mill task in watch mode: -w ${projectID}.fastLinkJS`)

              const compileTask = startMillBuildTask(projectID, buildTool, isDev, workspaceRoot)
              if (compileTask) backgroundProcesses.push({ ref: compileTask, name: `Mill ${projectID}` })

              const outputDir = getMillTargetDir(projectID, workspaceRoot, isDev)
              createThrottledWatcherWithRetry(outputDir, server, reloadThrottleMs, (watcher) => {
                watchers.push(watcher)
              })
            } else if (isDev && resolverOnly) {
              const outputDir = project.outputDir!.trim()
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

      server.httpServer?.on('close', cleanup)

      const handleExit = (signal: string) => {
        console.log(`\n🛑 Received ${signal}, cleaning up background processes...`)
        cleanup()
        process.exit(0)
      }

      process.on('SIGINT', () => handleExit('SIGINT'))
      process.on('SIGTERM', () => handleExit('SIGTERM'))
      process.on('SIGHUP', () => handleExit('SIGHUP'))
      process.on('exit', cleanup)
    },
  }
}
