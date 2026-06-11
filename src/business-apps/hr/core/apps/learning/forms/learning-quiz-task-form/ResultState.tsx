import React from 'react'
import { Button } from '@newwork/nw-design-system'
import type { LearningAttemptCommandResult } from '../../types'

interface ResultStateProps {
  result: LearningAttemptCommandResult
  submitting: boolean
  t: (key: string, params?: Record<string, unknown>) => string
  onRetake: () => void
}

function getResultLabelKey(result: LearningAttemptCommandResult): string {
  if (result.status === 'SUBMITTED_LEARNING_ATTEMPT') return 'learning-quiz-result-pending'
  return result.passed ? 'learning-quiz-result-passed' : 'learning-quiz-result-failed'
}

export const ResultState: React.FC<ResultStateProps> = ({ result, submitting, t, onRetake }) => (
  <div className="gba:space-y-4" data-testid="learning-quiz-result">
    <div className="gba:rounded-lg gba:border gba:p-4">
      <div className="gba:text-sm gba:text-muted-foreground">{t('learning-quiz-result-status')}</div>
      <div className="gba:text-xl gba:font-semibold">{t(getResultLabelKey(result))}</div>
      {result.scorePct !== undefined && (
        <div className="gba:mt-2 gba:text-sm">
          {t('learning-quiz-result-score', { score: Math.round(result.scorePct) })}
        </div>
      )}
      {result.bandLabel && (
        <div className="gba:text-sm">{t('learning-quiz-result-band', { band: result.bandLabel })}</div>
      )}
      {result.attemptsLeft !== undefined && (
        <div className="gba:text-sm gba:text-muted-foreground">
          {t('learning-quiz-result-attempts-left', { count: result.attemptsLeft })}
        </div>
      )}
    </div>
    {result.canRetake && (
      <Button
        type="button"
        variant="outline"
        onClick={onRetake}
        disabled={submitting}
        data-testid="learning-quiz-retake-button"
      >
        {submitting ? t('learning-quiz-starting') : t('learning-quiz-retake')}
      </Button>
    )}
  </div>
)
