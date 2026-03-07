import { Card, CardContent } from '@newwork/nw-design-system'
import { Lightbulb, TrendingUp, BarChart3, Calendar } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { InlineEditableMarkdownBlock } from '../editing/InlineEditableMarkdownBlock'

/**
 * Determine grid columns based on insight count:
 * 1 -> single centered card at 50% width
 * divisible by 3 -> 3 columns
 * everything else -> 2 columns
 */
const getInsightGridClasses = (count: number): string => {
  if (count === 1) return 'gba:grid-cols-1 gba:max-w-[50%] gba:mx-auto'
  if (count % 3 === 0) return 'gba:grid-cols-1 gba:md:grid-cols-3'
  return 'gba:grid-cols-1 gba:md:grid-cols-2'
}

/**
 * Extract a short title from insight text:
 * 1. First **bold phrase** found in the text
 * 2. Otherwise, first sentence (truncated to 60 chars)
 */
const extractInsightTitle = (text: string): string => {
  const boldMatch = text.match(/\*\*([^*]+)\*\*/)
  if (boldMatch) return boldMatch[1].slice(0, 60)
  const sentenceEnd = text.search(/[.!?]/)
  if (sentenceEnd > 0 && sentenceEnd <= 80) return text.slice(0, sentenceEnd)
  return text.slice(0, 60) + (text.length > 60 ? '...' : '')
}

const insightIcons = [Lightbulb, TrendingUp, BarChart3, Calendar, Lightbulb, TrendingUp]

interface InsightGridProps {
  insights: string[]
  accessToken: string
  editable?: boolean
  onInsightChange?: (index: number, value: string) => void
  testId: string
}

export const InsightGrid = ({ insights, accessToken, editable, onInsightChange, testId }: InsightGridProps) => {
  const gridClasses = getInsightGridClasses(insights.length)

  return (
    <div className={`gba:grid gba:gap-4 ${gridClasses}`}>
      {insights.map((insight, i) => {
        const IconComponent = insightIcons[i % insightIcons.length]
        return (
          <Card
            key={i}
            className="gba:bg-card-decorative gba:border-0 gba:overflow-hidden"
            data-testid={`${testId}-insight-${i}`}
          >
            <CardContent className="gba:p-5 gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2.5">
                <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-lg gba:bg-white/15 gba:flex-shrink-0">
                  <IconComponent className="gba:h-4 gba:w-4 gba:text-white" />
                </div>
                <span className="gba:text-sm gba:font-bold gba:text-white gba:leading-snug">
                  {extractInsightTitle(insight)}
                </span>
              </div>
              <div className="gba:text-[13px] gba:leading-relaxed gba:[&_p]:text-white/90 gba:[&_strong]:text-white gba:[&_li]:text-white/90 gba:[&_em]:text-white/80 gba:[&_a]:text-white gba:[&_a]:underline gba:[&_code]:text-white/80 gba:[&_h1]:text-white gba:[&_h2]:text-white gba:[&_h3]:text-white gba:[&_blockquote]:text-white/80">
                {editable ? (
                  <InlineEditableMarkdownBlock
                    value={insight}
                    onChange={val => onInsightChange?.(i, val)}
                    accessToken={accessToken}
                    testId={`${testId}-insight-edit-${i}`}
                  />
                ) : (
                  <MarkdownWithChipsRenderer content={insight} accessToken={accessToken} variant="default" />
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
