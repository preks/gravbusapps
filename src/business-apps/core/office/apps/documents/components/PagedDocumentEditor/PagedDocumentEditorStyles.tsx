export interface PagedDocumentEditorStylesProps {
  pageColor: string
  proseMinHeight: number
}

export function PagedDocumentEditorStyles({ pageColor, proseMinHeight }: Readonly<PagedDocumentEditorStylesProps>) {
  return (
    <style>{`
      .document-editor-viewport {
        background-color: #f3f4f6;
      }
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-page-break,
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-page-header-region,
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-page-footer-region,
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-first-page-header {
        transition: opacity 120ms ease;
      }
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-page-break[data-layout-window-active="false"] .rm-page-gap,
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-page-header-region[data-layout-window-active="false"],
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-page-footer-region[data-layout-window-active="false"],
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-first-page-header[data-layout-window-active="false"] {
        opacity: 0.45;
      }
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-page-break[data-layout-window-active="true"] .rm-page-gap,
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-page-header-region[data-layout-window-active="true"],
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-page-footer-region[data-layout-window-active="true"],
      .document-editor-viewport[data-layout-window-mode="windowed"] .rm-first-page-header[data-layout-window-active="true"] {
        opacity: 1;
      }
      .document-editor-viewport .rm-page-header-region[data-layout-chrome-mounted="false"],
      .document-editor-viewport .rm-page-footer-region[data-layout-chrome-mounted="false"],
      .document-editor-viewport .rm-first-page-header[data-layout-chrome-mounted="false"] {
        pointer-events: none;
      }
      .paged-document-editor .ProseMirror {
        outline: none;
        background-color: ${pageColor};
        font-family: 'Times New Roman', Georgia, serif;
        font-size: 16px;
        line-height: 1.15;
        color: #1a1a1a;
        min-height: ${proseMinHeight}px;
        --default-cell-min-width: 25px;
      }

      .paged-document-editor .ProseMirror.resize-cursor {
        cursor: ew-resize;
        cursor: col-resize;
      }

      .paged-document-editor .ProseMirror .editor-link {
        color: var(--nw-primary);
        text-decoration: underline;
        cursor: pointer;
      }
      .paged-document-editor .ProseMirror .navigation-search-highlight {
        background: color-mix(in srgb, var(--nw-primary) 22%, transparent);
        border-radius: 2px;
      }
      .paged-document-editor .ProseMirror .navigation-search-highlight-current {
        background: color-mix(in srgb, var(--nw-primary) 45%, transparent);
        border-radius: 2px;
        outline: 2px solid var(--nw-primary);
        outline-offset: 1px;
      }

      .paged-document-editor .ProseMirror p {
        margin: 0;
      }

      .paged-document-editor .ProseMirror ol {
        list-style: decimal;
        list-style-position: outside;
        padding-inline-start: 24pt;
        margin: 0 0 12pt 0;
      }

      .paged-document-editor .ProseMirror ul {
        list-style: disc;
        list-style-position: outside;
        padding-inline-start: 24pt;
        margin: 0 0 12pt 0;
      }

      .paged-document-editor .ProseMirror ul[data-type="taskList"] {
        list-style: none;
        padding-inline-start: 24pt;
      }
      .paged-document-editor .ProseMirror li.editor-task-item,
      .paged-document-editor .ProseMirror li[data-type="taskItem"] {
        display: flex;
        align-items: flex-start;
        gap: 8pt;
      }
      .paged-document-editor .ProseMirror li.editor-task-item > label,
      .paged-document-editor .ProseMirror li[data-type="taskItem"] > label {
        flex-shrink: 0;
        cursor: pointer;
        margin: 0.2em 0 0 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .paged-document-editor .ProseMirror li.editor-task-item > label input[type="checkbox"],
      .paged-document-editor .ProseMirror li[data-type="taskItem"] > label input[type="checkbox"] {
        cursor: pointer;
        width: 1em;
        height: 1em;
        margin: 0;
      }
      .paged-document-editor .ProseMirror li.editor-task-item > div,
      .paged-document-editor .ProseMirror li[data-type="taskItem"] > div {
        flex: 1;
        min-width: 0;
      }
      .paged-document-editor .ProseMirror li.editor-task-item[data-checked="true"] > div,
      .paged-document-editor .ProseMirror li[data-type="taskItem"][data-checked="true"] > div {
        text-decoration: line-through;
        color: var(--nw-muted-foreground, #6b7280);
      }

      .paged-document-editor .ProseMirror li {
        margin: 0 0 6pt 0;
      }

      .paged-document-editor .ProseMirror li > p {
        display: inline;
        margin: 0;
      }

      .document-ai-selection-preview-content ul {
        list-style: disc;
        list-style-position: outside;
        padding-left: 1.25rem;
        margin: 0.25rem 0;
      }

      .document-ai-selection-preview-content ol {
        list-style: decimal;
        list-style-position: outside;
        padding-left: 1.25rem;
        margin: 0.25rem 0;
      }

      .document-ai-selection-preview-content li {
        margin: 0.15rem 0;
      }

      .document-ai-selection-preview-content li > p {
        display: inline;
        margin: 0;
      }

      .paged-document-editor .ProseMirror h1 {
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 16pt 0;
        line-height: 1.2;
      }

      .paged-document-editor .ProseMirror h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 20pt 0 12pt 0;
        line-height: 1.3;
      }

      .paged-document-editor .ProseMirror h3 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 16pt 0 10pt 0;
        line-height: 1.4;
      }

      .paged-document-editor .ProseMirror h4,
      .paged-document-editor .ProseMirror h5,
      .paged-document-editor .ProseMirror h6 {
        font-size: 1rem;
        font-weight: 600;
        margin: 14pt 0 8pt 0;
      }

      .paged-document-editor .ProseMirror ul,
      .paged-document-editor .ProseMirror ol {
        padding-left: 24pt;
        margin: 0 0 10pt 0;
      }

      .paged-document-editor .ProseMirror li {
        margin-bottom: 4pt;
      }

      .paged-document-editor .ProseMirror blockquote {
        border-left: 3pt solid #d0d0d0;
        padding-left: 16pt;
        margin: 16pt 0;
        color: #555;
        font-style: italic;
      }

      .paged-document-editor .ProseMirror pre {
        background: #f5f5f5;
        border: 1pt solid #e0e0e0;
        border-radius: 4pt;
        padding: 12pt;
        overflow-x: auto;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        margin: 12pt 0;
      }

      .paged-document-editor .ProseMirror code {
        background: #f0f0f0;
        padding: 2pt 4pt;
        border-radius: 2pt;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
      }

      .paged-document-editor .ProseMirror a {
        color: #0066cc;
        text-decoration: underline;
      }

      .paged-document-editor .ProseMirror img {
        max-width: 100%;
        height: auto;
        margin: 0;
        vertical-align: bottom;
        border-radius: 4pt;
      }
      .paged-document-editor .ProseMirror figure[data-node-type='custom-image'] {
        max-width: 100%;
      }
      .paged-document-editor .ProseMirror .editor-image-caption {
        margin-top: 4pt;
        color: #6b7280;
        font-size: 0.75rem;
        line-height: 1.3;
      }
      .paged-document-editor .ProseMirror .editor-image {
        margin: 0;
      }
      .paged-document-editor .ProseMirror .signature-float-anchor[data-floating='true'] {
        width: 0 !important;
        height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: visible !important;
      }

      .paged-document-editor .ProseMirror .tableWrapper {
        overflow: visible;
        margin: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
      }

      .paged-document-editor .ProseMirror table {
        border-collapse: collapse;
        max-width: 100%;
        table-layout: fixed;
        break-inside: auto;
        page-break-inside: auto;
      }

      .paged-document-editor .ProseMirror td,
      .paged-document-editor .ProseMirror th {
        box-sizing: border-box;
        position: relative;
        border: 1pt solid #333;
        padding: 4pt 6pt;
        text-align: start;
        vertical-align: top;
        font-size: 0.875rem;
        line-height: 1.3;
        min-width: 0;
        overflow-wrap: break-word;
        word-break: break-word;
      }

      .paged-document-editor .ProseMirror td:not([colwidth]):not(.column-resize-dragging),
      .paged-document-editor .ProseMirror th:not([colwidth]):not(.column-resize-dragging) {
        min-width: var(--default-cell-min-width);
      }

      .paged-document-editor .ProseMirror th {
        background: #f5f5f5;
        font-weight: bold;
      }

      .paged-document-editor .ProseMirror table[data-table-theme="blue"] {
        --editor-table-theme-solid: #2563eb;
        --editor-table-theme-soft: #dbeafe;
        --editor-table-theme-soft-alt: #eff6ff;
      }

      .paged-document-editor .ProseMirror table[data-table-theme="teal"] {
        --editor-table-theme-solid: #0f766e;
        --editor-table-theme-soft: #ccfbf1;
        --editor-table-theme-soft-alt: #f0fdfa;
      }

      .paged-document-editor .ProseMirror table[data-table-theme="green"] {
        --editor-table-theme-solid: #15803d;
        --editor-table-theme-soft: #dcfce7;
        --editor-table-theme-soft-alt: #f0fdf4;
      }

      .paged-document-editor .ProseMirror table[data-table-theme="orange"] {
        --editor-table-theme-solid: #c2410c;
        --editor-table-theme-soft: #ffedd5;
        --editor-table-theme-soft-alt: #fff7ed;
      }

      .paged-document-editor .ProseMirror table[data-table-theme="purple"] {
        --editor-table-theme-solid: #7c3aed;
        --editor-table-theme-soft: #ede9fe;
        --editor-table-theme-soft-alt: #f5f3ff;
      }

      .paged-document-editor .ProseMirror table[data-table-theme="gray"] {
        --editor-table-theme-solid: #4b5563;
        --editor-table-theme-soft: #e5e7eb;
        --editor-table-theme-soft-alt: #f3f4f6;
      }

      .paged-document-editor .ProseMirror table[data-table-style-header-row="true"] > tbody > tr:first-child > td,
      .paged-document-editor .ProseMirror table[data-table-style-header-row="true"] > tbody > tr:first-child > th {
        background: var(--editor-table-theme-solid, #2563eb);
        color: #fff;
        border-color: var(--editor-table-theme-solid, #2563eb);
        font-weight: 600;
      }

      .paged-document-editor .ProseMirror table[data-table-style-first-column="true"] > tbody > tr > :first-child {
        background: var(--editor-table-theme-soft, #dbeafe);
        font-weight: 600;
      }

      .paged-document-editor .ProseMirror table[data-table-style-last-column="true"] > tbody > tr > :last-child {
        background: var(--editor-table-theme-soft, #dbeafe);
        font-weight: 600;
      }

      .paged-document-editor .ProseMirror table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > td,
      .paged-document-editor .ProseMirror table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > th {
        background: var(--editor-table-theme-soft-alt, #eff6ff);
      }

      .paged-document-editor .ProseMirror table[data-table-style-banded-columns="true"] > tbody > tr > :nth-child(even) {
        background: var(--editor-table-theme-soft-alt, #eff6ff);
      }

      .paged-document-editor .ProseMirror thead {
        display: table-header-group;
      }

      .paged-document-editor .ProseMirror tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .paged-document-editor .ProseMirror hr {
        border: none;
        border-top: 1pt solid #d0d0d0;
        margin: 20pt 0;
      }

      .paged-document-editor .ProseMirror .page-break {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 40pt 0;
        padding: 20pt 0;
        user-select: none;
        cursor: default;
      }

      .paged-document-editor .ProseMirror .page-break .page-break-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 0;
        border-top: 2px dashed #ccc;
      }

      .paged-document-editor .ProseMirror .page-break .page-break-label {
        position: relative;
        background: white;
        padding: 4pt 12pt;
        font-size: 0.75rem;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 1pt;
        border: 1pt solid #ddd;
        border-radius: 4pt;
      }

      .paged-document-editor .ProseMirror p.is-editor-empty:first-child {
        min-height: 1em;
        cursor: text;
      }

      .paged-document-editor .ProseMirror p.is-editor-empty:first-child::before {
        content: '';
        pointer-events: none;
        height: 0;
      }

      .paged-document-editor .ProseMirror ::selection {
        background: #b4d5fe;
      }

      .paged-document-editor .ProseMirror .ai-selection-highlight {
        background: rgba(139, 180, 254, 0.35);
        border-bottom: 2px solid rgba(99, 140, 230, 0.6);
        border-radius: 2px;
        transition: background 0.2s ease;
      }

      .paged-document-editor .ProseMirror .current-selection-highlight {
        background: rgba(147, 197, 253, 0.22);
        border-bottom: 1px solid rgba(59, 130, 246, 0.35);
        border-radius: 2px;
      }

      .paged-document-editor .ProseMirror .document-autocomplete-ghost-text {
        color: #9ca3af;
        opacity: 0.9;
        user-select: none;
        pointer-events: none;
        white-space: pre-wrap;
      }

      .paged-document-editor .ProseMirror .selectedCell:after {
        z-index: 2;
        position: absolute;
        content: "";
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        background: rgba(200, 200, 255, 0.4);
        pointer-events: none;
      }

      .paged-document-editor .ProseMirror .column-resize-handle {
        position: absolute;
        right: -2px;
        top: 0;
        bottom: -2px;
        width: 4px;
        z-index: 20;
        background-color: #adf;
        pointer-events: none;
      }

      @media print {
        .paged-document-editor .ProseMirror .page-break {
          page-break-after: always;
          break-after: page;
          border: none;
          margin: 0;
          padding: 0;
          height: 0;
        }

        .paged-document-editor .ProseMirror .page-break .page-break-line,
        .paged-document-editor .ProseMirror .page-break .page-break-label {
          display: none;
        }
      }
    `}</style>
  )
}
