import { beforeEach, describe, expect, it, TestOptions } from "vitest";
import scalajsPlugin, { ScalaJSPluginOptions } from "../src/index";
import type { PluginContext } from "rollup";
import type { Plugin as VitePlugin } from "vite";
import { getMillTargetDir } from "../src/mill.js";

/* This interface refines the VitePlugin with some knowledge about our
 * particular implementation, for easier testing. If we define here something
 * that is incompatible with what's in VitePlugin, the compiler complains, so
 * we do get some safety that we adhere to VitePlugin's API.
 */
interface RefinedPlugin extends VitePlugin {
  configResolved: (
    this: void,
    resolvedConfig: { mode: string }
  ) => void | Promise<void>;
  buildStart: (this: PluginContext, options: {}) => Promise<void>;
  resolveId: (this: PluginContext, source: string) => string;
}

function normalizeSlashes(path: string | null): string | null {
  return path === null ? null : path.replace(/\\/g, "/");
}

const MODE_DEVELOPMENT = "development";
const MODE_PRODUCTION = "production";

describe("scalajsPlugin with Mill", () => {
  const cwd = process.cwd() + "/test/mill-project";

  const testOptions: TestOptions = {
    timeout: 30000, // Mill tests should be faster than SBT
  };

  const setup: (options: ScalaJSPluginOptions) => [RefinedPlugin, PluginContext] = (options) => {
    const plugin = scalajsPlugin({ cwd: cwd, ...options }) as RefinedPlugin;
    const fakePluginContext = {} as PluginContext;
    return [plugin, fakePluginContext];
  };

  beforeEach(() => {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000); // Shorter wait for Mill
    });
  });

  it("works with Mill build tool (production)", testOptions, async () => {
    const [plugin, fakePluginContext] = setup({
      projects: [
        {
          projectID: "example",
          buildTool: {
            tool: "mill"
          },
        },
      ],
    });

    await plugin.configResolved.call(undefined, { mode: MODE_PRODUCTION });
    await plugin.buildStart.call(fakePluginContext, {});

    expect(
      normalizeSlashes(
        plugin.resolveId.call(fakePluginContext, "example:main.js")
      )
    ).toContain("/test/mill-project/out/example/fullLinkJS.dest/main.js");

    expect(
      plugin.resolveId.call(fakePluginContext, "example/main.js")
    ).toBeNull();
  });

  it("works with Mill build tool (development)", testOptions, async () => {
    const [plugin, fakePluginContext] = setup({
      projects: [
        {
          projectID: "example",
          buildTool: {
            tool: "mill"
          },
        },
      ],
    });

    await plugin.configResolved.call(undefined, { mode: MODE_DEVELOPMENT });
    await plugin.buildStart.call(fakePluginContext, {});

    expect(
      normalizeSlashes(
        plugin.resolveId.call(fakePluginContext, "example:main.js")
      )
    ).toContain("/test/mill-project/out/example/fastLinkJS.dest/main.js");

    expect(
      plugin.resolveId.call(fakePluginContext, "example/main.js")
    ).toBeNull();
  });

  it("works with custom URI prefix", testOptions, async () => {
    const [plugin, fakePluginContext] = setup({
      projects: [
        {
          projectID: "example",
          buildTool: {
            tool: "mill"
          },
          uriPrefix: "customsjs",
        },
      ],
    });

    await plugin.configResolved.call(undefined, { mode: MODE_DEVELOPMENT });
    await plugin.buildStart.call(fakePluginContext, {});

    expect(
      normalizeSlashes(
        plugin.resolveId.call(fakePluginContext, "customsjs:main.js")
      )
    ).toContain("/test/mill-project/out/example/fastLinkJS.dest/main.js");

    expect(
      plugin.resolveId.call(fakePluginContext, "scalajs/main.js")
    ).toBeNull();
  });
});
