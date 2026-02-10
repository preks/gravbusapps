import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface MarkdownRendererProps {
  content: string
}

// Normalize excessive newlines and fix spacing issues
const normalizeNewlines = (text: string): string => {
  return (
    text
      .replace(/([.!?])([A-Z])/g, '$1 $2') // Add space between sentence end and next sentence start
      .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
      .replace(/^\n+/, '') // Remove leading newlines
      .replace(/\n+$/, '') // Remove trailing newlines
      .replace(/\n\n+/g, '\n\n') // Ensure max 2 consecutive newlines
      // Remove extra newlines around list items (- or * or numbered)
      .replace(/\n\n+([-*]|\d+\.)\s/g, '\n$1 ') // Single newline before list items
      .replace(/([-*]|\d+\.)\s.*\n\n+(?=[-*]|\d+\.)/g, match => match.replace(/\n\n+/g, '\n'))
  ) // Single newline between list items
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content: rawContent }) => {
  // Normalize newlines before processing
  const content = normalizeNewlines(rawContent)
  const [copiedBlocks, setCopiedBlocks] = useState<Set<number>>(new Set())

  const copyToClipboard = (text: string, blockIndex: number) => {
    navigator.clipboard.writeText(text)
    setCopiedBlocks(prev => new Set(prev).add(blockIndex))
    setTimeout(() => {
      setCopiedBlocks(prev => {
        const newSet = new Set(prev)
        newSet.delete(blockIndex)
        return newSet
      })
    }, 2000)
  }

  // Split content by code blocks
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = []
  let currentPos = 0
  let blockIndex = 0

  // Match code blocks with ```language
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > currentPos) {
      parts.push({ type: 'text', content: content.slice(currentPos, match.index) })
    }

    // Add code block
    parts.push({
      type: 'code',
      content: match[2],
      language: match[1] || 'text'
    })

    currentPos = match.index + match[0].length
  }

  // Add remaining text
  if (currentPos < content.length) {
    parts.push({ type: 'text', content: content.slice(currentPos) })
  }

  // Render inline code and formatting in text parts
  const renderText = (text: string) => {
    // Handle inline code `code`
    const inlineCodeRegex = /`([^`]+)`/g
    const segments: React.ReactNode[] = []
    let lastIndex = 0

    text.replace(inlineCodeRegex, (match, code, offset) => {
      // Add text before code
      if (offset > lastIndex) {
        const beforeText = text.slice(lastIndex, offset)
        segments.push(<span key={`text-${lastIndex}`}>{renderFormatting(beforeText)}</span>)
      }

      // Add inline code
      segments.push(
        <code
          key={`code-${offset}`}
          className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:text-sm gba:font-mono gba:text-primary"
        >
          {code}
        </code>
      )

      lastIndex = offset + match.length
      return match
    })

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push(<span key={`text-${lastIndex}`}>{renderFormatting(text.slice(lastIndex))}</span>)
    }

    return segments.length > 0 ? segments : renderFormatting(text)
  }

  // Render bold, italic, lists
  const renderFormatting = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      const trimmedLine = line.trim()
      const nextLine = lines[i + 1]?.trim()
      const isEmptyLine = trimmedLine === ''
      const nextIsListItem = nextLine?.startsWith('- ') || nextLine?.startsWith('* ') || /^\d+\.\s/.test(nextLine || '')

      // Skip empty lines before list items (they add unwanted spacing)
      if (isEmptyLine && nextIsListItem) {
        return null
      }

      return (
        <React.Fragment key={i}>
          {line.startsWith('- ') || line.startsWith('* ') ? (
            <div className="gba:flex gba:gap-2 gba:ml-4">
              <span className="gba:text-primary">•</span>
              <span>{renderInlineFormatting(line.slice(2))}</span>
            </div>
          ) : line.match(/^\d+\.\s/) ? (
            <div className="gba:flex gba:gap-2 gba:ml-4">
              <span className="gba:text-primary gba:font-semibold">{line.match(/^(\d+)\./)?.[1]}.</span>
              <span>{renderInlineFormatting(line.replace(/^\d+\.\s/, ''))}</span>
            </div>
          ) : line.startsWith('# ') ? (
            <h1 className="gba:text-2xl gba:font-bold gba:mt-4 gba:mb-2">{line.slice(2)}</h1>
          ) : line.startsWith('## ') ? (
            <h2 className="gba:text-xl gba:font-bold gba:mt-3 gba:mb-2">{line.slice(3)}</h2>
          ) : line.startsWith('### ') ? (
            <h3 className="gba:text-lg gba:font-semibold gba:mt-2 gba:mb-1">{line.slice(4)}</h3>
          ) : (
            <>{renderInlineFormatting(line)}</>
          )}
          {/* Only add <br /> if not an empty line and not followed by empty line before list */}
          {i < lines.length - 1 && !isEmptyLine && <br />}
        </React.Fragment>
      )
    })
  }

  // Render **bold** and *italic*
  const renderInlineFormatting = (text: string) => {
    // Handle **bold**
    const result: React.ReactNode[] = []
    let lastIndex = 0
    const boldRegex = /\*\*([^\*]+)\*\*/g

    text.replace(boldRegex, (match, content, offset) => {
      if (offset > lastIndex) {
        result.push(text.slice(lastIndex, offset))
      }
      result.push(
        <strong key={`bold-${offset}`} className="gba:font-semibold">
          {content}
        </strong>
      )
      lastIndex = offset + match.length
      return match
    })

    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex))
    }

    return result.length > 0 ? result : text
  }

  return (
    <div className="gba:space-y-3">
      {parts.map((part, i) => {
        if (part.type === 'code') {
          const isCopied = copiedBlocks.has(blockIndex)
          const currentBlockIndex = blockIndex++

          return (
            <div key={i} className="gba:relative gba:group">
              <div className="gba:absolute gba:right-2 gba:top-2 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity">
                <button
                  onClick={() => copyToClipboard(part.content, currentBlockIndex)}
                  className="gba:p-1.5 gba:rounded gba:bg-muted/50 hover:gba:bg-muted gba:transition-colors"
                  title={getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.copy_code', 'Copy code')}
                >
                  {isCopied ? (
                    <Check className="gba:w-3.5 gba:h-3.5 gba:text-success" />
                  ) : (
                    <Copy className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="gba:rounded-lg gba:bg-muted/50 gba:border gba:border-border gba:overflow-hidden">
                {part.language && (
                  <div className="gba:px-3 gba:py-1 gba:text-xs gba:text-muted-foreground gba:bg-muted/30 gba:border-b gba:border-border gba:font-mono">
                    {part.language}
                  </div>
                )}
                <pre className="gba:p-4 gba:overflow-x-auto gba:text-sm">
                  <code className="gba:font-mono gba:text-foreground">{part.content}</code>
                </pre>
              </div>
            </div>
          )
        }

        return (
          <div key={i} className="gba:text-sm gba:leading-relaxed">
            {renderText(part.content)}
          </div>
        )
      })}
    </div>
  )
}
