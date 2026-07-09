import sanitizeHtml from "sanitize-html";

// Sanitizes user/AI-provided report HTML before it is stored (and later
// rendered via dangerouslySetInnerHTML — including on PUBLIC share pages, so
// this is a real XSS boundary, not a formality).
export function sanitizeReportHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "p", "br", "hr",
      "ul", "ol", "li", "blockquote",
      "strong", "em", "b", "i", "u", "s", "small", "sup", "sub", "span", "div", "a",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "figure", "figcaption",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      "*": ["style", "class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb/, /^[a-z]+$/],
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb/, /^[a-z]+$/],
        "text-align": [/^(left|right|center|justify)$/],
        "font-size": [/^\d+(\.\d+)?(px|em|rem|%)$/],
        "font-weight": [/^(bold|normal|[1-9]00)$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
