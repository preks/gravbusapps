import { Card, CardContent, Separator } from '@newwork/nw-design-system'
import { Loader2, Lightbulb, TrendingUp, BarChart3, Calendar, FileText, Sparkles } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { AnalysisKpiCard } from './AnalysisKpiCard'
import { AnalysisChart } from './AnalysisChart'
import { AnalysisTable } from './AnalysisTable'
import type { AnalysisContent, AnalysisSection } from '../../types/nexus.types'

interface AnalysisRendererProps {
  content: AnalysisContent
  title?: string
  isStreaming?: boolean
  accessToken?: string
  testId?: string
}

const SectionRenderer = ({
  section,
  index,
  accessToken,
  testId
}: {
  section: AnalysisSection
  index: number
  accessToken: string
  testId: string
}) => {
  if (section.type === 'narrative' && section.content) {
    return (
      <section data-testid={`${testId}-section-${index}`} className="gba:space-y-3">
        {section.title && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:h-6 gba:w-6 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
              <FileText className="gba:h-3 gba:w-3 gba:text-primary" />
            </div>
            <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{section.title}</h3>
          </div>
        )}
        <div className="gba:max-w-4xl gba:prose-sm gba:pl-8">
          <MarkdownWithChipsRenderer content={section.content} accessToken={accessToken} variant="default" />
        </div>
      </section>
    )
  }

  if (section.type === 'chart' && section.chart) {
    return (
      <section data-testid={`${testId}-section-${index}`}>
        <AnalysisChart chart={section.chart} testId={`${testId}-section-chart-${index}`} />
      </section>
    )
  }

  if (section.type === 'table' && section.table) {
    return (
      <section data-testid={`${testId}-section-${index}`}>
        <AnalysisTable table={section.table} testId={`${testId}-section-table-${index}`} />
      </section>
    )
  }

  return null
}

/**
 * Determine grid columns based on insight count:
 * 1 → single centered card at 50% width
 * divisible by 3 → 3 columns
 * everything else → 2 columns
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
  return text.slice(0, 60) + (text.length > 60 ? '…' : '')
}

const insightIcons = [Lightbulb, TrendingUp, BarChart3, Calendar, Lightbulb, TrendingUp]

const InsightGrid = ({
  insights,
  accessToken,
  testId
}: {
  insights: string[]
  accessToken: string
  testId: string
}) => {
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
                <MarkdownWithChipsRenderer content={insight} accessToken={accessToken} variant="default" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export const AnalysisRenderer = ({
  content,
  title,
  isStreaming = false,
  accessToken = '',
  testId = 'nexus-analysis'
}: AnalysisRendererProps) => {
  const hasSections = content.sections && content.sections.length > 0
  const hasLegacyContent = content.charts?.length > 0 || content.tables?.length > 0
  const hasContent =
    content.summary || content.kpis?.length > 0 || content.insights?.length > 0 || hasSections || hasLegacyContent

  // Compact waiting state while first content arrives
  if (!hasContent && isStreaming) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:min-h-[400px] gba:gap-4"
        data-testid={`${testId}-loading`}
      >
        <div className="gba:relative gba:h-10 gba:w-10">
          <Loader2 className="gba:h-10 gba:w-10 gba:animate-spin gba:text-primary/30" />
          <Sparkles className="gba:absolute gba:inset-0 gba:m-auto gba:h-4 gba:w-4 gba:text-primary" />
        </div>
        <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">Generating analysis...</p>
      </div>
    )
  }

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="gba:max-w-5xl gba:mx-auto gba:px-8 gba:py-10 gba:space-y-8" data-testid={testId}>
      {/* Report Header */}
      {title && (
        <header className="gba:text-center gba:space-y-4 gba:pb-6" data-testid={`${testId}-header`}>
          <div className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-full gba:bg-primary/10 gba:text-primary">
            <BarChart3 className="gba:h-3.5 gba:w-3.5" />
            <span className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-widest">Analysis Report</span>
          </div>
          <h1 className="gba:text-2xl gba:font-bold gba:text-foreground gba:tracking-tight gba:max-w-3xl gba:mx-auto gba:leading-tight">
            {title}
          </h1>
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1.5 gba:text-muted-foreground">
            <Calendar className="gba:h-3 gba:w-3" />
            <span className="gba:text-[11px]">{reportDate}</span>
          </div>
          <Separator />
        </header>
      )}

      {/* Executive Summary */}
      {content.summary && (
        <section data-testid={`${testId}-summary`}>
          <div className="gba:max-w-4xl gba:mx-auto gba:bg-card gba:border gba:border-border gba:rounded-2xl gba:px-8 gba:py-6 gba:ring-1 gba:ring-border/30">
            <div className="gba:prose-sm gba:leading-relaxed">
              <MarkdownWithChipsRenderer content={content.summary} accessToken={accessToken} variant="default" />
            </div>
          </div>
        </section>
      )}

      {/* Key Insights — decorative cards */}
      {content.insights && content.insights.length > 0 && (
        <section data-testid={`${testId}-insights`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-5">
            <div className="gba:h-6 gba:w-6 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <TrendingUp className="gba:h-3 gba:w-3 gba:text-primary" />
            </div>
            <h3 className="gba:text-sm gba:font-bold gba:text-foreground">Key Insights</h3>
          </div>
          <InsightGrid insights={content.insights} accessToken={accessToken} testId={testId} />
        </section>
      )}

      {/* KPIs */}
      {content.kpis && content.kpis.length > 0 && (
        <section data-testid={`${testId}-kpis`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-5">
            <h3 className="gba:text-[11px] gba:font-bold gba:text-muted-foreground gba:uppercase gba:tracking-widest">
              Key Metrics
            </h3>
          </div>
          <div className="gba:grid gba:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-4">
            {content.kpis.map((kpi, i) => (
              <AnalysisKpiCard key={i} kpi={kpi} testId={`${testId}-kpi-${i}`} />
            ))}
          </div>
        </section>
      )}

      <Separator />

      {/* Dynamic Sections (mixed narrative + charts + tables) */}
      {hasSections &&
        content.sections!.map((section, i) => (
          <SectionRenderer key={i} section={section} index={i} accessToken={accessToken} testId={testId} />
        ))}

      {/* Legacy fallback: top-level charts and tables */}
      {!hasSections && hasLegacyContent && (
        <>
          {content.charts && content.charts.length > 0 && (
            <section data-testid={`${testId}-charts`}>
              <h3 className="gba:text-[11px] gba:font-bold gba:text-muted-foreground gba:uppercase gba:tracking-widest gba:mb-5">
                Visualizations
              </h3>
              <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-4">
                {content.charts.map((chart, i) => (
                  <AnalysisChart key={i} chart={chart} testId={`${testId}-chart-${i}`} />
                ))}
              </div>
            </section>
          )}
          {content.tables && content.tables.length > 0 && (
            <section data-testid={`${testId}-tables`}>
              <h3 className="gba:text-[11px] gba:font-bold gba:text-muted-foreground gba:uppercase gba:tracking-widest gba:mb-5">
                Data Tables
              </h3>
              <div className="gba:space-y-4">
                {content.tables.map((table, i) => (
                  <AnalysisTable key={i} table={table} testId={`${testId}-table-${i}`} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center gba:py-6">
          <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin gba:text-primary" />
          <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Building analysis...</span>
        </div>
      )}
    </div>
  )
}
