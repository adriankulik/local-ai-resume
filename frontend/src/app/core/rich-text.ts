export type TextSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'code'; text: string }
  | { type: 'bold'; text: string; children?: TextSegment[] }
  | { type: 'italic'; text: string; children?: TextSegment[] };

const INLINE_MD_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*(.+?)\*\*|\*([^*]+)\*/;

function buildStyledSegment(type: 'bold' | 'italic', inner: string): TextSegment {
  const children = parseMarkdownLinks(inner);
  const hasNested = children.some((c) => c.type !== 'text');
  return hasNested ? { type, text: inner, children } : { type, text: inner };
}

/**
 * Splits a string containing inline Markdown (`[label](url)`, `` `code` ``, `**bold**`, `*italic*`)
 * into typed segments. Links are restricted to `http:`, `https:`, and `mailto:` protocols.
 */
export function parseMarkdownLinks(input: string): TextSegment[] {
  if (!input) return [];
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(INLINE_MD_PATTERN, 'g');

  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const [full, linkLabel, linkUrl, codeText, boldText, italicText] = match;

    if (linkLabel !== undefined && linkUrl !== undefined) {
      const safeUrl = sanitizeUrl(linkUrl);
      if (!safeUrl) continue;
      if (match.index > lastIndex) {
        segments.push({ type: 'text', text: input.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'link', label: linkLabel, url: safeUrl });
    } else if (codeText !== undefined) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', text: input.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'code', text: codeText });
    } else if (boldText !== undefined) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', text: input.slice(lastIndex, match.index) });
      }
      segments.push(buildStyledSegment('bold', boldText));
    } else if (italicText !== undefined) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', text: input.slice(lastIndex, match.index) });
      }
      segments.push(buildStyledSegment('italic', italicText));
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', text: input.slice(lastIndex) });
  }
  return segments;
}

function sanitizeUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}
