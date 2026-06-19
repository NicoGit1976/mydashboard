// Free-content widget: renders user-authored HTML. Styled via `.prose-block`.
// NOTE (Phase 1): sanitize with DOMPurify before render once this is user input.
export default function ContentBlock({ html }: { html: string }) {
  return (
    <div className="prose-block" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
