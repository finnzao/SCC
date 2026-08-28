import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Ambiente node, sem jsdom: os testes cobrem funcoes puras de validacao e
// formatacao. Montar DOM so seria necessario para testar componentes, e ai o
// custo (jsdom + testing-library) passa a valer a pena — hoje nao vale.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
