import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize CMS / rich-text derived HTML before injecting it via
 * `dangerouslySetInnerHTML`.
 *
 * Saleor product descriptions and CMS page content are stored as EditorJS JSON
 * and converted to raw HTML (via `editorjs-html`) on the server. That HTML is
 * attacker-influenced (anyone with content-edit rights), so it must be purified
 * to close the stored-XSS gap.
 *
 * `isomorphic-dompurify` works both on the server (SSR) and in the browser.
 */
export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html);
}
