import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { RiFlowChart } from '@remixicon/react';
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

  return (
    <PageLayout
      headerIcon={<RiFlowChart />}
      headerLabel={t('crm.pipeline_data_management', 'Pipeline Data Management')}
      className={className}
      contentContainer={
        <div className="gba:w-full gba:h-full" style={{ padding: '24px' }}>
          <PipelineOverview 
            {...contextProps}
            prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
          />
        </div>
      }
    />
  );
};

export default PipelineData;
export { PipelineData }; 