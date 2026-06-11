import { useMemo, type ElementType } from 'react'
import {
  ArrowRightIcon,
  BankIcon,
  BriefcaseIcon,
  FileTextIcon,
  IdentificationCardIcon,
  LightbulbIcon,
  MapPinIcon,
  ShieldWarningIcon
} from '@phosphor-icons/react'
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, useTranslation } from '@newwork/nw-design-system'
import { useDataQualityContext } from '../hooks/dataQualityHooks'
import type { JaDrawerKind } from '../hooks/useDataQualityDashboardModel'
import translations from '../_i18n'

interface RecommendedActionsCardProps {
  readonly onActionClick: (issueFocus: string) => void
  readonly onOpenJaDrawer: (kind: Exclude<JaDrawerKind, null>) => void
  readonly issueToDrawerMap: Record<string, JaDrawerKind>
}

export function RecommendedActionsCard({
  onActionClick,
  onOpenJaDrawer,
  issueToDrawerMap
}: Readonly<RecommendedActionsCardProps>) {
  const { t } = useTranslation(translations)
  const ctx = useDataQualityContext()

  const actionIcons: Record<string, ElementType> = useMemo(
    () => ({
      'action-bank': BankIcon,
      'action-tax': IdentificationCardIcon,
      'action-location': MapPinIcon,
      'action-cost-center': MapPinIcon,
      'action-jp-profile': BriefcaseIcon,
      'action-jprof-desc': FileTextIcon,
      'action-jprof-skills': LightbulbIcon
    }),
    []
  )

  return (
    <Card>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base gba:font-semibold">{t('section-recommended-actions')}</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">{t('recommended-actions-subtitle')}</p>
      </CardHeader>
      <CardContent>
        {ctx.recommendedActions.length === 0 ? (
          <EmptyState type="no-data" compact title={t('empty-no-actions')} description={t('empty-healthy')} />
        ) : (
          <div className="gba:space-y-0.5">
            {ctx.recommendedActions.map(action => {
              const Icon = actionIcons[action.id] ?? ShieldWarningIcon
              const title = t(`${action.id}-title`)
              const description = t(`${action.id}-desc`)
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    const drawerKind = issueToDrawerMap[action.issueFocus]
                    if (drawerKind) onOpenJaDrawer(drawerKind)
                    else onActionClick(action.issueFocus)
                  }}
                  className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:rounded-md gba:px-3 gba:py-2.5 gba:text-left hover:gba:bg-muted gba:transition-colors gba:group"
                >
                  <Icon className="gba:size-4 gba:text-muted-foreground gba:shrink-0" />
                  <div className="gba:flex-1 gba:min-w-0">
                    <span className="gba:text-sm gba:block gba:truncate" title={title}>
                      {title}
                    </span>
                    <span className="gba:text-xs gba:text-muted-foreground gba:block gba:truncate" title={description}>
                      {description}
                    </span>
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {t('recommended-affected', { count: action.affectedCount })}
                    </span>
                  </div>
                  <Badge variant="destructive" size="sm" className="gba:shrink-0">
                    {action.affectedCount}
                  </Badge>
                  <ArrowRightIcon className="gba:size-3.5 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
