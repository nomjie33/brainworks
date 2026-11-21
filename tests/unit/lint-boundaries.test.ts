import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

async function lint(code: string, filePath: string) {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.severity === 2);
}

describe("layer boundaries (ESLint)", () => {
  it("fails when an API route imports Prisma", async () => {
    const errors = await lint(
      'import { PrismaClient } from "@prisma/client";\nexport const db = PrismaClient;\n',
      "src/app/api/example/route.ts",
    );
    expect(errors.some((e) => e.ruleId === "no-restricted-imports")).toBe(true);
  });

  it("fails when an API route imports a repository", async () => {
    const errors = await lint(
      'import { pingDatabase } from "@/server/repositories/health.repository";\nexport const x = pingDatabase;\n',
      "src/app/api/example/route.ts",
    );
    expect(errors.some((e) => e.ruleId === "no-restricted-imports")).toBe(true);
  });

  it("allows an API route to import a service", async () => {
    const errors = await lint(
      'import { getHealth } from "@/server/services/health.service";\nexport const x = getHealth;\n',
      "src/app/api/example/route.ts",
    );
    expect(errors).toEqual([]);
  });

  it("fails when the domain layer imports from server/", async () => {
    const errors = await lint(
      'import { getEnv } from "@/server/services/health.service";\nexport const x = getEnv;\n',
      "src/domain/example.ts",
    );
    expect(errors.some((e) => e.ruleId === "no-restricted-imports")).toBe(true);
  });

  it("fails when the domain layer reads the system clock", async () => {
    const errors = await lint("export const now = new Date();\n", "src/domain/example.ts");
    expect(errors.some((e) => e.ruleId === "no-restricted-syntax")).toBe(true);
  });
});
