import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@newwork/nw-design-system'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { SlidesContent, GeneratedSlide } from '../../types/nexus.types'

interface SlidesRendererProps {
  content: SlidesContent
  testId?: string
}

export const SlidesRenderer = ({ content, testId = 'nexus-slides' }: SlidesRendererProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const slides = content.slides || []
  const currentSlide = slides[currentIndex]

  if (slides.length === 0) return null

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:px-8 gba:py-8" data-testid={testId}>
      {/* Slide Preview */}
      <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center">
        <div className="gba:w-full gba:max-w-4xl gba:aspect-[16/9]">
          <Card className="gba:h-full gba:overflow-hidden gba:ring-1 gba:ring-border/30">
            <CardContent className="gba:h-full gba:flex gba:flex-col gba:justify-center gba:p-12">
              {currentSlide && <SlideContent slide={currentSlide} />}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="gba:flex gba:items-center gba:justify-center gba:gap-4 gba:mt-5">
        <Button
          variant="outline"
          size="icon"
          className="gba:h-9 gba:w-9 gba:rounded-xl"
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          data-testid={`${testId}-prev`}
        >
          <ChevronLeft className="gba:h-4 gba:w-4" />
        </Button>

        <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:tabular-nums gba:min-w-[60px] gba:text-center">
          {currentIndex + 1} / {slides.length}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="gba:h-9 gba:w-9 gba:rounded-xl"
          onClick={() => setCurrentIndex(i => Math.min(slides.length - 1, i + 1))}
          disabled={currentIndex === slides.length - 1}
          data-testid={`${testId}-next`}
        >
          <ChevronRight className="gba:h-4 gba:w-4" />
        </Button>
      </div>

      {/* Slide Thumbnails */}
      <div className="gba:flex gba:gap-2 gba:overflow-x-auto gba:py-4 gba:px-1 gba:mt-3 gba:justify-center">
        {slides.map((slide, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`gba:flex-shrink-0 gba:w-28 gba:h-16 gba:rounded-lg gba:border gba:text-left gba:px-2.5 gba:py-2 gba:transition-all gba:duration-150 ${
              idx === currentIndex
                ? 'gba:border-primary gba:bg-primary/5 gba:ring-1 gba:ring-primary/20'
                : 'gba:border-border gba:hover:border-primary/30 gba:hover:bg-muted/30'
            }`}
            data-testid={`${testId}-thumb-${idx}`}
          >
            <p className="gba:text-[8px] gba:font-semibold gba:text-foreground gba:truncate">{slide.title}</p>
            <p className="gba:text-[7px] gba:text-muted-foreground gba:truncate gba:mt-0.5">{slide.layout}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Slide Content Renderer ───────────────────────────────────

const SlideContent = ({ slide }: { slide: GeneratedSlide }) => {
  switch (slide.layout) {
    case 'title-cover':
      return (
        <div className="gba:text-center gba:space-y-4">
          <h1 className="gba:text-3xl gba:font-bold gba:text-foreground gba:tracking-tight">{slide.title}</h1>
          {slide.subtitle && <p className="gba:text-lg gba:text-muted-foreground">{slide.subtitle}</p>}
        </div>
      )

    case 'thank-you':
      return (
        <div className="gba:text-center gba:space-y-3">
          <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">{slide.title}</h1>
          {slide.subtitle && <p className="gba:text-lg gba:text-muted-foreground">{slide.subtitle}</p>}
        </div>
      )

    case 'agenda':
    case 'bullets':
      return (
        <div className="gba:space-y-4">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{slide.title}</h2>
          {slide.bullets && (
            <ul className="gba:space-y-2">
              {slide.bullets.map((bullet, i) => (
                <li key={i} className="gba:flex gba:items-start gba:gap-2">
                  <span className="gba:text-primary gba:font-bold gba:mt-0.5">--</span>
                  <span className="gba:text-sm gba:text-foreground">{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )

    case 'section-divider':
      return (
        <div className="gba:text-center gba:space-y-3">
          {slide.sectionNumber && (
            <Badge variant="secondary" className="gba:text-xs">
              Section {slide.sectionNumber}
            </Badge>
          )}
          <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">{slide.title}</h1>
          {slide.description && <p className="gba:text-sm gba:text-muted-foreground">{slide.description}</p>}
        </div>
      )

    case 'two-column':
      return (
        <div className="gba:space-y-4">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{slide.title}</h2>
          <div className="gba:grid gba:grid-cols-2 gba:gap-6">
            <div>
              {slide.leftTitle && <p className="gba:text-sm gba:font-semibold gba:mb-2">{slide.leftTitle}</p>}
              {slide.leftColumn?.map((item, i) => (
                <p key={i} className="gba:text-xs gba:text-foreground gba:mb-1">
                  {item}
                </p>
              ))}
            </div>
            <div>
              {slide.rightTitle && <p className="gba:text-sm gba:font-semibold gba:mb-2">{slide.rightTitle}</p>}
              {slide.rightColumn?.map((item, i) => (
                <p key={i} className="gba:text-xs gba:text-foreground gba:mb-1">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      )

    case 'key-takeaway':
      return (
        <div className="gba:text-center gba:space-y-4 gba:px-8">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{slide.title}</h2>
          {slide.content && <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">{slide.content}</p>}
        </div>
      )

    case 'key-metrics':
      return (
        <div className="gba:space-y-4">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{slide.title}</h2>
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            {slide.metrics?.map((metric, i) => (
              <div key={i} className="gba:p-3 gba:rounded-lg gba:bg-muted">
                <p className="gba:text-xs gba:text-muted-foreground">{metric.label}</p>
                <p className="gba:text-lg gba:font-bold gba:text-foreground">{metric.value}</p>
                {metric.trendValue && <p className="gba:text-xs gba:text-muted-foreground">{metric.trendValue}</p>}
              </div>
            ))}
          </div>
        </div>
      )

    case 'process-flow':
    case 'timeline':
      return (
        <div className="gba:space-y-4">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{slide.title}</h2>
          <div className="gba:space-y-3">
            {(slide.steps || slide.items)?.map((item, i) => (
              <div key={i} className="gba:flex gba:items-start gba:gap-3">
                <div className="gba:flex-shrink-0 gba:w-7 gba:h-7 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">{item.title}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return (
        <div className="gba:space-y-3">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{slide.title}</h2>
          {slide.bullets && (
            <ul className="gba:space-y-1.5">
              {slide.bullets.map((b, i) => (
                <li key={i} className="gba:text-sm gba:text-foreground">
                  {b}
                </li>
              ))}
            </ul>
          )}
          {slide.content && <p className="gba:text-sm gba:text-foreground">{slide.content}</p>}
        </div>
      )
  }
}
