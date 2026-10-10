import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

// next-intl 4.14.9's build plugin: locates src/i18n/request.ts by default
// (no path argument needed, see
// node_modules/next-intl/dist/esm/*/plugin/getNextConfig.js's
// resolveI18nPath, which checks ./src/i18n/request.ts) and wires up the
// webpack/turbopack alias for 'next-intl/config'.
const withNextIntl = createNextIntlPlugin();

// @serwist/next 9.5.13: generates public/sw.js from src/app/sw.ts by
// injecting the precache manifest. This only runs inside the `webpack()`
// config hook (see node_modules/@serwist/next/dist/index.mjs), which
// Turbopack never calls — see package.json's build/dev scripts, which pass
// `--webpack` so the service worker is actually produced.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

// Composition order matters: withSerwist must wrap the result of
// withNextIntl (not the other way around), since withSerwistInit calls the
// incoming config's own `webpack()` function first and then appends its
// own plugins — this lets next-intl's webpack/turbopack setup run, then
// Serwist's precache injection runs on top of it.
export default withSerwist(withNextIntl(nextConfig));
