import React from 'react';
import { Badge } from '@newwork/nw-design-system';
import { LogOut, Calendar } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatForDisplay } from '@/common/utils/dateFormatter';

interface PlannedExitFlagProps {
  plannedExit?: boolean | null;
  plannedExitDate?: string | null;
  variant?: 'default' | 'compact' | 'detailed';
  'data-testid'?: string;
}

const PlannedExitFlag: React.FC<PlannedExitFlagProps> = ({ 
  plannedExit, 
  plannedExitDate, 
  variant = 'default',
  'data-testid': dataTestId 
}) => {
  // Don't render anything if plannedExit is not true
  if (!plannedExit) {
    return null;
  }

  const formattedDate = formatForDisplay(plannedExitDate || '');

  // Compact variant - just an icon badge
  if (variant === 'compact') {
    return (
      <Badge 
        variant="destructive" 
        className="gba:flex gba:items-center gba:gap-1 gba:text-xs"
        data-testid={dataTestId}
        title={getTranslationFromI18nKeyAndLabel('crm.investments.plannedExit.tooltip', 'Planned for exit')}
      >
        <LogOut className="gba:h-3 gba:w-3" />
        {getTranslationFromI18nKeyAndLabel('crm.investments.plannedExit.compact', 'Exit')}
      </Badge>
    );
  }

  // Detailed variant - includes date information
  if (variant === 'detailed') {
    return (
      <div className="gba:flex gba:items-center gba:gap-2" data-testid={dataTestId}>
        <Badge 
          variant="destructive" 
          className="gba:flex gba:items-center gba:gap-1"
        >
          <LogOut className="gba:h-3 gba:w-3" />
          {getTranslationFromI18nKeyAndLabel('crm.investments.plannedExit.title', 'Planned Exit')}
        </Badge>
        {formattedDate && (
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:text-gray-600">
            <Calendar className="gba:h-3 gba:w-3" />
            <span>{formattedDate}</span>
          </div>
        )}
      </div>
    );
  }

  // Default variant - standard badge
  return (
    <Badge 
      variant="destructive" 
      className="gba:flex gba:items-center gba:gap-1"
      data-testid={dataTestId}
    >
      <LogOut className="gba:h-3 gba:w-3" />
      {getTranslationFromI18nKeyAndLabel('crm.investments.plannedExit.title', 'Planned Exit')}
    </Badge>
  );
};

export default PlannedExitFlag;
