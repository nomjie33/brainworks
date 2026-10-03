import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Layer boundaries from 01-architecture-and-stack.md section 1.
const databasePackages = ["@prisma/client", "@prisma/*", "pg", "pg/*"];

const apiRouteRestrictions = {
  paths: databasePackages.map((name) => ({
    name,
    message:
      "API routes must not touch the database directly. Call a service in src/server/services.",
  })),
  patterns: [
    {
      group: ["@/server/repositories/*", "**/server/repositories/*", "@/lib/db", "**/lib/db"],
      message: "API routes must call a service, not a repository or the database client.",
    },
  ],
};

const domainRestrictions = {
  paths: [...databasePackages, "next", "react", "react-dom", "@sentry/nextjs", "resend"].map(
    (name) => ({
      name,
      message: "The domain layer is pure TypeScript with no I/O or framework imports.",
    }),
  ),
  patterns: [
    {
      group: [
        "next/*",
        "react/*",
        "@/server/*",
        "**/server/*",
        "@/app/*",
        "**/app/*",
        "@/components/*",
        "@/lib/db",
        "@/lib/env",
      ],
      message: "The domain layer must not import from server/, app/, components/ or I/O modules.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["src/app/api/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", apiRouteRestrictions] },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", domainRestrictions],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Domain code must receive 'now' as a parameter instead of calling new Date().",
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "Domain code must receive 'now' as a parameter instead of calling Date.now().",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
