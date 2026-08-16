import type { MetadataRoute } from "next";

// Private tool: keep every page (incl. public share links) out of search
// engines — except the legal pages. A privacy policy that crawlers are told to
// ignore reads as something to hide, and platform reviewers check that the URL
// they were given is genuinely public.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/confidentialite", "/mentions-legales"],
      disallow: "/",
    },
  };
}
