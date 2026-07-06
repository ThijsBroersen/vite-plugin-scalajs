import { describe, expect, it } from "vitest";
import { parseSbtPrintOutput } from "../src/sbt.js";

const sbt2ProductionOutput = `[info] server was not detected. starting an instance
[info] welcome to sbt 2.0.1 (Eclipse Adoptium Java 21.0.11)
[info] loading project definition from /home/runner/work/vite-plugin-scalajs/vite-plugin-scalajs/test/sbt-2-project/project
[info] set current project to testproject (in build file:/home/runner/work/vite-plugin-scalajs/vite-plugin-scalajs/test/sbt-2-project/)
[info] sbt server started at local:///home/runner/.config/sbt/2/server/f07cc1e41dc99c99840d/sock
[info] started sbt server
[info] compiling 1 Scala source to /home/runner/work/vite-plugin-scalajs/vite-plugin-scalajs/test/sbt-2-project/target/out/sjs1/scala-3.8.4/testproject/classes ...
[info] done compiling
[info] Full optimizing /home/runner/work/vite-plugin-scalajs/vite-plugin-scalajs/test/sbt-2-project/target/out/sjs1/scala-3.8.4/testproject/testproject-opt
/home/runner/work/vite-plugin-scalajs/vite-plugin-scalajs/test/sbt-2-project/target/out/sjs1/scala-3.8.4/testproject/testproject-opt
[success] elapsed time: 7 s
`;

describe("parseSbtPrintOutput", () => {
  it("parses sbt 2 CI production output", () => {
    expect(parseSbtPrintOutput(sbt2ProductionOutput)).toBe(
      "/home/runner/work/vite-plugin-scalajs/vite-plugin-scalajs/test/sbt-2-project/target/out/sjs1/scala-3.8.4/testproject/testproject-opt"
    );
  });

  it("parses paths when ANSI clear is prefixed on the print line", () => {
    const output = `\u001b[0J/home/runner/work/vite-plugin-scalajs/vite-plugin-scalajs/test/sbt-2-project/target/out/sjs1/scala-3.8.4/testproject/testproject-fastopt
[success] elapsed time: 0 s
`;
    expect(parseSbtPrintOutput(output)).toBe(
      "/home/runner/work/vite-plugin-scalajs/vite-plugin-scalajs/test/sbt-2-project/target/out/sjs1/scala-3.8.4/testproject/testproject-fastopt"
    );
  });

  it("parses [info] lines that only contain the optimizing message", () => {
    const output = `[info] Fast optimizing /tmp/testproject-fastopt
[success] elapsed time: 1 s
`;
    expect(parseSbtPrintOutput(output)).toBe("/tmp/testproject-fastopt");
  });
});
