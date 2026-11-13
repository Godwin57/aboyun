import { createSerwistRoute } from "@serwist/turbopack";

// Serves the service worker built from app/sw.ts at /serwist/sw.js.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    useNativeEsbuild: false,
  });
