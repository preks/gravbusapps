import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { FileText } from 'lucide-react';
import type { EquityInvestmentData } from '../hooks/useEquityRecordData';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface EquityReportsProps {
  equityData?: EquityInvestmentData | null;
  isLoading?: boolean;
  context?: BusinessAppContextProps;
}

const EquityReports: React.FC<EquityReportsProps> = ({ equityData, isLoading, context }) => {
  const reports: Array<{ id: string }> = [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:h-5 gba:w-5 gba:text-gray-700" />
            {getTranslationFromI18nKeyAndLabel('crm.investments.equity.reports.title', 'Reports')}
            <Badge className="gba:ml-2" variant="secondary">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-4">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-1/2"></div>
            <div className="gba:h-32 gba:bg-gray-200 gba:rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="equity-reports-card">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <FileText className="gba:h-5 gba:w-5 gba:text-gray-700" />
          {getTranslationFromI18nKeyAndLabel('crm.investments.equity.reports.title', 'Reports')}
          <Badge className="gba:ml-2" variant="secondary">{reports.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="gba:text-sm gba:text-gray-600" data-testid="equity-reports-empty">-</div>
        ) : (
          <div className="gba:divide-y gba:divide-gray-200">
            {/* map reports here when schema is ready */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquityReports;
