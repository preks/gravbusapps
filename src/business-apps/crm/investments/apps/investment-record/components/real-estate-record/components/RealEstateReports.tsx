import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system';
import { FileText } from 'lucide-react';
import type { RealEstateInvestmentData } from '../types';

interface RealEstateReportsProps {
  realEstateData: RealEstateInvestmentData | null;
}

const RealEstateReports: React.FC<RealEstateReportsProps> = ({ realEstateData }) => {
  const reports = [] as Array<{ id: string }>; // Placeholder: no real-estate-specific investment reports yet
  return (
    <Card data-testid="real-estate-reports-card">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <FileText className="gba:h-5 gba:w-5 gba:text-gray-700" />
          Reports
          <Badge className="gba:ml-2" variant="secondary">{reports.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="gba:text-sm gba:text-gray-600" data-testid="real-estate-reports-empty">-</div>
        ) : (
          <div className="gba:divide-y gba:divide-gray-200">
            {/* map reports here when schema is ready */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealEstateReports;


