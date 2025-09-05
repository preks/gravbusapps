import React from 'react';
import { Badge } from '@newwork/nw-design-system';
import { Circle } from 'lucide-react';
import { getStatusColor } from '@/common/data/investment';

interface StatusPillProps {
  status?: string | null;
  statusCode?: string | null;
  variant?: 'default' | 'compact';
  'data-testid'?: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ 
  status, 
  statusCode,
  variant = 'default',
  'data-testid': dataTestId 
}) => {
  // Don't render anything if status is not provided
  if (!status) {
    return null;
  }

  const statusColorClass = getStatusColor(statusCode || status);

  // Compact variant - smaller text and padding
  if (variant === 'compact') {
    return (
      <Badge 
        className={`gba:flex gba:items-center gba:gap-1 gba:text-xs gba:px-2 gba:py-0.5 ${statusColorClass}`}
        data-testid={dataTestId}
        title={`Investment Status: ${status}`}
      >
        <Circle className="gba:h-2 gba:w-2 gba:fill-current" />
        {status}
      </Badge>
    );
  }

  // Default variant - standard badge
  return (
    <Badge 
      className={`gba:flex gba:items-center gba:gap-1 gba:text-sm ${statusColorClass}`}
      data-testid={dataTestId}
      title={`Investment Status: ${status}`}
    >
      <Circle className="gba:h-3 gba:w-3 gba:fill-current" />
      {status}
    </Badge>
  );
};

export default StatusPill;
