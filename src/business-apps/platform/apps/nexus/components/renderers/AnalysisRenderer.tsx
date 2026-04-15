import { Separator, useTranslation } from '@newwork/nw-design-system'
import { Loader2, TrendingUp, BarChart3, Calendar, Sparkles } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { InlineEditableMarkdownBlock } from '../editing/InlineEditableMarkdownBlock'
import { InlineEditableTitle } from '../editing/InlineEditableTitle'
import { AnalysisKpiCard } from './AnalysisKpiCard'
import { AnalysisChart } from './AnalysisChart'
import { AnalysisTable } from './AnalysisTable'
import { InsightGrid } from './AnalysisInsightGrid'
import { AnalysisSectionRenderer } from './AnalysisSectionRenderer'
import type { AnalysisContent, AnalysisSection } from '../../types/nexus.types'
import translations from '../../_i18n'

interface AnalysisRendererProps {
  content: AnalysisContent
  title?: string
  isStreaming?: boolean
  accessToken?: string
  editable?: boolean
  onTitleChange?: (title: string) => void
  onContentChange?: (updates: Partial<AnalysisContent>) => void
  testId?: string
}

export const AnalysisRenderer = ({
  content,
  title,
  isStreaming = false,
  accessToken = '',
  editable = false,
  onTitleChange,
  onContentChange,
  testId = 'nexus-analysis'
}: AnalysisRendererProps) => {
  const { t, locale } = useTranslation(translations)
  const hasSections = content.sections && content.sections.length > 0
  const hasLegacyContent = content.charts?.length > 0 || content.tables?.length > 0
  const hasContent =
    content.summary || content.kpis?.length > 0 || content.insights?.length > 0 || hasSections || hasLegacyContent
  const canEdit = editable && !isStreaming

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
        <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('analysis-generating')}</p>
      </div>
    )
  }

  const reportDate = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date()
  )

  const handleInsightChange = (index: number, value: string) => {
    if (!content.insights) return
    const updated = [...content.insights]
    updated[index] = value
    onContentChange?.({ insights: updated })
  }

  const handleSectionChange = (sectionIndex: number, field: 'title' | 'content', value: string) => {
    if (!content.sections) return
    const updated = content.sections.map((s: AnalysisSection, i: number) =>
      i === sectionIndex ? { ...s, [field]: value } : s
    )
    onContentChange?.({ sections: updated })
  }

  return (
    <div className="gba:max-w-5xl gba:mx-auto gba:px-8 gba:py-10 gba:space-y-8" data-testid={testId}>
      {/* Report Header */}
      {title && (
        <header className="gba:text-center gba:space-y-4 gba:pb-6" data-testid={`${testId}-header`}>
          <div className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-full gba:bg-primary/10 gba:text-primary">
            <BarChart3 className="gba:h-3.5 gba:w-3.5" />
            <span className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-widest">
              {t('analysis-report')}
            </span>
          </div>
          {canEdit ? (
            <InlineEditableTitle
              value={title}
              onChange={val => onTitleChange?.(val)}
              as="h1"
              className="gba:text-2xl gba:font-bold gba:text-foreground gba:tracking-tight gba:max-w-3xl gba:mx-auto gba:leading-tight gba:text-center"
              testId={`${testId}-title`}
            />
          ) : (
            <h1 className="gba:text-2xl gba:font-bold gba:text-foreground gba:tracking-tight gba:max-w-3xl gba:mx-auto gba:leading-tight">
              {title}
            </h1>
          )}
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
              {canEdit ? (
                <InlineEditableMarkdownBlock
                  value={content.summary}
                  onChange={val => onContentChange?.({ summary: val })}
                  accessToken={accessToken}
                  testId={`${testId}-summary-edit`}
                />
              ) : (
                <MarkdownWithChipsRenderer content={content.summary} accessToken={accessToken} variant="default" />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Key Insights */}
      {content.insights && content.insights.length > 0 && (
        <section data-testid={`${testId}-insights`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-5">
            <div className="gba:h-6 gba:w-6 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <TrendingUp className="gba:h-3 gba:w-3 gba:text-primary" />
            </div>
            <h3 className="gba:text-sm gba:font-bold gba:text-foreground">{t('analysis-key-insights')}</h3>
          </div>
          <InsightGrid
            insights={content.insights}
            accessToken={accessToken}
            editable={canEdit}
            onInsightChange={handleInsightChange}
            testId={testId}
          />
        </section>
      )}

      {/* KPIs */}
      {content.kpis && content.kpis.length > 0 && (
        <section data-testid={`${testId}-kpis`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-5">
            <h3 className="gba:text-[11px] gba:font-bold gba:text-muted-foreground gba:uppercase gba:tracking-widest">
              {t('analysis-key-metrics')}
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

      {/* Dynamic Sections */}
      {hasSections &&
        content.sections!.map((section, i) => (
          <AnalysisSectionRenderer
            key={i}
            section={section}
            index={i}
            accessToken={accessToken}
            editable={canEdit}
            onSectionChange={(field, value) => handleSectionChange(i, field, value)}
            testId={testId}
          />
        ))}

      {/* Legacy fallback */}
      {!hasSections && hasLegacyContent && (
        <>
          {content.charts && content.charts.length > 0 && (
            <section data-testid={`${testId}-charts`}>
              <h3 className="gba:text-[11px] gba:font-bold gba:text-muted-foreground gba:uppercase gba:tracking-widest gba:mb-5">
                {t('analysis-visualizations')}
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
                {t('analysis-data-tables')}
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
          <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{t('analysis-building')}</span>
        </div>
      )}
    </div>
  )
}
