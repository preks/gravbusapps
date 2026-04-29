import React from 'react'
import { ShieldCheckIcon } from '@phosphor-icons/react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.compliance.${key}`, fallback)

export const ComplianceView: React.FC<BusinessAppContextProps> = () => (
  <Card data-testid="time-absence-hub-compliance-view">
    <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:py-16 gba:text-center">
      <ShieldCheckIcon size={48} className="gba:text-muted-foreground" />
      <h3 className="gba:text-xl gba:font-semibold gba:text-foreground">
        {tt('coming_soon_title', 'Compliance — coming soon')}
      </h3>
      <p className="gba:max-w-md gba:text-sm gba:text-muted-foreground">
        {tt(
          'coming_soon_body',
          'Working time limits, rest-period checks, break-violation flags, and country-specific labour rule monitoring will live here. We are scoping the rules engine; this tab is reserved so the navigation is stable.'
        )}
      </p>
    </CardContent>
  </Card>
)

export default ComplianceView
