import type { Plugin } from 'vite'
import type { ScalaJSResolverPluginOptions } from './types.js'
import { resolveScalaJsModuleId } from './resolve.js'

/**
 * Resolver-only Vite plugin: maps `uriPrefix:…` imports to files under known linker output
 * directories without invoking sbt or Mill (upstream issue #35 / PR #34).
 */
export function scalajsResolverPlugin(options: ScalaJSResolverPluginOptions): Plugin {
  const projects = normalizeResolverProjects(options)

  return {
    name: '@thijsbroersen/vite-plugin-scalajs:resolver',

    resolveId(source) {
      for (const project of projects) {
        const resolved = resolveScalaJsModuleId(
          source,
          project.uriPrefix,
          project.projectID,
          project.outputDir,
          'scalajsResolverPlugin: each project must define outputDir',
        )
        if (resolved !== null) {
          return resolved
        }
      }
      return null
    },
  }
}

function normalizeResolverProjects(options: ScalaJSResolverPluginOptions) {
  if (options.projects?.length) {
    return options.projects.map((p) => ({
      projectID: p.projectID,
      uriPrefix: p.uriPrefix,
      outputDir: requireOutputDir(p.outputDir, p.projectID),
    }))
  }

  const outputDir = options.outputDir ?? process.env.SCALAJS_OUTPUT_DIR

  return [
    {
      projectID: options.projectID ?? 'scalajs',
      uriPrefix: options.uriPrefix,
      outputDir: requireOutputDir(outputDir, options.projectID ?? 'default'),
    },
  ]
}

function requireOutputDir(dir: string | undefined, label: string): string {
  if (!dir?.trim()) {
    throw new Error(
      `scalajsResolverPlugin: missing outputDir for project "${label}". ` +
        'Set outputDir, projects[], or SCALAJS_OUTPUT_DIR.',
    )
  }
  return dir.trim()
}
