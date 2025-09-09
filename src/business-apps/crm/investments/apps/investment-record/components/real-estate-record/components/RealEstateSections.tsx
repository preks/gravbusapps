import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@newwork/nw-design-system';
import { Building2, Calendar, Eye, Target, TrendingUp } from 'lucide-react';
import { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';

interface RealEstateSectionsProps {
  realEstateData?: RealEstateInvestmentData | null;
  isLoading?: boolean;
  'data-testid'?: string;
}

const RealEstateSections: React.FC<RealEstateSectionsProps> = ({
  realEstateData,
  isLoading,
  'data-testid': dataTestId = 'real-estate-sections'
}) => {
  if (isLoading) {
    return (
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6" data-testid={dataTestId}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className={index === 4 ? "gba:lg:col-span-2" : ""}>
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
      id: 'about-real-estate',
      title: 'About the Real Estate',
      icon: Building2,
      content: [
        'xxx'
      ],
      fullWidth: false
    },
    {
      id: 'review-2024',
      title: 'Review 2024',
      icon: Calendar,
      content: [
        'xxx',
        'xxx'
      ],
      fullWidth: false
    },
    {
      id: 'outlook',
      title: 'Outlook',
      icon: Eye,
      content: [
        'xxx'
      ],
      fullWidth: false
    },
    {
      id: 'main-action-items-2025',
      title: 'Main Action Items 2025',
      icon: Target,
      content: [
        'xxx',
        'xxx'
      ],
      fullWidth: false
    },
    {
      id: 'investment-potential',
      title: 'Investment Potential',
      icon: TrendingUp,
      content: [
        'xxx'
      ],
      fullWidth: true
    }
  ];

  return (
    <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6" data-testid={dataTestId}>
      {sections.map((section) => {
        const IconComponent = section.icon;
        return (
          <Card 
            key={section.id} 
            className={section.fullWidth ? "gba:lg:col-span-2" : ""}
            data-testid={`${dataTestId}-${section.id}`}
          >
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                <IconComponent className="gba:h-5 gba:w-5 gba:text-green-600" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {section.content.map((item, index) => (
                  <div key={index} className="gba:flex gba:items-start gba:gap-2">
                    {section.content.length > 1 && (
                      <span className="gba:text-gray-400 gba:text-sm gba:mt-1">—</span>
                    )}
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

export default RealEstateSections;
