import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import type { ArtifactFile } from '../../../types/fabric'
import CodeArtifact from './CodeArtifact'

interface Slide {
  title?: string
  content?: string
  notes?: string
}

function parseSlides(raw: string): Slide[] {
  try {
    const parsed = JSON.parse(raw) as { slides?: Slide[] } | Slide[]
    if (Array.isArray(parsed)) return parsed
    if (parsed.slides && Array.isArray(parsed.slides)) return parsed.slides
  } catch {
    // Fall back: split on "---" separators (markdown-style)
    const sections = raw
      .split(/^---$/m)
      .map(s => s.trim())
      .filter(Boolean)
    if (sections.length > 1) {
      return sections.map(s => {
        const lines = s.split('\n')
        const title = lines[0].replace(/^#+\s*/, '')
        const content = lines.slice(1).join('\n').trim()
        return { title, content }
      })
    }
  }
  return [{ title: 'Slide 1', content: raw }]
}

export interface SlideArtifactProps {
  file: ArtifactFile
  content: string | null
  viewMode: 'preview' | 'code'
}

const SlideArtifact: React.FC<SlideArtifactProps> = ({ file, content, viewMode }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  const slides = content ? parseSlides(content) : []

  const prev = useCallback(() => setCurrentIndex(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setCurrentIndex(i => Math.min((slides.length || 1) - 1, i + 1)), [slides.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next])

  if (content === null) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-sm gba:text-muted-foreground">
        Loading slides…
      </div>
    )
  }

  if (viewMode === 'code') {
    return <CodeArtifact file={file} content={content} viewMode={viewMode} language="json" />
  }

  if (slides.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-sm gba:text-muted-foreground">
        No slides found.
      </div>
    )
  }

  const slide = slides[currentIndex]

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="fabric-slide-artifact">
      {/* Slide canvas */}
      <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:p-8 gba:overflow-hidden">
        <div className="gba:w-full gba:max-w-3xl gba:aspect-video gba:bg-card gba:rounded-2xl gba:border gba:border-border gba:shadow-2xl gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-10 gba:gap-6">
          {slide.title && (
            <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:text-center gba:leading-snug">
              {slide.title}
            </h2>
          )}
          {slide.content && (
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:leading-relaxed gba:max-w-xl whitespace-pre-line">
              {slide.content}
            </p>
          )}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="gba:flex gba:items-center gba:justify-center gba:gap-4 gba:py-3 gba:border-t gba:border-white/10 gba:shrink-0">
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-lg gba:border gba:border-white/10 gba:text-slate-400 gba:hover:text-slate-200 gba:hover:bg-white/10 gba:disabled:opacity-30 gba:disabled:cursor-not-allowed gba:transition-colors"
          data-testid="fabric-slide-prev"
        >
          <ArrowLeft className="gba:h-4 gba:w-4" />
        </button>

        <span className="gba:text-xs gba:font-medium gba:text-slate-400 gba:tabular-nums">
          {currentIndex + 1} / {slides.length}
        </span>

        <button
          onClick={next}
          disabled={currentIndex === slides.length - 1}
          className="gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-lg gba:border gba:border-white/10 gba:text-slate-400 gba:hover:text-slate-200 gba:hover:bg-white/10 gba:disabled:opacity-30 gba:disabled:cursor-not-allowed gba:transition-colors"
          data-testid="fabric-slide-next"
        >
          <ArrowRight className="gba:h-4 gba:w-4" />
        </button>
      </div>

      {/* Speaker notes (if any) */}
      {slide.notes && (
        <div className="gba:px-6 gba:py-3 gba:border-t gba:border-border gba:bg-muted gba:shrink-0">
          <p className="gba:text-[11px] gba:text-slate-500 gba:uppercase gba:tracking-widest gba:mb-1">Notes</p>
          <p className="gba:text-xs gba:text-slate-400 gba:leading-relaxed">{slide.notes}</p>
        </div>
      )}
    </div>
  )
}

export default SlideArtifact
