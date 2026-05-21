/**
 * Onboarding Empty State
 *
 * Custom empty state component for the onboarding dashboard.
 * Shows when there are no onboarding cases to display.
 */

import React from 'react'
import { Card, CardContent, Button, useTranslation } from '@newwork/nw-design-system'
import { UserPlus, Users, FileText } from 'lucide-react'
import { OnboardingEmptyStateProps } from '../types'
import translations from '../_i18n'

export const OnboardingEmptyState: React.FC<OnboardingEmptyStateProps> = ({ view, onCreateCase }) => {
  const { t } = useTranslation(translations)

  return (
    <Card className="gba:border-dashed">
      <CardContent className="gba:py-12">
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:max-w-md gba:mx-auto">
          <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-6">
            <Users className="gba:h-8 gba:w-8 gba:text-primary" />
          </div>

          <h3 className="gba:text-xl gba:font-semibold gba:mb-2">{t('hr-onboarding-empty-title')}</h3>
          <p className="gba:text-muted-foreground gba:mb-6">
            {view === 'dashboard' ? t('hr-onboarding-empty-dashboard-desc') : t('hr-onboarding-empty-list-desc')}
          </p>

          <div className="gba:flex gba:flex-col gba:gap-3 gba:w-full gba:max-w-xs">
            <Button onClick={onCreateCase} className="gba:w-full">
              <UserPlus className="gba:mr-2 gba:h-4 gba:w-4" />
              {t('hr-onboarding-empty-start')}
            </Button>

            <Button variant="outline" className="gba:w-full" asChild>
              <a href="#" className="gba:flex gba:items-center gba:justify-center">
                <FileText className="gba:mr-2 gba:h-4 gba:w-4" />
                {t('hr-onboarding-empty-guide')}
              </a>
            </Button>
          </div>

          <div className="gba:mt-8 gba:grid gba:grid-cols-3 gba:gap-4 gba:text-center">
            <div>
              <div className="gba:text-2xl gba:font-bold gba:text-primary">1</div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-empty-step1')}</div>
            </div>
            <div>
              <div className="gba:text-2xl gba:font-bold gba:text-primary">2</div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-empty-step2')}</div>
            </div>
            <div>
              <div className="gba:text-2xl gba:font-bold gba:text-primary">3</div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-empty-step3')}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OnboardingEmptyState
