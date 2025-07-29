import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@newwork/nw-design-system';
import { Target, PieChart } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineOverview } from './components/PipelineOverview';

export interface PipelineDataProps extends BusinessAppContextProps {
  className?: string;
  prefixDataTestId?: string;
}

const DATA_TEST_ID = 'PipelineData';

const PipelineData: React.FC<PipelineDataProps> = ({ 
  className, 
  prefixDataTestId,
  ...contextProps 
}) => {
  const { t } = useTranslation();

  // Get sourceApp from URL params - required for this app to work
  const urlParams = new URLSearchParams(window.location.search);
  const sourceApp = urlParams.get('sourceApp') as 'CRM' | 'IRM' | null;

  // Validate sourceApp parameter
  useEffect(() => {
    if (!sourceApp || !['CRM', 'IRM'].includes(sourceApp)) {
      console.error('PipelineData requires sourceApp parameter (CRM or IRM)');
    }
  }, [sourceApp]);

  // Default to CRM if no valid sourceApp parameter
  const validSourceApp: 'CRM' | 'IRM' = sourceApp && ['CRM', 'IRM'].includes(sourceApp) ? sourceApp : 'CRM';

  // Determine title and icon based on sourceApp
  const getAppConfig = () => {
    switch (validSourceApp) {
      case 'IRM':
        return {
          title: t('crm.investment_pipeline_data_management', 'Investment Pipeline Data Management'),
          icon: <Target className="gba:w-6 gba:h-6" />
        };
      case 'CRM':
      default:
        return {
          title: t('crm.sales_pipeline_data_management', 'Sales Pipeline Data Management'),
          icon: <PieChart className="gba:w-6 gba:h-6" />
        };
    }
  };

  const { title, icon } = getAppConfig();

  return (
    <div 
      className={`gba:h-full gba:w-full ${className || ''}`}
      data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
    >
      <PageHeader
        title={title}
        icon={icon}
        className="gba:mb-6"
      />
      
      <div className="gba:w-full gba:h-full gba:px-6 gba:pb-6">
        <PipelineOverview 
          {...contextProps}
          sourceApp={validSourceApp}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      </div>
    </div>
  );
};

export default PipelineData;
export { PipelineData };
