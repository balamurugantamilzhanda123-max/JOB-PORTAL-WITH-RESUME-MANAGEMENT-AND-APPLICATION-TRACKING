'use client';

import React, { useEffect, useRef } from 'react';
import { Bold, Heading2, Heading3, List, ListOrdered, Pilcrow } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  ariaLabel?: string;
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'Write structured details here...',
  minHeightClass = 'min-h-[160px]',
  ariaLabel = 'Rich text editor',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-2.5 py-1.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('formatBlock', '<h2>')}
          className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          title="Heading 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
          <span>H2</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('formatBlock', '<h3>')}
          className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          title="Heading 3"
        >
          <Heading3 className="h-3.5 w-3.5" />
          <span>H3</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('formatBlock', '<p>')}
          className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          title="Paragraph"
        >
          <Pilcrow className="h-3.5 w-3.5" />
          <span>Text</span>
        </button>
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('bold')}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          title="Bold"
          aria-label="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('insertUnorderedList')}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('insertOrderedList')}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className={cn(
          'prose prose-sm max-w-none px-3.5 py-2.5 text-sm text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5',
          minHeightClass,
        )}
      />
    </div>
  );
}

const ALLOWED_SAFE_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
]);

function sanitizeClientHtml(html: string): string {
  if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const cleanNode = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_SAFE_TAGS.has(el.tagName)) {
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') {
            el.remove();
            continue;
          }
          // Unwrap disallowed tags while keeping safe text
          const text = doc.createTextNode(el.textContent || '');
          el.replaceWith(text);
          continue;
        }
        // Strip all attributes to eliminate event handlers/inline styles
        while (el.attributes.length > 0) {
          el.removeAttribute(el.attributes[0].name);
        }
        cleanNode(el);
      }
    }
  };
  cleanNode(doc.body);
  return doc.body.innerHTML;
}

export function SafeRichText({ html, className }: { html: string; className?: string }) {
  const safeHtml = React.useMemo(() => sanitizeClientHtml(html), [html]);
  return (
    <div
      className={cn(
        'space-y-2 text-sm leading-relaxed text-slate-700 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-900 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

