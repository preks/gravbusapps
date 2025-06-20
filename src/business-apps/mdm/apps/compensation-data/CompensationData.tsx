import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { RiMoneyDollarCircleLine } from '@remixicon/react';
import { CompensationBandsTab } from './components/tabs/CompensationBandsTab';

export enum CompensationDataTabs {
  COMPENSATION_BANDS = 'compensation-bands'
}

export interface CompensationDataProps extends BusinessAppContextProps {
  className?: string;
  prefixDataTestId?: string;
}

const DATA_TEST_ID = 'CompensationData';

const CompensationData: React.FC<CompensationDataProps> = ({ 
  className, 
  prefixDataTestId,
  ...contextProps 
}) => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<CompensationDataTabs>(CompensationDataTabs.COMPENSATION_BANDS);

  useEffect(() => {
    const setTabFromUrl = () => {
      // Check URL query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      
      if (tabParam && Object.values(CompensationDataTabs).includes(tabParam as CompensationDataTabs)) {
        setSelectedTab(tabParam as CompensationDataTabs);
      }
    };

    setTabFromUrl();
    window.addEventListener('popstate', setTabFromUrl);
    return () => {
      window.removeEventListener('popstate', setTabFromUrl);
    };
  }, []);

  const onChangeTab = (value: string) => {
    // Update URL with query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    history.replaceState(null, '', url.toString());
    setSelectedTab(value as CompensationDataTabs);
  };

  return (
    <PageLayout
      headerIcon={<RiMoneyDollarCircleLine />}
      headerLabel={t('hr.compensation_data', 'Compensation Data')}
      className={className}
      contentContainer={
        <div className="w-full h-full">
          <CompensationBandsTab 
            {...contextProps}
            prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
          />
        </div>
      }
    />
  );
};

export default CompensationData;
export { CompensationData }; 