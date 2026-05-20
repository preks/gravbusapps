import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, useTranslation } from '@newwork/nw-design-system'
import { Users, Receipt, Network, Headphones, TrendingUp, FileText } from 'lucide-react'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { LucideIcon } from 'lucide-react'
import translations from '../_i18n'

interface SpaceItem {
  id: string
  labelKey: string
  icon: LucideIcon
  href: string
  featureKey?: string
}

const SPACES: SpaceItem[] = [
  { id: 'hr', labelKey: 'spaces-hr', icon: Users, href: '/platform/employee-record' },
  {
    id: 'expenses',
    labelKey: 'spaces-expenses',
    icon: Receipt,
    href: '/platform/fin/expenses/personal-expenses',
    featureKey: Feature.HCM.EmployeeExpenses.Key
  },
  { id: 'orgchart', labelKey: 'spaces-orgchart', icon: Network, href: '/platform/orgchart' },
  {
    id: 'services',
    labelKey: 'spaces-services',
    icon: Headphones,
    href: '/platform/sales-demo/service-launcher',
    featureKey: Feature.Services.Enabled.Key
  },
  {
    id: 'sales',
    labelKey: 'spaces-sales',
    icon: TrendingUp,
    href: '/platform/crm/customer-launcher',
    featureKey: Feature.CRM.CustomerRelations.Key
  },
  { id: 'documents', labelKey: 'spaces-documents', icon: FileText, href: '/platform/every-office/documents' }
]

interface AppSpacesProps {
  'data-testid'?: string
}

export const AppSpaces: React.FC<AppSpacesProps> = ({ 'data-testid': testId = 'work-home-spaces' }) => {
  const { t } = useTranslation(translations)

  const expensesEnabled = useFeature(Feature.HCM.EmployeeExpenses.Key)
  const servicesEnabled = useFeature(Feature.Services.Enabled.Key)
  const crmEnabled = useFeature(Feature.CRM.CustomerRelations.Key)

  const featureFlags: Record<string, unknown> = {
    [Feature.HCM.EmployeeExpenses.Key]: expensesEnabled,
    [Feature.Services.Enabled.Key]: servicesEnabled,
    [Feature.CRM.CustomerRelations.Key]: crmEnabled
  }

  const isSpaceEnabled = (space: SpaceItem) => {
    if (!space.featureKey) return true
    return featureFlags[space.featureKey] !== false
  }

  const handleNavigate = (href: string) => {
    navigateTo(buildPlatformUrl(href, { from: 'work-home' }))
  }

  return (
    <Card className="gba:rounded-xl gba:p-5" data-testid={testId}>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-lg">{t('spaces-title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:flex gba:flex-wrap gba:gap-3">
          {SPACES.map(space => {
            const Icon = space.icon
            const enabled = isSpaceEnabled(space)
            return (
              <button
                type="button"
                key={space.id}
                onClick={enabled ? () => handleNavigate(space.href) : undefined}
                disabled={!enabled}
                className={`gba:flex gba:items-center gba:gap-2.5 gba:px-4 gba:py-3 gba:bg-surface gba:rounded-lg gba:transition-colors ${enabled ? 'gba:hover:bg-muted/40 gba:cursor-pointer' : 'gba:opacity-40 gba:cursor-not-allowed gba:grayscale'}`}
                data-testid={`${testId}-${space.id}`}
              >
                <div
                  className={`gba:h-9 gba:w-9 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${enabled ? 'gba:bg-primary/10' : 'gba:bg-muted'}`}
                >
                  <Icon className={`gba:h-4 gba:w-4 ${enabled ? 'gba:text-primary' : 'gba:text-muted-foreground'}`} />
                </div>
                <span
                  className={`gba:text-sm gba:font-medium ${enabled ? 'gba:text-foreground' : 'gba:text-muted-foreground'}`}
                >
                  {t(space.labelKey)}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
