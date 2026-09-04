'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';

/**
 * TipTap editor. Its HTML output is sanitized server-side before storage and
 * again at render time — editor output is never trusted.
 */
export default function RichTextEditor({
  value, onChange,
}: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] }),
      Image.configure({ inline: false }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose-article min-h-[420px] max-w-none rounded-b-[3px] bg-white px-4 py-4 focus:outline-none',
        'aria-label': 'Article body',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the editor in sync when a different article is loaded.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) {
    return <div className="skeleton h-[460px]" />;
  }

  const Btn = ({ onClick, active, label }: { onClick: () => void; active?: boolean; label: string }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[2px] px-2 py-1 font-mono text-[0.7rem] transition ${
        active ? 'bg-ink text-parchment' : 'text-slate hover:bg-parchment-deep hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-[3px] border border-parchment-edge">
      <div className="flex flex-wrap gap-1 border-b border-parchment-edge bg-parchment-deep px-2 py-1.5">
        <Btn label="B" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
        <Btn label="I" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <Btn label="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <Btn label="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <Btn label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <Btn label="List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <Btn label="1." active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <Btn
          label="Link"
          active={editor.isActive('link')}
          onClick={() => {
            const url = window.prompt('Link URL (must start with http:// or https://)');
            if (!url) return;
            if (!/^https?:\/\//i.test(url)) { window.alert('Only http and https links are allowed.'); return; }
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }}
        />
        <Btn label="Unlink" onClick={() => editor.chain().focus().unsetLink().run()} />
        <Btn
          label="Image"
          onClick={() => {
            const src = window.prompt('Image URL');
            if (!src || !/^https?:\/\//i.test(src)) return;
            const alt = window.prompt('Alt text (describe the image for screen readers)') ?? '';
            editor.chain().focus().setImage({ src, alt }).run();
          }}
        />
        <Btn label="Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
