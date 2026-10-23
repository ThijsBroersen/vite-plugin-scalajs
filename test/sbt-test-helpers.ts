import { beforeEach, describe, expect, it, TestOptions } from "vitest";
import scalajsPlugin, { ScalaJSPluginOptions } from "../src/index";
import type { PluginContext } from "rollup";
import type { Plugin as VitePlugin } from "vite";

export interface RefinedPlugin extends VitePlugin {
  configResolved: (
    this: void,
    resolvedConfig: { mode: string }
  ) => void | Promise<void>;
  buildStart:
    | ((this: PluginContext, options: {}) => Promise<void>)
    | { handler: (this: PluginContext, options: {}) => Promise<void> };
  resolveId: (this: PluginContext, source: string) => string | null;
}

export async function callBuildStart(
  plugin: RefinedPlugin,
  ctx: PluginContext
): Promise<void> {
  const buildStart = plugin.buildStart;
  if (typeof buildStart === "function") {
    await buildStart.call(ctx, {});
    return;
  }
  await buildStart.handler.call(ctx, {});
}

export interface SbtPluginTestConfig {
  cwd: string;
  suiteName: string;
  beforeEachDelayMs?: number;
}

const MODE_DEVELOPMENT = "development";
const MODE_PRODUCTION = "production";

const testOptions: TestOptions = {
  timeout: 60000,
};

export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/");
}

export function expectResolvedMainJs(
  resolvedPath: string | null | undefined,
  projectID: string,
  mode: typeof MODE_DEVELOPMENT | typeof MODE_PRODUCTION
): void {
  const suffix =
    mode === MODE_DEVELOPMENT
      ? `/${projectID}-fastopt/main.js`
      : `/${projectID}-opt/main.js`;
  expect(normalizeSlashes(resolvedPath!)).toMatch(
    new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
  );
}

export function registerSbtPluginTests(config: SbtPluginTestConfig): void {
  const { cwd, suiteName, beforeEachDelayMs = 2000 } = config;

  const setup: (
    options: ScalaJSPluginOptions
  ) => [RefinedPlugin, PluginContext] = (options) => {
    const plugin = scalajsPlugin({ cwd, ...options }) as RefinedPlugin;
    const fakePluginContext = {} as PluginContext;
    return [plugin, fakePluginContext];
  };

  describe(suiteName, () => {
    /* Wait between tests to let sbt close its server. */
    beforeEach(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, beforeEachDelayMs);
      });
    });

    it("works with Sbt build tool (production)", testOptions, async () => {
      const [plugin, fakePluginContext] = setup({
        projects: [
          {
            projectID: "testproject",
            buildTool: { tool: "sbt" },
          },
        ],
      });

      await plugin.configResolved.call(undefined, { mode: MODE_PRODUCTION });
      await callBuildStart(plugin, fakePluginContext);

      expectResolvedMainJs(
        plugin.resolveId.call(fakePluginContext, "testproject:main.js"),
        "testproject",
        MODE_PRODUCTION
      );

      expect(
        plugin.resolveId.call(fakePluginContext, "testproject/main.js")
      ).toBeNull();
    });

    it("works with Sbt build tool (development)", testOptions, async () => {
      const [plugin, fakePluginContext] = setup({
        projects: [
          {
            projectID: "testproject",
            buildTool: { tool: "sbt" },
          },
        ],
      });

      await plugin.configResolved.call(undefined, { mode: MODE_DEVELOPMENT });
      await callBuildStart(plugin, fakePluginContext);

      expectResolvedMainJs(
        plugin.resolveId.call(fakePluginContext, "testproject:main.js"),
        "testproject",
        MODE_DEVELOPMENT
      );

      expect(
        plugin.resolveId.call(fakePluginContext, "testproject/main.js")
      ).toBeNull();
    });

    it(
      "works with a project that aggregates other Scala.js projects (development)",
      testOptions,
      async () => {
        const [plugin, fakePluginContext] = setup({
          projects: [
            {
              projectID: "aggregatedProject",
              buildTool: { tool: "sbt" },
            },
          ],
        });

        await plugin.configResolved.call(undefined, { mode: MODE_DEVELOPMENT });
        await callBuildStart(plugin, fakePluginContext);

        expectResolvedMainJs(
          plugin.resolveId.call(fakePluginContext, "aggregatedProject:main.js"),
          "aggregatedproject",
          MODE_DEVELOPMENT
        );
      }
    );

    it(
      "works with a project that aggregates other Scala.js projects (production)",
      testOptions,
      async () => {
        const [plugin, fakePluginContext] = setup({
          projects: [
            {
              projectID: "aggregatedProject",
              buildTool: { tool: "sbt" },
            },
          ],
        });

        await plugin.configResolved.call(undefined, { mode: MODE_PRODUCTION });
        await callBuildStart(plugin, fakePluginContext);

        expectResolvedMainJs(
          plugin.resolveId.call(fakePluginContext, "aggregatedProject:main.js"),
          "aggregatedproject",
          MODE_PRODUCTION
        );
      }
    );

    it("works with a custom URI prefix (development)", testOptions, async () => {
      const [plugin, fakePluginContext] = setup({
        projects: [
          {
            projectID: "testproject",
            buildTool: { tool: "sbt" },
            uriPrefix: "customsjs",
          },
        ],
      });

      await plugin.configResolved.call(undefined, { mode: MODE_DEVELOPMENT });
      await callBuildStart(plugin, fakePluginContext);

      expectResolvedMainJs(
        plugin.resolveId.call(fakePluginContext, "customsjs:main.js"),
        "testproject",
        MODE_DEVELOPMENT
      );

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
              buildTool: { tool: "sbt" },
            },
          ],
        });

        await plugin.configResolved.call(undefined, { mode: MODE_PRODUCTION });

        const buildStartResult = callBuildStart(plugin, fakePluginContext);
        await expect(buildStartResult).rejects.toThrow(/sbt build failed|sbt invocation/);
      }
    );
  });
}
