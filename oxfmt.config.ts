import { defineConfig } from 'oxfmt';

export default defineConfig({
  ignorePatterns: ['storybook-static/**'],
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 80,
  tabWidth: 2,
});
