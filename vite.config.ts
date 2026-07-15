import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Babylon in its own long-cached chunk; app code iterates without
          // re-downloading the 3D engine.
          babylon: ['@babylonjs/core', '@babylonjs/loaders'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
