import type { MetadataRoute } from "next";

// Private tool: keep every page (incl. public share links) out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
