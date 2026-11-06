import { defineConfig } from 'oxlint';

export default defineConfig({
  ignorePatterns: ['storybook-static/**'],
  plugins: ['typescript', 'unicorn', 'oxc', 'react'],
  categories: {
    correctness: 'error',
  },
  rules: {},
  env: {
    builtin: true,
  },
});
