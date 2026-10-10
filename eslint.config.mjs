import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // public/sw.js is Serwist's compiled/minified service worker output
    // (swDest in next.config.ts's withSerwistInit call), regenerated on
    // every build from src/app/sw.ts — not hand-written source. Lint the
    // source, never the bundled output.
    "public/sw.js",
  ]),
]);

export default eslintConfig;
