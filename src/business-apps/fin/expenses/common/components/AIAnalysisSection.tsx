/**
 * AI Analysis Section Component
 *
 * Displays AI-generated analysis for expense requests in the sidebar.
 * Shows warnings or informational messages with appropriate styling.
 */

import React from 'react'
import { Alert, Spinner, Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { PiWarning, PiInfo, PiArrowClockwise, PiSparkle } from 'react-icons/pi'
import { type AnalysisType, type ExpenseRequestAnalysis } from '../hooks/useExpenseRequestAnalysis'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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

/**
 * Get styling and icon based on analysis type
 */
const getAnalysisStyles = (type: AnalysisType) => {
  if (type === 'WARNING') {
    return {
      icon: <PiWarning className="gba:h-5 gba:w-5 gba:text-warning gba:flex-shrink-0" />,
      containerClass: 'gba:border-border',
      textClass: 'gba:text-foreground',
      titleClass: 'gba:text-warning',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:ai_analysis.attention_required', 'Attention Required')
    }
  }

  return {
    icon: <PiInfo className="gba:h-5 gba:w-5 gba:text-info gba:flex-shrink-0" />,
    containerClass: 'gba:border-border',
    textClass: 'gba:text-foreground',
    titleClass: 'gba:text-info',
    title: getTranslationFromI18nKeyAndLabel('lowcoder:ai_analysis.analysis_complete', 'Analysis Complete')
  }
}

const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({ analysis, loading, error, onRefresh }) => {
  // Loading state
  if (loading) {
    return (
      <Card className="gba:mt-4" data-testid="ai-analysis-loading">
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold">
            <PiSparkle className="gba:h-5 gba:w-5 gba:text-primary" />
            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_analysis.title', 'AI Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:py-6 gba:gap-3">
            <Spinner />
            <span className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_analysis.analyzing', 'Analyzing expense request...')}
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
            <PiSparkle className="gba:h-5 gba:w-5 gba:text-primary" />
            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_analysis.title', 'AI Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="gba:mb-3">
            <div className="gba:flex gba:items-start gba:gap-2">
              <PiWarning className="gba:h-4 gba:w-4 gba:mt-0.5" />
              <div>
                <p className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_analysis.error_title', 'Analysis Failed')}
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
              <PiArrowClockwise className="gba:h-4 gba:w-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_analysis.retry', 'Retry Analysis')}
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
            <PiSparkle className="gba:h-5 gba:w-5 gba:text-primary" />
            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_analysis.title', 'AI Analysis')}
          </CardTitle>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="gba:h-8 gba:w-8 gba:p-0"
              title={getTranslationFromI18nKeyAndLabel('lowcoder:ai_analysis.refresh', 'Refresh analysis')}
              data-testid="ai-analysis-refresh-button"
            >
              <PiArrowClockwise className="gba:h-4 gba:w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`gba:rounded-lg gba:border gba:p-4 ${styles.containerClass}`}
          data-testid={`ai-analysis-${analysis.type.toLowerCase()}`}
        >
          {/* Header with icon and title */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            {styles.icon}
            <span className={`gba:font-semibold gba:text-sm ${styles.titleClass}`}>{styles.title}</span>
          </div>

          {/* Analysis content */}
          <div className={styles.textClass}>
            <FormattedAnalysisText text={analysis.user_text} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AIAnalysisSection
