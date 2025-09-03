import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Enable globals for better VS Code integration
    globals: true,
    // Set up test environment
    environment: 'node',
    // Configure test file patterns
    include: ['test/**/*.{test,spec}.{js,ts}'],
    // Exclude patterns
    exclude: ['node_modules', 'dist', '**/*.d.ts'],
    // Timeout for tests (some tests need longer timeouts)
    testTimeout: 60000,
    // Setup files
    setupFiles: ['./vitest.setup.ts'],
    // Reporter configuration for better VS Code integration
    // reporter: ['verbose', 'json'],
    // Coverage configuration
    coverage: {
      enabled: false, // Disable by default, can be enabled with --coverage
      reporter: ['html', 'json'],
    },
  },
})
