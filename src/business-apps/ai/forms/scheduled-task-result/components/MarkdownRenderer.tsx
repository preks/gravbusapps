import React from 'react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown'

interface MarkdownRendererProps {
  content: string
  accessToken?: string
}

/**
 * A markdown renderer component that supports:
 * - GitHub Flavored Markdown (tables, strikethrough, etc.)
 * - Entity links (lead://, contact://, account://, etc.)
 * - Beautiful table styling using design system components
 *
 * Now uses unified MarkdownWithChipsRenderer for consistent rendering
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, accessToken = '' }) => {
  return (
    <MarkdownWithChipsRenderer
      content={content}
      accessToken={accessToken}
      variant="default"
      renderHttpLinksAsChips={false}
    />
  )
}

export default MarkdownRenderer
