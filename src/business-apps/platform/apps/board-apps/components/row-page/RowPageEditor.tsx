import React from 'react'
import { EditorContent, type Editor } from '@tiptap/react'
import { RowPageToolbar } from './RowPageToolbar'
import { RowPageSlashMenu } from './RowPageSlashMenu'

interface RowPageEditorProps {
  editor: Editor | null
  onInsertImage: () => void
  'data-testid'?: string
}

const EDITOR_STYLES = `
.row-page-editor .ProseMirror {
  outline: none;
  min-height: 16rem;
  font-size: 1rem;
  line-height: 1.75;
  color: var(--nw-foreground);
}

.row-page-editor .ProseMirror > * + * {
  margin-top: 0.75em;
}

/* Placeholder */
.row-page-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: color-mix(in oklch, var(--nw-muted-foreground) 40%, transparent);
  pointer-events: none;
  height: 0;
}

/* Headings */
.row-page-editor .ProseMirror h1 {
  font-size: 1.875rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 1.5rem 0 0.5rem;
  color: var(--nw-foreground);
}

.row-page-editor .ProseMirror h2 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 1.25rem 0 0.4rem;
  color: var(--nw-foreground);
}

.row-page-editor .ProseMirror h3 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 1rem 0 0.3rem;
  color: var(--nw-foreground);
}

/* Paragraphs */
.row-page-editor .ProseMirror p {
  margin: 0;
}

/* Lists */
.row-page-editor .ProseMirror ul {
  list-style: disc;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.row-page-editor .ProseMirror ol {
  list-style: decimal;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.row-page-editor .ProseMirror li {
  margin-bottom: 0.25rem;
}

.row-page-editor .ProseMirror li > p {
  margin: 0;
}

/* Task lists — the <ul> gets data-type="taskList" from renderHTML,
   but the <li> node view does NOT set data-type, only data-checked. */
.row-page-editor .ProseMirror ul[data-type="taskList"] {
  list-style: none !important;
  padding-left: 0 !important;
}

.row-page-editor .ProseMirror ul[data-type="taskList"] > li {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-start;
  gap: 0.5rem;
}

.row-page-editor .ProseMirror ul[data-type="taskList"] > li > label {
  flex-shrink: 0;
  margin-top: 0.25em;
  display: inline-flex;
  align-items: center;
  user-select: none;
}

.row-page-editor .ProseMirror ul[data-type="taskList"] > li > label input[type="checkbox"] {
  cursor: pointer;
  width: 1.1em;
  height: 1.1em;
  margin: 0;
  accent-color: var(--nw-primary);
}

.row-page-editor .ProseMirror ul[data-type="taskList"] > li > div {
  flex: 1 1 auto;
  min-width: 0;
}

.row-page-editor .ProseMirror ul[data-type="taskList"] > li > div > p {
  margin: 0;
}

.row-page-editor .ProseMirror ul[data-type="taskList"] > li[data-checked="true"] > div {
  text-decoration: line-through;
  color: var(--nw-muted-foreground);
}

/* Blockquote */
.row-page-editor .ProseMirror blockquote {
  border-left: 3px solid var(--nw-border);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--nw-muted-foreground);
  font-style: italic;
}

/* Code block */
.row-page-editor .ProseMirror pre {
  background: var(--nw-muted);
  border: 1px solid var(--nw-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0.75rem 0;
}

.row-page-editor .ProseMirror pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}

/* Inline code */
.row-page-editor .ProseMirror code {
  background: var(--nw-muted);
  padding: 0.15em 0.35em;
  border-radius: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 0.875em;
}

/* Links */
.row-page-editor .ProseMirror a {
  color: var(--nw-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

/* Horizontal rule */
.row-page-editor .ProseMirror hr {
  border: none;
  border-top: 1px solid var(--nw-border);
  margin: 1.5rem 0;
}

/* Highlight */
.row-page-editor .ProseMirror mark {
  background: color-mix(in oklch, var(--nw-chart-1) 25%, transparent);
  border-radius: 0.15em;
  padding: 0.05em 0.1em;
}

/* Images */
.row-page-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
}

/* Selection */
.row-page-editor .ProseMirror ::selection {
  background-color: color-mix(in oklch, var(--nw-primary) 25%, transparent) !important;
}

.row-page-editor .ProseMirror *::selection {
  background-color: color-mix(in oklch, var(--nw-primary) 25%, transparent) !important;
}
`

export function RowPageEditor({
  editor,
  onInsertImage,
  'data-testid': testId = 'row-page-editor'
}: RowPageEditorProps) {
  if (!editor) {
    return (
      <div className="gba:flex gba:justify-center gba:py-10" data-testid={`${testId}-loading`}>
        <div className="gba:h-5 gba:w-5 gba:animate-spin gba:rounded-full gba:border-2 gba:border-muted-foreground/20 gba:border-t-primary" />
      </div>
    )
  }

  return (
    <div className="gba:relative row-page-editor" data-testid={testId}>
      <style>{EDITOR_STYLES}</style>
      <RowPageToolbar editor={editor} />
      <EditorContent editor={editor} />
      <RowPageSlashMenu editor={editor} onInsertImage={onInsertImage} />
    </div>
  )
}
