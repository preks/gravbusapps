import React from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { CaretLeft } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface DashboardViewHeaderProps {
  title: string
  badgeText: string
  backTestId: string
  onNavigateBack: () => void
}

export const DashboardViewHeader: React.FC<DashboardViewHeaderProps> = ({
  title,
  badgeText,
  backTestId,
  onNavigateBack
}) => (
  <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
    <div className="gba:flex gba:items-center">
      <Button variant="ghost" size="sm" onClick={onNavigateBack} className="gba:mr-4" data-testid={backTestId}>
        <CaretLeft size={16} className="gba:mr-1" />
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
          'Back to Dashboard'
        )}
      </Button>
      <h1 className="gba:text-xl gba:font-semibold">{title}</h1>
      <Badge variant="info" className="gba:ml-3">
        {badgeText}
      </Badge>
    </div>
  </div>
)
