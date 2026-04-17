const STYLE_ATTR = 'data-rm-pages-style'

export function buildPaginationStylesheet(): string {
  return `
    .rm-pages-root {
      position: relative;
      box-sizing: border-box;
      background: #fff;
      overflow: visible;
    }
    .rm-pages-root .rm-page-break {
      position: relative;
    }
    .rm-pages-root :where(p, h1, h2, h3, h4, h5, h6, li, blockquote, pre):has([data-image-flow-mode="float"]) {
      display: flow-root;
    }
    .rm-pages-root :where(p, h1, h2, h3, h4, h5, h6, li, blockquote):has([data-image-flow-mode="float"]) {
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .rm-pages-root .ProseMirror-widget:has(> .rm-square-wrap-decoration) {
      display: contents;
    }
    .rm-pages-root .rm-page-spacer {
      position: relative;
      float: left;
      clear: both;
      width: 100%;
      height: 0;
    }
    .rm-pages-root .page {
      position: relative;
      float: left;
      clear: both;
      width: 0;
      height: 0;
      overflow: visible;
    }
    .rm-pages-root .page[data-layout-window-active="false"] {
      contain: layout style paint;
      content-visibility: auto;
      contain-intrinsic-size: var(--rm-page-width) var(--rm-page-body-intrinsic-height, 0px);
    }
    .rm-pages-root:has(.rm-page-image-overlay-layer[data-rm-image-layer="behind"] > *) .ProseMirror :where(p, ol, ul, li, h1, h2, h3, h4, h5, h6, blockquote, pre, table, .tableWrapper, td, th, .document-table-of-contents),
    .rm-pages-root.ProseMirror:has(.rm-page-image-overlay-layer[data-rm-image-layer="behind"] > *) :where(p, ol, ul, li, h1, h2, h3, h4, h5, h6, blockquote, pre, table, .tableWrapper, td, th, .document-table-of-contents) {
      position: relative;
      z-index: 1;
    }
    .rm-pages-root:has(.rm-page-image-overlay-layer[data-rm-image-layer="behind"] > *) .rm-page-header-region :where(p, ol, ul, li, h1, h2, h3, h4, h5, h6, blockquote, pre, table, .tableWrapper, td, th, .document-table-of-contents),
    .rm-pages-root:has(.rm-page-image-overlay-layer[data-rm-image-layer="behind"] > *) .rm-page-footer-region :where(p, ol, ul, li, h1, h2, h3, h4, h5, h6, blockquote, pre, table, .tableWrapper, td, th, .document-table-of-contents),
    .rm-pages-root:has(.rm-page-image-overlay-layer[data-rm-image-layer="behind"] > *) .rm-first-page-header :where(p, ol, ul, li, h1, h2, h3, h4, h5, h6, blockquote, pre, table, .tableWrapper, td, th, .document-table-of-contents),
    .rm-pages-root:has(.rm-page-image-overlay-layer[data-rm-image-layer="behind"] > *) .rm-page-overlay :where(p, ol, ul, li, h1, h2, h3, h4, h5, h6, blockquote, pre, table, .tableWrapper, td, th, .document-table-of-contents) {
      position: static;
      z-index: auto;
    }
    .rm-pages-root .rm-page-body-layer {
      position: absolute;
      left: calc(-1 * var(--rm-page-margin-left));
      width: calc(var(--rm-page-width) + var(--rm-page-margin-left) + var(--rm-page-margin-right));
      box-sizing: border-box;
      pointer-events: none;
      background: transparent;
      z-index: 1;
    }
    .rm-pages-root .rm-page-body-layer[data-layout-window-active="false"],
    .rm-pages-root .rm-page-image-overlay-layer[data-layout-window-active="false"] {
      contain: layout style paint;
      content-visibility: auto;
      contain-intrinsic-size:
        calc(var(--rm-page-width) + var(--rm-page-margin-left) + var(--rm-page-margin-right))
        var(--rm-page-body-intrinsic-height, 0px);
    }
    .rm-pages-root .rm-page-body-layer > * {
      pointer-events: auto;
    }
    .rm-pages-root .rm-page-image-overlay-layer {
      position: absolute;
      left: 0;
      width: var(--rm-page-width);
      box-sizing: border-box;
      pointer-events: none;
    }
    .rm-pages-root .rm-page-image-overlay-layer[data-rm-image-layer="behind"] {
      z-index: 0;
    }
    .rm-pages-root .rm-page-image-overlay-layer[data-rm-image-layer="floating"] {
      z-index: 3;
    }
    .rm-pages-root .rm-page-image-overlay-layer[data-rm-image-layer="front"] {
      z-index: 4;
    }
    .rm-pages-root .rm-page-image-overlay-layer > * {
      pointer-events: auto;
    }
    .rm-pages-root .rm-page-image-overlay-layer[data-rm-image-layer="behind"] > * {
      pointer-events: none;
    }
    .rm-pages-root .rm-page-image-overlay-layer[data-rm-image-layer="behind"] [data-image-handle="true"] {
      pointer-events: auto;
    }
    .rm-pages-root .breaker {
      position: relative;
      float: left;
      clear: both;
      width: calc(100% + var(--rm-page-margin-left) + var(--rm-page-margin-right));
      margin-left: calc(-1 * var(--rm-page-margin-left));
      margin-right: calc(-1 * var(--rm-page-margin-right));
      z-index: 2;
    }
    .rm-pages-root .rm-page-gap {
      position: relative;
      width: 100%;
      background: var(--rm-page-break-background);
      box-sizing: border-box;
    }
    .rm-pages-root .rm-page-break:last-child .rm-page-gap,
    .rm-pages-root .rm-page-break:last-child .rm-page-header-region {
      display: none;
    }
    .rm-pages-root .rm-page-header-region,
    .rm-pages-root .rm-page-footer-region,
    .rm-pages-root .rm-first-page-header {
      position: relative;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      background: inherit;
      color: #5f6368;
      user-select: none;
      -webkit-user-select: none;
    }
    .rm-pages-root .rm-first-page-header {
      width: calc(100% + var(--rm-page-margin-left) + var(--rm-page-margin-right));
      margin-left: calc(-1 * var(--rm-page-margin-left));
      margin-right: calc(-1 * var(--rm-page-margin-right));
      z-index: 3;
    }
    .rm-pages-root .rm-page-header,
    .rm-pages-root .rm-page-footer {
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      background: inherit;
      color: #202124;
      font: inherit;
      padding-left: var(--rm-page-margin-left);
      padding-right: var(--rm-page-margin-right);
      padding-bottom: 0;
    }
    .rm-pages-root .rm-page-header {
      justify-content: flex-start;
      padding-top: var(--rm-header-top-margin);
      padding-bottom: 0;
    }
    .rm-pages-root .rm-page-footer {
      justify-content: flex-end;
      padding-top: 0;
      padding-bottom: var(--rm-footer-bottom-margin);
    }
    .rm-pages-root .rm-page-header-content,
    .rm-pages-root .rm-page-footer-content {
      width: 100%;
      min-height: 0;
      outline: none;
      word-break: break-word;
      white-space: break-spaces;
      tab-size: 4;
      overflow: hidden;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .rm-pages-root .rm-page-header-content[data-rm-empty="true"],
    .rm-pages-root .rm-page-footer-content[data-rm-empty="true"] {
      min-height: 1.25em;
    }
    .rm-pages-root .rm-page-header-content .tableWrapper,
    .rm-pages-root .rm-page-footer-content .tableWrapper {
      overflow: visible;
      max-width: 100%;
      margin: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    .rm-pages-root .rm-page-header-content,
    .rm-pages-root .rm-page-footer-content {
      --default-cell-min-width: 25px;
    }
    .rm-pages-root .rm-page-header-content table,
    .rm-pages-root .rm-page-footer-content table {
      max-width: 100%;
      margin: 0;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .rm-pages-root .rm-page-header-content td,
    .rm-pages-root .rm-page-footer-content td,
    .rm-pages-root .rm-page-header-content th,
    .rm-pages-root .rm-page-footer-content th {
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
    .rm-pages-root .rm-page-header-content td:not([colwidth]):not(.column-resize-dragging),
    .rm-pages-root .rm-page-footer-content td:not([colwidth]):not(.column-resize-dragging),
    .rm-pages-root .rm-page-header-content th:not([colwidth]):not(.column-resize-dragging),
    .rm-pages-root .rm-page-footer-content th:not([colwidth]):not(.column-resize-dragging) {
      min-width: var(--default-cell-min-width);
    }
    .rm-pages-root .rm-page-header-content th,
    .rm-pages-root .rm-page-footer-content th {
      background: #f5f5f5;
      font-weight: bold;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="blue"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="blue"] {
      --editor-table-theme-solid: #2563eb;
      --editor-table-theme-soft: #dbeafe;
      --editor-table-theme-soft-alt: #eff6ff;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="teal"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="teal"] {
      --editor-table-theme-solid: #0f766e;
      --editor-table-theme-soft: #ccfbf1;
      --editor-table-theme-soft-alt: #f0fdfa;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="green"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="green"] {
      --editor-table-theme-solid: #15803d;
      --editor-table-theme-soft: #dcfce7;
      --editor-table-theme-soft-alt: #f0fdf4;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="orange"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="orange"] {
      --editor-table-theme-solid: #c2410c;
      --editor-table-theme-soft: #ffedd5;
      --editor-table-theme-soft-alt: #fff7ed;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="purple"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="purple"] {
      --editor-table-theme-solid: #7c3aed;
      --editor-table-theme-soft: #ede9fe;
      --editor-table-theme-soft-alt: #f5f3ff;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="gray"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="gray"] {
      --editor-table-theme-solid: #4b5563;
      --editor-table-theme-soft: #e5e7eb;
      --editor-table-theme-soft-alt: #f3f4f6;
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-header-row="true"] > tbody > tr:first-child > td,
    .rm-pages-root .rm-page-header-content table[data-table-style-header-row="true"] > tbody > tr:first-child > th,
    .rm-pages-root .rm-page-footer-content table[data-table-style-header-row="true"] > tbody > tr:first-child > td,
    .rm-pages-root .rm-page-footer-content table[data-table-style-header-row="true"] > tbody > tr:first-child > th {
      background: var(--editor-table-theme-solid, #2563eb);
      color: #fff;
      border-color: var(--editor-table-theme-solid, #2563eb);
      font-weight: 600;
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-first-column="true"] > tbody > tr > :first-child,
    .rm-pages-root .rm-page-footer-content table[data-table-style-first-column="true"] > tbody > tr > :first-child {
      background: var(--editor-table-theme-soft, #dbeafe);
      font-weight: 600;
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-last-column="true"] > tbody > tr > :last-child,
    .rm-pages-root .rm-page-footer-content table[data-table-style-last-column="true"] > tbody > tr > :last-child {
      background: var(--editor-table-theme-soft, #dbeafe);
      font-weight: 600;
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > td,
    .rm-pages-root .rm-page-header-content table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > th,
    .rm-pages-root .rm-page-footer-content table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > td,
    .rm-pages-root .rm-page-footer-content table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > th {
      background: var(--editor-table-theme-soft-alt, #eff6ff);
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-banded-columns="true"] > tbody > tr > :nth-child(even),
    .rm-pages-root .rm-page-footer-content table[data-table-style-banded-columns="true"] > tbody > tr > :nth-child(even) {
      background: var(--editor-table-theme-soft-alt, #eff6ff);
    }
    .rm-pages-root .rm-page-region-layout {
      position: relative;
      width: 100%;
      min-height: var(--rm-page-number-layout-min-height, 20px);
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-active="true"][data-rm-page-number-align="left"] .rm-page-header-content,
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-active="true"][data-rm-page-number-align="left"] .rm-page-footer-content {
      box-sizing: border-box;
      padding-left: 48px;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-active="true"][data-rm-page-number-align="right"] .rm-page-header-content,
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-active="true"][data-rm-page-number-align="right"] .rm-page-footer-content {
      box-sizing: border-box;
      padding-right: 48px;
    }
    .rm-pages-root .rm-page-number-slot {
      position: absolute;
      top: 0;
      min-width: 24px;
      color: inherit;
      font: inherit;
      line-height: inherit;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      white-space: nowrap;
    }
    .rm-pages-root .rm-page-header-region[data-rm-overlay-active="true"] .rm-page-number-slot,
    .rm-pages-root .rm-page-footer-region[data-rm-overlay-active="true"] .rm-page-number-slot,
    .rm-pages-root .rm-first-page-header[data-rm-overlay-active="true"] .rm-page-number-slot {
      z-index: 6;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-align="left"] .rm-page-number-slot {
      left: 0;
      text-align: left;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-align="right"] .rm-page-number-slot {
      right: 0;
      text-align: right;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-align="center"] .rm-page-number-slot {
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-below="true"] .rm-page-number-slot {
      top: var(--rm-page-number-center-top, 20px);
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-below="true"] .rm-page-header-content,
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-below="true"] .rm-page-footer-content {
      padding-left: 0;
      padding-right: 0;
    }
    .rm-pages-root .rm-page-header-region[data-rm-editable="true"],
    .rm-pages-root .rm-page-footer-region[data-rm-editable="true"],
    .rm-pages-root .rm-first-page-header[data-rm-editable="true"] {
      cursor: text;
    }
    .rm-pages-root .rm-page-header-region[data-rm-editable="true"]:hover,
    .rm-pages-root .rm-page-footer-region[data-rm-editable="true"]:hover,
    .rm-pages-root .rm-first-page-header[data-rm-editable="true"]:hover {
      background: transparent;
    }
    .rm-pages-root .rm-page-header-region[data-rm-has-visible-content="true"]::after,
    .rm-pages-root .rm-first-page-header[data-rm-has-visible-content="true"]::after {
      content: '';
      position: absolute;
      left: var(--rm-page-margin-left);
      right: var(--rm-page-margin-right);
      bottom: 0;
      border-bottom: 1px solid var(--rm-header-divider-accent, #6366f1);
      pointer-events: none;
    }
    .rm-pages-root .rm-page-footer-region[data-rm-has-visible-content="true"]::before {
      content: '';
      position: absolute;
      left: var(--rm-page-margin-left);
      right: var(--rm-page-margin-right);
      top: 0;
      border-top: 1px solid var(--rm-footer-divider-accent, #6366f1);
      pointer-events: none;
    }
    .rm-pages-root .rm-page-header-region[data-rm-overlay-active="true"] .rm-page-header-content:not(.rm-page-overlay-editor):not(.rm-page-inline-editor),
    .rm-pages-root .rm-page-footer-region[data-rm-overlay-active="true"] .rm-page-footer-content:not(.rm-page-overlay-editor):not(.rm-page-inline-editor),
    .rm-pages-root .rm-first-page-header[data-rm-overlay-active="true"] .rm-page-header-content:not(.rm-page-overlay-editor):not(.rm-page-inline-editor) {
      visibility: hidden;
      pointer-events: none;
      user-select: none;
    }
    .rm-pages-root .rm-page-header-region[contenteditable="true"],
    .rm-pages-root .rm-page-footer-region[contenteditable="true"],
    .rm-pages-root .rm-first-page-header[contenteditable="true"],
    .rm-pages-root .rm-page-header[contenteditable="true"],
    .rm-pages-root .rm-page-footer[contenteditable="true"],
    .rm-pages-root .rm-page-header-content[contenteditable="true"],
    .rm-pages-root .rm-page-footer-content[contenteditable="true"],
    .rm-pages-root .rm-page-header-region[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-footer-region[contenteditable="true"]:focus,
    .rm-pages-root .rm-first-page-header[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-header[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-footer[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-header-content[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-footer-content[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-header-region[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-footer-region[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-first-page-header[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-header[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-footer[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-header-content[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-footer-content[contenteditable="true"]:focus-visible {
      outline: none;
      box-shadow: none;
    }
    .rm-pages-root .rm-page-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      background: transparent;
      z-index: 5;
    }
    .rm-pages-root .rm-page-overlay[data-rm-overlay-type="header"] {
      border-bottom: 1px solid var(--rm-overlay-accent, #6366f1);
    }
    .rm-pages-root .rm-page-overlay[data-rm-overlay-type="footer"] {
      border-top: 1px solid var(--rm-overlay-accent, #6366f1);
    }
    .rm-pages-root .rm-page-overlay-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 0 8px;
      border-bottom: 1px solid rgba(95, 99, 104, 0.16);
    }
    .rm-pages-root .rm-page-overlay-label {
      font-size: 11px;
      line-height: 16px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #5f6368;
    }
    .rm-pages-root .rm-page-overlay-close {
      border: 0;
      background: transparent;
      color: var(--rm-overlay-accent, #1a73e8);
      font: inherit;
      font-size: 12px;
      line-height: 16px;
      font-weight: 500;
      padding: 4px 0;
      cursor: pointer;
    }
    .rm-pages-root .rm-page-overlay-close:hover {
      text-decoration: underline;
    }
    .rm-pages-root .rm-page-overlay-editor {
      flex: 1;
      min-height: 0;
      overflow: visible;
      box-sizing: border-box;
      border: 0;
      border-radius: 0;
      background: transparent;
      padding: 0;
      caret-color: var(--rm-overlay-accent, #6366f1);
      user-select: text;
    }
    .rm-pages-root .rm-page-overlay-editor.rm-page-header-content,
    .rm-pages-root .rm-page-overlay-editor.rm-page-footer-content {
      visibility: visible;
      pointer-events: auto;
      user-select: text;
      -webkit-user-select: text;
      overflow: visible;
    }
    .rm-pages-root .rm-page-overlay-editor .ProseMirror {
      min-height: 0;
      outline: none;
      user-select: text;
      white-space: break-spaces;
      tab-size: 4;
      --default-cell-min-width: 25px;
    }
    .rm-pages-root .rm-page-overlay-editor .ProseMirror.resize-cursor {
      cursor: ew-resize;
      cursor: col-resize;
    }
    .rm-pages-root .rm-page-overlay-editor table {
      width: 100%;
      max-width: 100%;
      margin: 0;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .rm-pages-root .rm-page-overlay-editor td[data-cell-border-color],
    .rm-pages-root .rm-page-overlay-editor th[data-cell-border-color] {
      border-style: dashed;
      border-width: 1px;
      padding: 2px 6px;
    }
    .rm-pages-root .rm-page-overlay-editor .ProseMirror td,
    .rm-pages-root .rm-page-overlay-editor .ProseMirror th {
      box-sizing: border-box;
      position: relative;
      min-width: 0;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .rm-pages-root .rm-page-overlay-editor .ProseMirror td:not([colwidth]):not(.column-resize-dragging),
    .rm-pages-root .rm-page-overlay-editor .ProseMirror th:not([colwidth]):not(.column-resize-dragging) {
      min-width: var(--default-cell-min-width);
    }
    .rm-pages-root .rm-page-overlay-editor .ProseMirror .column-resize-handle {
      position: absolute;
      right: -2px;
      top: 0;
      bottom: -2px;
      width: 4px;
      z-index: 20;
      background-color: #adf;
      pointer-events: none;
    }
    .rm-pages-root .rm-page-inline-editor {
      width: 100%;
      box-sizing: border-box;
      background: transparent;
      caret-color: var(--rm-overlay-accent, #6366f1);
      user-select: text;
      -webkit-user-select: text;
      pointer-events: auto;
      overflow: visible;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror {
      width: 100%;
      min-height: 0;
      box-sizing: border-box;
      outline: none;
      user-select: text;
      white-space: break-spaces;
      tab-size: 4;
      --default-cell-min-width: 25px;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror.resize-cursor {
      cursor: ew-resize;
      cursor: col-resize;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror p {
      min-height: 1em;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror .tableWrapper {
      overflow: visible;
      margin: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror table {
      max-width: 100%;
      margin: 0;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror td,
    .rm-pages-root .rm-page-inline-editor .ProseMirror th {
      box-sizing: border-box;
      position: relative;
      min-width: 0;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror td:not([colwidth]):not(.column-resize-dragging),
    .rm-pages-root .rm-page-inline-editor .ProseMirror th:not([colwidth]):not(.column-resize-dragging) {
      min-width: var(--default-cell-min-width);
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror .selectedCell:after {
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
    .rm-pages-root .rm-page-inline-editor .ProseMirror .column-resize-handle {
      position: absolute;
      right: -2px;
      top: 0;
      bottom: -2px;
      width: 4px;
      z-index: 20;
      background-color: #adf;
      pointer-events: none;
    }
    .rm-pages-root .rm-page-overlay[data-rm-overlay-type="header"] .rm-page-overlay-editor .ProseMirror {
    }
    .rm-pages-root .rm-page-overlay[data-rm-overlay-type="footer"] .rm-page-overlay-editor .ProseMirror {
    }
  `
}

export function ensurePagesStyles(targetDocument: Document): void {
  if (targetDocument.head.querySelector(`[${STYLE_ATTR}]`)) return

  const style = targetDocument.createElement('style')
  style.setAttribute(STYLE_ATTR, '')
  style.textContent = buildPaginationStylesheet()
  targetDocument.head.appendChild(style)
}
