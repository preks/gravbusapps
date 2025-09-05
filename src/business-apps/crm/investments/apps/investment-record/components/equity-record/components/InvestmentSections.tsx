import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@newwork/nw-design-system';
import { FileText, Target, TrendingUp } from 'lucide-react';
import { EquityInvestmentData } from '../hooks/useEquityRecordData';

interface InvestmentSectionsProps {
  equityData?: EquityInvestmentData | null;
  isLoading?: boolean;
  'data-testid'?: string;
}

const InvestmentSections: React.FC<InvestmentSectionsProps> = ({
  equityData,
  isLoading,
  'data-testid': dataTestId = 'investment-sections'
}) => {
  if (isLoading) {
    return (
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6" data-testid={dataTestId}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="gba:animate-pulse">
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="gba:animate-pulse gba:space-y-2">
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-5/6"></div>
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-4/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // For now, these are hardcoded sections as requested
  // In the future, these could be pulled from the database or additional properties
  const sections = [
    {
      id: 'overview',
      title: 'About the Investment',
      icon: FileText,
      content: [
        'Xxx',
        'xxx'
      ]
    },
    {
      id: 'motivation',
      title: 'Motivation',
      icon: Target,
      content: [
        'xxx',
        'xxx'
      ]
    },
    {
      id: 'current-topics',
      title: 'Current Topics & Outlook',
      icon: TrendingUp,
      content: [
        'xxx',
        'xxx'
      ]
    }
  ];

  return (
    <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6" data-testid={dataTestId}>
      {sections.map((section) => {
        const IconComponent = section.icon;
        return (
          <Card key={section.id} data-testid={`${dataTestId}-${section.id}`}>
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                <IconComponent className="gba:h-5 gba:w-5 gba:text-blue-600" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {section.content.map((item, index) => (
                  <div key={index} className="gba:flex gba:items-start gba:gap-2">
                    <span className="gba:text-gray-400 gba:text-sm gba:mt-1">-</span>
                    <p className="gba:text-sm gba:text-gray-700 gba:leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default InvestmentSections;
