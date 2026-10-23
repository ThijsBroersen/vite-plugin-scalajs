import { describe, expect, it } from 'vitest'
import type { PluginContext } from 'rollup'
import { scalajsResolverPlugin } from '../src/resolver.js'
import scalajsPlugin from '../src/plugin.js'
import { callBuildStart, type RefinedPlugin } from './sbt-test-helpers.js'
import { buildSbtOutputFileCommand } from '../src/sbt.js'

describe('scalajsResolverPlugin', () => {
  it('resolves module ids under a fixed output directory', () => {
    const plugin = scalajsResolverPlugin({
      projectID: 'client',
      uriPrefix: 'scalajs',
      outputDir: '/tmp/scalajs-out',
    })
    const ctx = {} as PluginContext

    expect(plugin.resolveId!.call(ctx, 'scalajs:main.js', undefined)).toBe('/tmp/scalajs-out/main.js')
    expect(plugin.resolveId!.call(ctx, 'other:main.js', undefined)).toBeNull()
  })
})

describe('scalajsPlugin outputDir', () => {
  it('skips sbt when outputDir is configured', async () => {
    const plugin = scalajsPlugin({
      projects: [
        {
          projectID: 'testproject',
          buildTool: { tool: 'sbt' },
          outputDir: '/tmp/prelinked',
        },
      ],
    }) as RefinedPlugin

    await plugin.configResolved.call(undefined, { mode: 'production' })
    await callBuildStart(plugin, {} as PluginContext)

    const ctx = {} as PluginContext
    expect(plugin.resolveId!.call(ctx, 'testproject:main.js', undefined)).toBe('/tmp/prelinked/main.js')
  })
})

describe('buildSbtOutputFileCommand', () => {
  it('disables aggregation before reading linker output', () => {
    const cmd = buildSbtOutputFileCommand('aggregatedProject/Compile/fastLinkJSOutput', '/tmp/out.txt')
    expect(cmd).toContain('aggregate := false')
    expect(cmd).toContain('aggregatedProject/Compile/fastLinkJSOutput')
  })
})
