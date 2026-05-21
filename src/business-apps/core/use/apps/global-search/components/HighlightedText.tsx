import React from 'react'

interface HighlightedTextProps {
  text: string
  className?: string
}

const MARK_PATTERN = /(<mark>)(.*?)(<\/mark>)/g

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, className }) => {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = MARK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <mark key={match.index} className="gba:bg-yellow-200 gba:text-foreground gba:rounded-sm">
        {match[2]}
      </mark>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  MARK_PATTERN.lastIndex = 0

  return <span className={className}>{parts}</span>
}
