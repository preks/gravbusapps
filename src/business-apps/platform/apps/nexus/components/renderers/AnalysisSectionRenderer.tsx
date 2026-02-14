import { FileText } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { InlineEditableMarkdownBlock } from '../editing/InlineEditableMarkdownBlock'
import { InlineEditableTitle } from '../editing/InlineEditableTitle'
import { AnalysisChart } from './AnalysisChart'
import { AnalysisTable } from './AnalysisTable'
import type { AnalysisSection } from '../../types/nexus.types'

interface AnalysisSectionRendererProps {
  section: AnalysisSection
  index: number
  accessToken: string
  editable?: boolean
  onSectionChange?: (field: 'title' | 'content', value: string) => void
  testId: string
}

export const AnalysisSectionRenderer = ({
  section,
  index,
  accessToken,
  editable,
  onSectionChange,
  testId
}: AnalysisSectionRendererProps) => {
  if (section.type === 'narrative' && section.content) {
    return (
      <section data-testid={`${testId}-section-${index}`} className="gba:space-y-3">
        {section.title && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:h-6 gba:w-6 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
              <FileText className="gba:h-3 gba:w-3 gba:text-primary" />
            </div>
            {editable ? (
              <InlineEditableTitle
                value={section.title}
                onChange={val => onSectionChange?.('title', val)}
                as="h3"
                className="gba:text-base gba:font-semibold gba:text-foreground"
                testId={`${testId}-section-title-${index}`}
              />
            ) : (
              <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{section.title}</h3>
            )}
          </div>
        )}
        <div className="gba:max-w-4xl gba:prose-sm gba:pl-8">
          {editable ? (
            <InlineEditableMarkdownBlock
              value={section.content}
              onChange={val => onSectionChange?.('content', val)}
              accessToken={accessToken}
              testId={`${testId}-section-edit-${index}`}
            />
          ) : (
            <MarkdownWithChipsRenderer content={section.content} accessToken={accessToken} variant="default" />
          )}
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
