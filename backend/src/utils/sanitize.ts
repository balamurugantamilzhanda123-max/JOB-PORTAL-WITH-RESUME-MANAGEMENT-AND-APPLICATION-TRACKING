import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'blockquote',
];

export function sanitizeRichText(input?: string | null): string {
  if (!input) return '';
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();
}

export function stripHtmlToPlainText(input?: string | null): string {
  if (!input) return '';
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, ' ')
    .trim();
}

