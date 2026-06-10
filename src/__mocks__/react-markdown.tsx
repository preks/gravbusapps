// Jest mock for `react-markdown` (ESM-only, not transformed in this project).
//
// Tests don't need real markdown parsing; they only assert on the textual
// content rendered to the DOM. A pass-through component that emits the raw
// string keeps text-content assertions working without changes.

import React from 'react'

export interface ReactMarkdownMockProps {
  children?: React.ReactNode
}

const ReactMarkdown: React.FC<ReactMarkdownMockProps> = ({ children }) => (
  <div data-testid="react-markdown-mock">{children}</div>
)

export default ReactMarkdown
