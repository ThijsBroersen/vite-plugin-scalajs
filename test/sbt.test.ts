import { beforeEach, describe, expect, it, TestOptions } from "vitest";
import scalajsPlugin, { ScalaJSPluginOptions } from "../src/index";
import type { PluginContext } from "rollup";
import type { Plugin as VitePlugin } from "vite";

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

function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/");
}

const MODE_DEVELOPMENT = "development";
const MODE_PRODUCTION = "production";

describe("scalaJSPlugin", () => {
  const cwd = process.cwd() + "/test/sbt-project";

  const testOptions: TestOptions = {
    timeout: 60000, // running sbt takes time
  };

  const setup: (
    options: ScalaJSPluginOptions
  ) => [RefinedPlugin, PluginContext] = (options) => {
    const plugin = scalajsPlugin({ cwd: cwd, ...options }) as RefinedPlugin;
    const fakePluginContext = {} as PluginContext;
    return [plugin, fakePluginContext];
  };

  /* Wait for 2 seconds between tests to let sbt close its server.
   * Without this, we get spurious failures with
   * > sbt thinks that server is already booting because of this exception:
   * > sbt.internal.ServerAlreadyBootingException: java.io.IOException:
   *   Could not create lock for \\.\pipe\sbt-load3101661995253037154_lock, error 5
   */
  beforeEach(() => {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  });

  it(
    "works with Sbt build tool (production)",
    testOptions,
    async () => {
      const [plugin, fakePluginContext] = setup({
        projects: [
          {
            projectID: "testproject",
            buildTool: {
              tool: "sbt",
            },
          },
        ],
      });

      await plugin.configResolved.call(undefined, { mode: MODE_PRODUCTION });
      await plugin.buildStart.call(fakePluginContext, {});

      expect(
        normalizeSlashes(
          plugin.resolveId.call(fakePluginContext, "testproject:main.js")
        )
      ).toContain("/sbt-project/target/scala-3.7.2/testproject-opt/main.js");

      expect(
        plugin.resolveId.call(fakePluginContext, "testproject/main.js")
      ).toBeNull();
    }
  );

  it(
    "works with Sbt build tool (development)",
    testOptions,
    async () => {
      const [plugin, fakePluginContext] = setup({
        projects: [
          {
            projectID: "testproject",
            buildTool: {
              tool: "sbt",
            },
          },
        ],
      });

      await plugin.configResolved.call(undefined, { mode: MODE_DEVELOPMENT });
      await plugin.buildStart.call(fakePluginContext, {});

      expect(
        normalizeSlashes(
          plugin.resolveId.call(fakePluginContext, "testproject:main.js")
        )
      ).toContain(
        "/sbt-project/target/scala-3.7.2/testproject-fastopt/main.js"
      );

      expect(
        plugin.resolveId.call(fakePluginContext, "testproject/main.js")
      ).toBeNull();
    }
  );

  it("works with a custom URI prefix (development)", testOptions, async () => {
    const [plugin, fakePluginContext] = setup({
      projects: [
        {
          projectID: "testproject",
          buildTool: {
            tool: "sbt",
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
    ).toContain("/sbt-project/target/scala-3.7.2/testproject-fastopt/main.js");

    expect(
      plugin.resolveId.call(fakePluginContext, "scalajs:main.js")
    ).toBeNull();
  });

  it(
    "does not work with a project that does not link",
    testOptions,
    async () => {
      const [plugin, fakePluginContext] = setup({
        projects: [
          {
            projectID: "invalidProject",
            buildTool: {
              tool: "sbt",
            },
          },
        ],
      });

      await plugin.configResolved.call(undefined, { mode: MODE_PRODUCTION });

      const buildStartResult = plugin.buildStart.call(fakePluginContext, {});
      await expect(buildStartResult).rejects.toThrowError("sbt build failed");
    }
  );
});
