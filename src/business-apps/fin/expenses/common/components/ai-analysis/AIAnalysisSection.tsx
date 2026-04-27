/**
 * AI Analysis Section Component
 *
 * Displays AI-generated analysis for expense requests in the sidebar.
 * Shows warnings or informational messages with appropriate styling.
 */

import React from 'react'
import { Alert, Spinner, Button, Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { WarningIcon, InfoIcon, ArrowClockwiseIcon, SparkleIcon } from '@phosphor-icons/react'
import { type AnalysisType, type ExpenseRequestAnalysis } from '../../hooks/useExpenseRequestAnalysis'
import translations from '../../_i18n'

interface AIAnalysisSectionProps {
  analysis: ExpenseRequestAnalysis | null
  loading: boolean
  error: Error | null
  onRefresh?: () => void
}

/**
 * Renders the analysis text with proper formatting
 * Handles numbered lists and line breaks
 */
const FormattedAnalysisText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n').filter(line => line.trim())

  return (
    <div className="gba:space-y-2">
      {lines.map((line, index) => {
        // Check if line starts with a number (e.g., "1.", "2.")
        const isNumberedItem = /^\d+\./.test(line.trim())
        // Use line content hash for stable key
        const lineKey = `line-${index}-${line.slice(0, 20)}`

        if (isNumberedItem) {
          return (
            <div key={lineKey} className="gba:flex gba:gap-2 gba:pl-2">
              <span className="gba:text-sm gba:leading-relaxed">{line}</span>
            </div>
          )
        }

        return (
          <p key={lineKey} className="gba:text-sm gba:leading-relaxed">
            {line}
          </p>
        )
      })}
    </div>
  )
}

const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({ analysis, loading, error, onRefresh }) => {
  const { t } = useTranslation(translations)

  const getAnalysisStyles = (type: AnalysisType) => {
    if (type === 'WARNING') {
      return {
        icon: <WarningIcon className="gba:h-5 gba:w-5 gba:text-warning gba:flex-shrink-0" />,
        containerClass: 'gba:border-border',
        textClass: 'gba:text-foreground',
        titleClass: 'gba:text-warning',
        title: t('ai-analysis-attention-required')
      }
    }

    return {
      icon: <InfoIcon className="gba:h-5 gba:w-5 gba:text-info gba:flex-shrink-0" />,
      containerClass: 'gba:border-border',
      textClass: 'gba:text-foreground',
      titleClass: 'gba:text-info',
      title: t('ai-analysis-analysis-complete')
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card className="gba:mt-4" data-testid="ai-analysis-loading">
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold">
            <SparkleIcon className="gba:h-5 gba:w-5 gba:text-primary" />
            {t('ai-analysis-title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:py-6 gba:gap-3">
            <Spinner />
            <span className="gba:text-sm gba:text-muted-foreground">
              {t('ai-analysis-analyzing')}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="gba:mt-4" data-testid="ai-analysis-error">
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold">
            <SparkleIcon className="gba:h-5 gba:w-5 gba:text-primary" />
            {t('ai-analysis-title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="gba:mb-3">
            <div className="gba:flex gba:items-start gba:gap-2">
              <WarningIcon className="gba:h-4 gba:w-4 gba:mt-0.5" />
              <div>
                <p className="gba:text-sm gba:font-medium">
                  {t('ai-analysis-error-title')}
                </p>
                <p className="gba:text-sm gba:mt-1">{error.message}</p>
              </div>
            </div>
          </Alert>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="gba:w-full"
              data-testid="ai-analysis-retry-button"
            >
              <ArrowClockwiseIcon className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('ai-analysis-retry')}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // No analysis available
  if (!analysis) {
    return null
  }

  // Analysis result
  const styles = getAnalysisStyles(analysis.type)

  return (
    <Card className="gba:mt-4" data-testid="ai-analysis-section">
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold">
            <SparkleIcon className="gba:h-5 gba:w-5 gba:text-primary" />
            {t('ai-analysis-title')}
          </CardTitle>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="gba:h-8 gba:w-8 gba:p-0"
              title={t('ai-analysis-refresh')}
              data-testid="ai-analysis-refresh-button"
            >
              <ArrowClockwiseIcon className="gba:h-4 gba:w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`gba:rounded-lg gba:border gba:p-4 ${styles.containerClass}`}
          data-testid={`ai-analysis-${analysis.type.toLowerCase()}`}
        >
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            {styles.icon}
            <span className={`gba:font-semibold gba:text-sm ${styles.titleClass}`}>{styles.title}</span>
          </div>
          <div className={styles.textClass}>
            <FormattedAnalysisText text={analysis.user_text} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AIAnalysisSection
