import sanitizeHtml from "sanitize-html";

/**
 * Email bodies are hostile HTML — scripts, event handlers, and forms must
 * never reach the DOM. Sanitization happens server-side so the client only
 * ever receives clean markup. Styling attributes commonly used by real
 * emails (tables, inline styles) are kept so messages stay readable.
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "center", "font"],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["style", "align", "valign", "bgcolor", "border", "cellpadding", "cellspacing", "width", "height"],
      img: ["src", "alt", "width", "height", "style"],
      a: ["href", "name", "target", "rel"],
      font: ["color", "face", "size"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["https", "data"] },
    allowedStyles: {
      "*": {
        color: [/^[^;{}]+$/],
        "background-color": [/^[^;{}]+$/],
        "background": [/^(?!.*url).*$/i],
        "font-size": [/^[^;{}]+$/],
        "font-weight": [/^[^;{}]+$/],
        "font-family": [/^[^;{}]+$/],
        "font-style": [/^[^;{}]+$/],
        "text-align": [/^[^;{}]+$/],
        "text-decoration": [/^[^;{}]+$/],
        "line-height": [/^[^;{}]+$/],
        padding: [/^[^;{}]+$/],
        "padding-top": [/^[^;{}]+$/],
        "padding-bottom": [/^[^;{}]+$/],
        "padding-left": [/^[^;{}]+$/],
        "padding-right": [/^[^;{}]+$/],
        margin: [/^[^;{}]+$/],
        "margin-top": [/^[^;{}]+$/],
        "margin-bottom": [/^[^;{}]+$/],
        border: [/^[^;{}]+$/],
        "border-radius": [/^[^;{}]+$/],
        width: [/^[^;{}]+$/],
        "max-width": [/^[^;{}]+$/],
        height: [/^[^;{}]+$/],
        display: [/^[^;{}]+$/],
      },
    },
    transformTags: {
      // External links open in a new tab and can't tamper with our window.
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}
