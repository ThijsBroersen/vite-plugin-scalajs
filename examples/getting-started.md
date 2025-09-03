# Getting Started with Vite Plugin for Scala.js

This guide will help you set up a new project using the Vite Scala.js plugin with either SBT or Mill.

## Prerequisites

- **Java 17 or later** - Required for Scala.js compilation
- **Node.js 20+ and npm** - For Vite and JavaScript tooling
- **SBT or Mill** - Choose one build tool for your Scala.js project

## Quick Start

### Option 1: SBT Project

1. **Create a new SBT project**:
   ```bash
   mkdir my-scalajs-vite-project
   cd my-scalajs-vite-project
   ```

2. **Set up SBT build configuration** (`build.sbt`):
   ```scala
   enablePlugins(ScalaJSPlugin)
   
   scalaVersion := "3.7.2"
   scalaJSUseMainModuleInitializer := true
   
   libraryDependencies += "org.scala-js" %%% "scalajs-dom" % "2.8.0"
   ```

3. **Initialize npm project**:
   ```bash
   npm init -y
   npm install vite @scala-js/vite-plugin-scalajs
   ```

4. **Create Vite configuration** (`vite.config.ts`):
   ```typescript
   import { defineConfig } from 'vite';
   import { scalajsPlugin } from '@scala-js/vite-plugin-scalajs';

   export default defineConfig({
     plugins: [
       scalajsPlugin({
         projects: [
           {
             projectID: 'my-scalajs-vite-project',
             buildTool: { tool: 'sbt' }
           }
         ]
       })
     ]
   });
   ```

5. **Create HTML entry point** (`index.html`):
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>My Scala.js + Vite App</title>
   </head>
   <body>
     <div id="app"></div>
     <script type="module" src="/src/main.js"></script>
   </body>
   </html>
   ```

6. **Create JavaScript entry point** (`src/main.js`):
   ```javascript
   import 'my-scalajs-vite-project:main.js';
   console.log('Hello from Vite + Scala.js!');
   ```

7. **Create Scala.js application** (`src/main/scala/Main.scala`):
   ```scala
   import org.scalajs.dom.document
   import org.scalajs.dom.html

   @main def run(): Unit = {
     val app = document.getElementById("app")
     app.innerHTML = "<h1>Hello from Scala.js!</h1>"
   }
   ```

8. **Add npm scripts** (`package.json`):
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```

9. **Start development**:
   ```bash
   npm run dev
   ```

### Option 2: Mill Project

1. **Create a new Mill project**:
   ```bash
   mkdir my-scalajs-vite-project
   cd my-scalajs-vite-project
   ```

2. **Set up Mill build configuration** (`build.mill`):
   ```scala
   import mill.*
   import scalalib.*
   import scalajslib.*

   object example extends ScalaJSModule {
     def scalaVersion = "3.7.2"
     def scalaJSVersion = "1.19.0"
     
     def mvnDeps = Seq(
       mvn"org.scala-js::scalajs-dom::2.8.0"
     )
   }
   ```

3. **Initialize npm project**:
   ```bash
   npm init -y
   npm install vite @scala-js/vite-plugin-scalajs
   ```

4. **Create Vite configuration** (`vite.config.ts`):
   ```typescript
   import { defineConfig } from 'vite';
   import { scalajsPlugin } from '@scala-js/vite-plugin-scalajs';

   export default defineConfig({
     plugins: [
       scalajsPlugin({
         projects: [
           {
             projectID: 'example',
             buildTool: { tool: 'mill' }
           }
         ]
       })
     ]
   });
   ```

5. **Create HTML entry point** (`index.html`):
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>My Scala.js + Vite App</title>
   </head>
   <body>
     <div id="app"></div>
     <script type="module" src="/src/main.js"></script>
   </body>
   </html>
   ```

6. **Create JavaScript entry point** (`src/main.js`):
   ```javascript
   import 'example:main.js';
   console.log('Hello from Vite + Scala.js!');
   ```

7. **Create Scala.js application** (`src/example/Main.scala`):
   ```scala
   import org.scalajs.dom.document
   import org.scalajs.dom.html

   @main def run(): Unit = {
     val app = document.getElementById("app")
     app.innerHTML = "<h1>Hello from Scala.js!</h1>"
   }
   ```

8. **Add npm scripts** (`package.json`):
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```

9. **Start development**:
   ```bash
   npm run dev
   ```

## What Happens Next

1. **Vite starts** the development server (usually on `http://localhost:5173`)
2. **Plugin automatically starts** your build tool in watch mode
3. **Scala.js compiles** your code to JavaScript
4. **Plugin watches** the output directory for changes
5. **Browser reloads** automatically when you edit Scala code

## Development Workflow

1. **Edit Scala code** in your source files
2. **Build tool recompiles** automatically (SBT: `~fastLinkJS`, Mill: `-w example.fastLinkJS`)
3. **Plugin detects changes** in the output directory
4. **Vite triggers reload** in the browser
5. **See your changes** instantly!

## Production Build

```bash
# Build optimized Scala.js code
sbt fullLinkJS  # or: mill example.fullLinkJS

# Build the Vite project
npm run build
```

## Troubleshooting

### Build tool not found
- **SBT**: Install from [scala-sbt.org](https://www.scala-sbt.org/)
- **Mill**: Install from [com-lihaoyi.github.io/mill](https://com-lihaoyi.github.io/mill/)

### Output directory not found
The plugin waits for build tools to create output directories. This is normal on first run.

### Import resolution fails
Check that your `projectID` matches your build tool configuration:
- **SBT**: Should match your project name in `build.sbt`
- **Mill**: Should match your module name in `build.mill`

### Excessive reloads
Adjust the throttle setting in your Vite config:
```typescript
scalajsPlugin({
  projects: [...],
  reloadThrottleMs: 3000 // 3 seconds instead of default 2
})
```

## Next Steps

- Check out the [complete examples](../test/) for more complex setups
