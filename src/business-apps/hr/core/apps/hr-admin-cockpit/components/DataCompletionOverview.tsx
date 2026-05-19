import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { CATEGORY_I18N_KEY } from '../services/dataQualityCompute'
import { useDataQualityContext } from '../hooks/dataQualityHooks'
import translations from '../_i18n'

export function DataCompletionOverview() {
  const { t } = useTranslation(translations)
  const { requirements, loading } = useDataQualityContext()

  if (loading) return <Spinner />

  return (
    <Card>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:font-semibold">{t('section-data-completion')}</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">{t('data-completion-subtitle')}</p>
      </CardHeader>
      <CardContent>
        {requirements.categories.length === 0 ? (
          <EmptyState type="no-data" compact title={t('empty-no-data')} description={t('empty-adjust-filters')} />
        ) : (
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground gba:font-medium">
              <span>{t('data-completion-header-required')}</span>
              <div className="gba:flex gba:items-center gba:gap-4">
                <span className="gba:w-14 gba:text-right">{t('data-completion-header-completion')}</span>
                <span className="gba:w-10 gba:text-right">{t('data-completion-header-missing')}</span>
              </div>
            </div>
            <TooltipProvider>
              {requirements.categories.map(cat => {
                const catLabel = CATEGORY_I18N_KEY[cat.id] ? t(CATEGORY_I18N_KEY[cat.id]) : cat.label
                return (
                  <Tooltip key={cat.id}>
                    <TooltipTrigger asChild>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:group">
                        <span className="gba:text-sm gba:w-32 gba:shrink-0 gba:truncate" title={catLabel}>
                          {catLabel}
                        </span>
                        <div className="gba:flex-1 gba:min-w-16">
                          <Progress
                            value={cat.completionRate}
                            aria-label={t('data-completion-row-aria', {
                              category: catLabel,
                              rate: cat.completionRate,
                              missing: cat.missingCount
                            })}
                          />
                        </div>
                        <span className="gba:text-xs gba:font-medium gba:tabular-nums gba:w-14 gba:text-right gba:text-muted-foreground">
                          {cat.completionRate}%
                        </span>
                        <span className="gba:text-sm gba:font-semibold gba:tabular-nums gba:w-10 gba:text-right gba:text-destructive">
                          {cat.missingCount > 0 ? cat.missingCount : ''}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('data-completion-row-tooltip', { category: catLabel, missing: cat.missingCount })}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
