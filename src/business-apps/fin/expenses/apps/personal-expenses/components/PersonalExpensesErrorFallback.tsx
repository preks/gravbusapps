import { Button, useTranslation } from '@newwork/nw-design-system'
import personalTranslations from '../_i18n'

export interface PersonalExpensesErrorFallbackProps {
  error?: Error
  onRetry: () => void
}

export function PersonalExpensesErrorFallback({ error, onRetry }: PersonalExpensesErrorFallbackProps) {
  const { t } = useTranslation(personalTranslations)

  return (
    <div className="gba:p-5 gba:border gba:border-destructive gba:rounded gba:bg-destructive/10">
      <h3>{t('error-boundary-title')}</h3>
      <details>
        <summary>{t('error-boundary-details')}</summary>
        <pre>{error?.stack}</pre>
      </details>
      <Button type="button" onClick={onRetry} data-testid="personal-expenses-error-retry">
        {t('error-boundary-retry')}
      </Button>
    </div>
  )
}
