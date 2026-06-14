import React from 'react'
import type { CrmCustomFeedbackExecutionResult } from '../../../data/record/crmCustomFeedbackClient'

// TODO(customer-feedback): Replace this interim result renderer when backend result shapes and UX are finalized.
interface CustomFeedbackResultsProps {
  results: CrmCustomFeedbackExecutionResult[]
  t: (key: string) => string
}

const CustomFeedbackResults: React.FC<CustomFeedbackResultsProps> = ({ results, t }) => {
  if (results.length === 0) return null

  return (
    <div className="gba:space-y-2" data-testid="customer-360-feedback-results">
      <h3 className="gba:text-sm gba:font-medium">{t('feedback-results-title')}</h3>
      {results.map(result => (
        <div
          key={`${result.accountId}-${result.workflowId || result.error || result.message || 'result'}`}
          className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-md gba:border gba:border-border gba:p-3 gba:text-sm"
        >
          <span>{result.accountId || t('feedback-result-unknown-account')}</span>
          <span className={result.success ? 'gba:text-success' : 'gba:text-destructive'}>
            {result.success ? result.workflowId || t('feedback-result-success') : result.error || result.message}
          </span>
        </div>
      ))}
    </div>
  )
}

export default CustomFeedbackResults
export { CustomFeedbackResults }
