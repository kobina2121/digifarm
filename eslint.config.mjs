import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Module boundaries (docs/ROADMAP.md §2.3): routes and components never touch
  // the database directly, and modules are only reached through their index.
  {
    files: ["src/app/**", "src/components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Generated enums are plain constants and safe to import anywhere.
              group: [
                "@/generated/prisma/client",
                "@/generated/prisma/models*",
                "@/generated/prisma/internal*",
                "@prisma/client",
                "@/lib/db",
              ],
              message:
                "Use a module's public API (src/modules/<name>) instead of the database client.",
            },
            {
              // Client components may import a module's Zod schemas directly;
              // everything else goes through the module's index.
              group: ["@/modules/*/*", "!@/modules/*/schemas"],
              message:
                "Import modules through their index: @/modules/<name> (or /schemas from client code).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/components/*"],
              message:
                "Modules hold business logic and must not depend on UI code.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
