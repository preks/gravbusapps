import React from 'react'

interface ContentHtmlRendererProps {
  content: string
  variant?: 'default' | 'large' | 'small'
  className?: string
  'data-testid'?: string
}

/**
 * Shared component for rendering HTML content in content records
 * Provides consistent styling for all HTML elements (headings, lists, paragraphs, etc.)
 * Uses descendant selectors to handle nested HTML structures
 */
export const ContentHtmlRenderer: React.FC<ContentHtmlRendererProps> = ({
  content,
  variant = 'default',
  className = '',
  'data-testid': testId
}) => {
  if (!content) return null

  // Variant-specific base text styles
  const variantClasses = {
    default: 'gba:text-base gba:leading-7',
    large: 'gba:text-lg gba:leading-8',
    small: 'gba:text-sm gba:leading-6'
  }

  // Comprehensive HTML element styling using descendant selectors (works with nested HTML)
  // Removed prose classes - using explicit Tailwind utilities instead
  // Note: gba: prefix must be at the very beginning, before variant modifiers
  const htmlElementStyles = `
    gba:text-foreground
    gba:[&_h1]:text-3xl gba:[&_h1]:font-bold gba:[&_h1]:mt-8 gba:[&_h1]:mb-4 gba:[&_h1]:text-foreground
    gba:[&_h2]:text-2xl gba:[&_h2]:font-semibold gba:[&_h2]:mt-6 gba:[&_h2]:mb-3 gba:[&_h2]:text-foreground
    gba:[&_h3]:text-xl gba:[&_h3]:font-semibold gba:[&_h3]:mt-5 gba:[&_h3]:mb-2 gba:[&_h3]:text-foreground
    gba:[&_h4]:text-lg gba:[&_h4]:font-semibold gba:[&_h4]:mt-4 gba:[&_h4]:mb-2 gba:[&_h4]:text-foreground
    gba:[&_h5]:text-base gba:[&_h5]:font-semibold gba:[&_h5]:mt-3 gba:[&_h5]:mb-2 gba:[&_h5]:text-foreground
    gba:[&_h6]:text-sm gba:[&_h6]:font-semibold gba:[&_h6]:mt-2 gba:[&_h6]:mb-1 gba:[&_h6]:text-foreground
    gba:[&_p]:mb-4 gba:[&_p]:text-foreground gba:[&_p]:leading-relaxed
    gba:[&_ul]:list-disc gba:[&_ul]:ml-6 gba:[&_ul]:mb-4 gba:[&_ul]:text-foreground gba:[&_ul]:space-y-1
    gba:[&_ol]:list-decimal gba:[&_ol]:ml-6 gba:[&_ol]:mb-4 gba:[&_ol]:text-foreground gba:[&_ol]:space-y-1
    gba:[&_li]:mb-1 gba:[&_li]:text-foreground gba:[&_li]:leading-relaxed
    gba:[&_code]:bg-muted gba:[&_code]:px-2 gba:[&_code]:py-1 gba:[&_code]:rounded gba:[&_code]:text-sm gba:[&_code]:font-mono gba:[&_code]:text-foreground
    gba:[&_pre]:bg-muted gba:[&_pre]:p-4 gba:[&_pre]:rounded-lg gba:[&_pre]:mb-4 gba:[&_pre]:overflow-x-auto gba:[&_pre]:text-foreground
    gba:[&_pre_code]:bg-transparent gba:[&_pre_code]:p-0
    gba:[&_blockquote]:border-l-4 gba:[&_blockquote]:border-primary gba:[&_blockquote]:pl-4 gba:[&_blockquote]:pr-4 gba:[&_blockquote]:py-2 gba:[&_blockquote]:italic gba:[&_blockquote]:my-4 gba:[&_blockquote]:text-muted-foreground gba:[&_blockquote]:bg-muted/30
    gba:[&_a]:text-primary gba:[&_a]:underline gba:[&_a]:hover:text-primary/80 gba:[&_a]:transition-colors
    gba:[&_strong]:font-bold gba:[&_strong]:text-foreground
    gba:[&_em]:italic
    gba:[&_hr]:my-8 gba:[&_hr]:border-t gba:[&_hr]:border-border
    gba:[&_img]:max-w-full gba:[&_img]:h-auto gba:[&_img]:rounded-lg gba:[&_img]:my-4
    gba:[&_table]:w-full gba:[&_table]:mb-4 gba:[&_table]:border-collapse
    gba:[&_th]:border gba:[&_th]:border-border gba:[&_th]:px-4 gba:[&_th]:py-2 gba:[&_th]:bg-muted gba:[&_th]:font-semibold gba:[&_th]:text-left
    gba:[&_td]:border gba:[&_td]:border-border gba:[&_td]:px-4 gba:[&_td]:py-2
  `
    .trim()
    .replace(/\s+/g, ' ')

  const combinedClasses = `${variantClasses[variant]} ${htmlElementStyles} ${className}`.trim()

  return <div className={combinedClasses} dangerouslySetInnerHTML={{ __html: content }} data-testid={testId} />
}
