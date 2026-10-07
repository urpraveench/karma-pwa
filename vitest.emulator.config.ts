import { defineConfig } from 'vitest/config';

// Tests that need the Firebase emulators running (npm run test:emulator starts them).
export default defineConfig({
  test: {
    include: ['tests-emulator/**/*.test.ts'],
    testTimeout: 20_000,
    fileParallelism: false,
  },
});
