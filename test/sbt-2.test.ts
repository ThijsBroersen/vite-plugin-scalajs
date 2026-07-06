import { registerSbtPluginTests } from "./sbt-test-helpers";

registerSbtPluginTests({
  cwd: process.cwd() + "/test/sbt-2-project",
  suiteName: "scalaJSPlugin (sbt 2.x)",
});
