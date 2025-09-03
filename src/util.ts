import { watch, existsSync, type FSWatcher } from 'fs'
import type { ViteDevServer } from 'vite'

/**
 * Creates a simple throttled file watcher that only reloads if the last reload
 * was more than 2 seconds ago. If it was within 2 seconds, it queues a reload
 * for after the current reload completes.
 */
export function createThrottledWatcher(
  path: string,
  server: ViteDevServer,
  reloadThrottleMs: number = 2000,
): FSWatcher {
  let lastReloadTime = 0
  let reloadAsap = false

  const triggerReload = () => {
    console.info('🔄 Scala.js files changed - triggering Vite reload')
    server.ws.send({
      type: 'full-reload',
      path: '*',
    })
    lastReloadTime = Date.now()
    reloadAsap = false
  }

  const handleFileChange = () => {
    const now = Date.now()
    const timeSinceLastReload = now - lastReloadTime

    if (timeSinceLastReload >= reloadThrottleMs) {
      // Enough time has passed, reload immediately
      triggerReload()
    } else {
      if (!reloadAsap) {
        // Too soon, queue a reload for later
        console.info(
          `🔄 Scala.js file changed - scheduling reload @ ${new Date(now + reloadThrottleMs).toISOString()} (last reload was ${timeSinceLastReload}ms ago at ${new Date(lastReloadTime).toISOString()})`,
        )

        reloadAsap = true
        // Schedule a reload after the throttle interval
        setTimeout(() => {
          if (reloadAsap) {
            triggerReload()
          }
        }, reloadThrottleMs - timeSinceLastReload)
      }
    }
  }

  return watch(path, { recursive: true }, (eventType, filename) => {
    if (filename) {
      console.info(`🔄 Scala.js file changed: ${filename}`)
      handleFileChange()
    }
  })
}

/**
 * Creates a throttled watcher that waits for the directory to exist before starting to watch.
 * This is useful for build tools that create their output directories during compilation.
 */
export function createThrottledWatcherWithRetry(
  path: string,
  server: ViteDevServer,
  reloadThrottleMs: number = 2000,
  addWatcher: (watcher: FSWatcher) => void,
): void {
  if (existsSync(path)) {
    console.info(`🎯 Scala.js output directory found, starting to watch ${path}`)
    const watcher = createThrottledWatcher(path, server)
    addWatcher(watcher)
  } else {
    console.info(`⏳ Waiting for Scala.js output directory ${path}`)
    // Check again in 2 seconds
    setTimeout(() => {
      createThrottledWatcherWithRetry(path, server, reloadThrottleMs, addWatcher)
    }, 2000)
  }
}
