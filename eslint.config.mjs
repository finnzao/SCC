import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prefixo "_" marca argumento propositalmente ignorado — convenção que a
      // regra não honra por padrão. Sem isto, `next build` FALHAVA: os no-op
      // setAccessToken(_token)/setRefreshToken(_token), mantidos de propósito
      // para não quebrar chamadores depois que os tokens viraram cookies
      // httpOnly, eram reportados como erro e derrubavam o build de produção.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
