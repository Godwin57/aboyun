import type { MetadataRoute } from "next";

// One manifest for every role; "/" sends each user to their own home.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aboyun",
    short_name: "Aboyun",
    description: "Spot danger early in pregnancy and after birth, and reach care.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#be185d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
