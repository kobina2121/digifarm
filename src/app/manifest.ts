import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DigiFarm",
    short_name: "DigiFarm",
    description:
      "Fresh produce for your home or business, from verified Ghanaian farms.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Android builds its launch screen from this colour, the icon and the name.
    background_color: "#17663a",
    theme_color: "#17663a",
    lang: "en-GH",
    categories: ["business", "food", "shopping"],
    icons: [
      {
        src: "/icons/192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
