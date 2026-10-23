# Vite Plugin for Scala.js

[![CI (main)](https://github.com/ThijsBroersen/vite-plugin-scalajs/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ThijsBroersen/vite-plugin-scalajs/actions/workflows/ci.yml?branch=main)
[![Publish snapshot (main)](https://github.com/ThijsBroersen/vite-plugin-scalajs/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/ThijsBroersen/vite-plugin-scalajs/actions/workflows/release.yml?branch=main)
[![Publish release (tag)](https://img.shields.io/github/actions/workflow/status/ThijsBroersen/vite-plugin-scalajs/release.yml?branch=main&event=push&label=publish%20release%20(tag))](https://github.com/ThijsBroersen/vite-plugin-scalajs/actions/workflows/release.yml?query=event%3Apush+is%3Asuccess)
[![npm latest](https://img.shields.io/npm/v/@thijsbroersen/vite-plugin-scalajs?label=npm%20latest)](https://www.npmjs.com/package/@thijsbroersen/vite-plugin-scalajs/v/latest)
[![npm snapshot](https://img.shields.io/npm/v/@thijsbroersen/vite-plugin-scalajs/snapshot?label=npm%20snapshot)](https://www.npmjs.com/package/@thijsbroersen/vite-plugin-scalajs/v/snapshot)

A Vite plugin that integrates Scala.js projects built with either SBT or Mill build tools. This plugin automatically watches your Scala.js output directories and triggers Vite reloads when files change, making development seamless.

## Features

- **Multi-build tool support**: Works with both SBT (1.x and 2.x) and Mill
- **Automatic file watching**: Watches Scala.js output directories and triggers Vite reloads
- **Development and production modes**: Supports both fast and full linking
- **Flexible configuration**: Multiple projects with different build tools
- **Throttled reloads**: Prevents excessive reloads during rapid file changes
- **Backward compatibility**: Maintains compatibility with existing SBT-only setups

## Installation

```bash
pnpm add -D @thijsbroersen/vite-plugin-scalajs
# or: npm install -D @thijsbroersen/vite-plugin-scalajs
```

Peer dependency: Vite 5, 6, 7, or 8 (install `vite` in your project).

## Quick Start

### SBT Project

```typescript
import { defineConfig } from 'vite';
import { scalajsPlugin } from '@thijsbroersen/vite-plugin-scalajs';

export default defineConfig({
  plugins: [
    scalajsPlugin({
      projects: [
        {
          projectID: 'myProject',
          buildTool: {
            tool: 'sbt'
          }
        }
      ]
    })
  ]
});
```

### Mill Project

```typescript
import { defineConfig } from 'vite';
import { scalajsPlugin } from '@thijsbroersen/vite-plugin-scalajs';

export default defineConfig({
  plugins: [
    scalajsPlugin({
      projects: [
        {
          projectID: 'example',
          buildTool: {
            tool: 'mill'
          }
        }
      ]
    })
  ]
});
```

### Mixed SBT and Mill Projects

```typescript
import { defineConfig } from 'vite';
import { scalajsPlugin } from '@thijsbroersen/vite-plugin-scalajs';

export default defineConfig({
  plugins: [
    scalajsPlugin({
      projects: [
        {
          projectID: 'backend',
          buildTool: {
            tool: 'sbt'
          }
        },
        {
          projectID: 'frontend',
          buildTool: {
            tool: 'mill'
          }
        }
      ]
    })
  ]
});
```

## Resolver-only mode (skip sbt / Mill linking)

When Scala.js was already linked by sbt (for example inside a larger sbt task), avoid booting another sbt session during `vite build`:

**Option A — dedicated resolver plugin:**

```typescript
import { defineConfig } from 'vite';
import { scalajsResolverPlugin } from '@thijsbroersen/vite-plugin-scalajs';

export default defineConfig({
  plugins: [
    scalajsResolverPlugin({
      outputDir: process.env.SCALAJS_OUTPUT_DIR!,
      uriPrefix: 'scalajs',
    }),
  ],
});
```

**Option B — `outputDir` on a project** (same plugin, multi-project friendly):

```typescript
scalajsPlugin({
  projects: [
    {
      projectID: 'client',
      buildTool: { tool: 'sbt' },
      outputDir: process.env.SCALAJS_OUTPUT_DIR,
    },
  ],
});
```

From sbt, run Vite with `SCALAJS_OUTPUT_DIR` set to `fastLinkJSOutput.value` / `fullLinkJSOutput.value`.

## Configuration Options

### Plugin Options

- `projects`: Array of Scala.js project configurations
- `projectRoot`: Root directory of the Scala project (auto-detected if not provided)
- `cwd`: Working directory for build tool commands (optional)
- `reloadThrottleMs`: Minimum time in milliseconds between file change reloads (default: 2000)

### Project Configuration

- `projectID`: Project identifier (used for URI prefix and build tool targeting)
- `buildTool`: Build tool configuration
  - `tool`: Either `'sbt'` or `'mill'`
  - `script`: Custom script name (optional, defaults to `'sbt'` or `'mill'`)
- `uriPrefix`: Custom URI prefix for imports (optional, defaults to `projectID:`)

## Usage in Code

Import Scala.js modules using the configured URI prefix:

```typescript
// Using projectID as prefix (default)
import 'myProject:main.js';

// Using custom prefix
import 'custom:main.js';
```

## Development vs Production

The plugin automatically detects the Vite mode:
- **Development**: Uses `fastLinkJS` (SBT) or `fastLinkJS` (Mill)
- **Production**: Uses `fullLinkJS` (SBT) or `fullLinkJS` (Mill)

## Examples

### Getting Started
- **[Getting Started Guide](examples/getting-started.md)**: Complete step-by-step setup for new projects

### Working Examples
- `test/mill-project/`: Mill-based Scala.js project with Vite configuration
- `test/sbt-project/`: SBT 1.x-based Scala.js project with multiple modules
- `test/sbt-2-project/`: SBT 2.x-based Scala.js project with multiple modules

### Complete Example: Mill Project

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { scalajsPlugin } from '@thijsbroersen/vite-plugin-scalajs';

export default defineConfig({
  plugins: [
    scalajsPlugin({
      projects: [
        {
          projectID: 'example',
          buildTool: {
            tool: 'mill',
            script: './mill-assembly.jar' // optional, defaults to './mill'
          },
          uriPrefix: 'millexample' // optional, defaults to projectID
        }
      ]
    })
  ]
});
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Scala.js + Vite</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

```javascript
// src/main.js
import 'mill.example:main.js';

// Your JavaScript code here
console.log('Hello from Vite + Scala.js!');
```

## API Reference

### Types

- `ScalaJSPluginOptions`: Main plugin configuration
- `ScalaJSProject`: Individual project configuration
- `BuildTool`: Union type for SBT or Mill build tools
- `SbtBuildTool`: SBT-specific configuration
- `MillBuildTool`: Mill-specific configuration

### Functions

- `scalajsPlugin(options)`: Main plugin function

## Troubleshooting

### Common Issues

1. **Build tool not found**: Ensure SBT or Mill is installed and available in your PATH or that the `script` config refers to the correct file
2. **Output directory not found**: The plugin waits for build tools to create output directories
3. **Excessive reloads**: Adjust `reloadThrottleMs` to reduce reload frequency
4. **Import resolution fails**: Check that your `uriPrefix` or `projectID` is correct and that the script exists the output directory

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=1 npm test
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for upstream parity, open issues, and planned work.

### Pre-release snapshots

Each push to `main` publishes to npm as dist-tag **`snapshot`** (see [RELEASE.md](RELEASE.md)):

```bash
pnpm add -D @thijsbroersen/vite-plugin-scalajs@snapshot
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

Apache 2.0
