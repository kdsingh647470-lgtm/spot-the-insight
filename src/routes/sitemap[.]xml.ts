import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://spot-the-insight.lovable.app";
const entries = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/story", changefreq: "weekly", priority: "0.9" },
  { path: "/play/daily", changefreq: "daily", priority: "0.9" },
  { path: "/play/infinite", changefreq: "weekly", priority: "0.7" },
  { path: "/play/timed", changefreq: "weekly", priority: "0.7" },
  { path: "/play/relax", changefreq: "weekly", priority: "0.7" },
  { path: "/leaderboard", changefreq: "daily", priority: "0.8" },
  { path: "/auth", changefreq: "monthly", priority: "0.3" },
  { path: "/privacy", changefreq: "monthly", priority: "0.4" },
  { path: "/terms", changefreq: "monthly", priority: "0.4" },
  { path: "/contact", changefreq: "monthly", priority: "0.4" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) => `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
