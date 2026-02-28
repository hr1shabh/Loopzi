import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Loopzi — Build Consistency, Daily",
        short_name: "Loopzi",
        description:
            "A free habit tracker that makes daily check-ins fast and streak tracking motivating.",
        start_url: "/today",
        display: "standalone",
        background_color: "#FAF7F2",
        theme_color: "#FF6B6B",
        orientation: "portrait",
        categories: ["productivity", "lifestyle", "health"],
        icons: [
            {
                src: "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
        ],
    };
}
