import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getSafeHref } from '../../../utils/helpers'

interface MarkdownRendererProps {
  content: string
}

// Normalize excessive newlines and fix spacing issues (ReDoS-safe: bounded quantifiers, no backtracking)
const normalizeNewlines = (text: string): string => {
  let s = text
    .replaceAll(/([.!?])([A-Z])/g, '$1 $2') // Add space between sentence end and next sentence start
    .replaceAll(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
    .replace(/^\n+/, '') // Remove leading newlines
  while (s.length > 0 && s[s.length - 1] === '\n') {
    s = s.slice(0, -1)
  }
  return s
    .replaceAll(/\n{2,100}/g, '\n\n') // Ensure max 2 consecutive newlines (bounded)
    .replaceAll(/\n{2,100}([-*]|\d+\.)\s/g, '\n$1 ') // Single newline before list items (bounded)
    .replaceAll(/([-*]|\d+\.)\s[^\n]*\n{2,100}(?=[-*]|\d+\.)/g, match => match.replaceAll(/\n{2,100}/g, '\n'))
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
    const inlineCodeRegex = /`([^`]+)`/g
    const segments: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let segIdx = 0

    while ((match = inlineCodeRegex.exec(text)) !== null) {
      const [fullMatch, code] = match
      const offset = match.index
      if (offset > lastIndex) {
        const beforeText = text.slice(lastIndex, offset)
        segments.push(<span key={`text-${segIdx}-${lastIndex}`}>{renderFormatting(beforeText)}</span>)
        segIdx += 1
      }
      segments.push(
        <code
          key={`code-${segIdx}-${offset}`}
          className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:text-sm gba:font-mono gba:text-primary"
        >
          {code}
        </code>
      )
      segIdx += 1
      lastIndex = offset + fullMatch.length
    }

    if (lastIndex < text.length) {
      segments.push(<span key={`text-${segIdx}-${lastIndex}`}>{renderFormatting(text.slice(lastIndex))}</span>)
    }

    return segments.length > 0 ? segments : renderFormatting(text)
  }

  // Render one line as bullet, numbered, heading, or plain (extracted to avoid nested ternary + complexity)
  const renderFormattingLine = (line: string): React.ReactNode => {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div className="gba:flex gba:gap-2 gba:ml-4">
          <span className="gba:text-primary">•</span>
          <span>{renderInlineFormatting(line.slice(2))}</span>
        </div>
      )
    }
    const numberedMatch = /^(\d+)\.\s/.exec(line)
    if (numberedMatch) {
      return (
        <div className="gba:flex gba:gap-2 gba:ml-4">
          <span className="gba:text-primary gba:font-semibold">{numberedMatch[1]}.</span>
          <span>{renderInlineFormatting(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      )
    }
    if (line.startsWith('# ')) return <h1 className="gba:text-2xl gba:font-bold gba:mt-4 gba:mb-2">{line.slice(2)}</h1>
    if (line.startsWith('## ')) return <h2 className="gba:text-xl gba:font-bold gba:mt-3 gba:mb-2">{line.slice(3)}</h2>
    if (line.startsWith('### '))
      return <h3 className="gba:text-lg gba:font-semibold gba:mt-2 gba:mb-1">{line.slice(4)}</h3>
    return <>{renderInlineFormatting(line)}</>
  }

  const renderFormatting = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      const trimmedLine = line.trim()
      const nextLine = lines[i + 1]?.trim()
      const isEmptyLine = trimmedLine === ''
      const isListLine = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || /^\d+\.\s/.test(trimmedLine)
      const nextIsListItem = nextLine?.startsWith('- ') || nextLine?.startsWith('* ') || /^\d+\.\s/.test(nextLine ?? '')

      if (isEmptyLine && nextIsListItem) return null

      return (
        <React.Fragment key={`line-${i}-${line.length}`}>
          {renderFormattingLine(line)}
          {i < lines.length - 1 && !isEmptyLine && !isListLine && <br />}
        </React.Fragment>
      )
    })
  }

  const renderBoldSegments = (segment: string, keyPrefix: string): React.ReactNode[] => {
    const boldRegex = /\*\*([^*]+)\*\*/g
    const nodes: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let boldIndex = 0

    while ((match = boldRegex.exec(segment)) !== null) {
      const [fullMatch, boldText] = match
      const start = match.index
      if (start > lastIndex) {
        nodes.push(segment.slice(lastIndex, start))
      }
      nodes.push(
        <strong key={`${keyPrefix}-bold-${boldIndex}`} className="gba:font-semibold">
          {boldText}
        </strong>
      )
      lastIndex = start + fullMatch.length
      boldIndex += 1
    }

    if (lastIndex < segment.length) {
      nodes.push(segment.slice(lastIndex))
    }

    return nodes.length > 0 ? nodes : [segment]
  }

  // Render **bold** and [links](url)
  const renderInlineFormatting = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)\s]+)\)/g
    const nodes: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let linkIndex = 0

    while ((match = linkRegex.exec(text)) !== null) {
      const [fullMatch, label, url] = match
      const start = match.index
      if (start > lastIndex) {
        nodes.push(...renderBoldSegments(text.slice(lastIndex, start), `pre-${start}`))
      }
      const safeHref = getSafeHref(url)
      if (safeHref === '#') {
        nodes.push(...renderBoldSegments(label, `link-${start}-${linkIndex}`))
      } else {
        nodes.push(
          <a
            key={`link-${start}-${linkIndex}`}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="gba:text-primary gba:underline"
          >
            {renderBoldSegments(label, `link-label-${start}-${linkIndex}`)}
          </a>
        )
      }
      lastIndex = start + fullMatch.length
      linkIndex += 1
    }

    if (lastIndex < text.length) {
      nodes.push(...renderBoldSegments(text.slice(lastIndex), `tail-${lastIndex}`))
    }

    return nodes.length > 0 ? nodes : text
  }

  return (
    <div className="gba:space-y-3">
      {parts.map((part, i) => {
        if (part.type === 'code') {
          const isCopied = copiedBlocks.has(blockIndex)
          const currentBlockIndex = blockIndex++

          return (
            <div key={`code-${i}-${part.content.length}-${part.language ?? ''}`} className="gba:relative gba:group">
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
          <div key={`text-${i}-${part.content.length}`} className="gba:text-sm gba:leading-relaxed">
            {renderText(part.content)}
          </div>
        )
      })}
    </div>
  )
}
