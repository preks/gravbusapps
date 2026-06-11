import React from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'

interface GenerationPlaceholderStepProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
  onRetry: () => void
}

export const GenerationPlaceholderStep: React.FC<GenerationPlaceholderStepProps> = ({ status, error, onRetry }) => {
  const { t } = useTranslation(translations)

  return (
    <Card data-testid="learning-generation-placeholder">
      <CardHeader>
        <CardTitle>{t('learning-builder-step-generate')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {status === 'error' ? (
          <>
            <div
              className="gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-sm gba:text-destructive"
              data-testid="learning-generation-error"
            >
              {error || t('learning-generation-failed')}
            </div>
            <Button type="button" onClick={onRetry} data-testid="learning-generation-retry-button">
              {t('learning-generation-retry')}
            </Button>
          </>
        ) : (
          <div className="gba:flex gba:items-center gba:gap-3" data-testid="learning-generation-loading">
            {status === 'loading' && <Spinner size="sm" data-testid="learning-generation-spinner" />}
            <p className="gba:text-sm gba:text-muted-foreground">
              {status === 'success' ? t('learning-generation-complete') : t('learning-generation-loading')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
