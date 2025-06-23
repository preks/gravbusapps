import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { RiMoneyDollarCircleLine } from '@remixicon/react';
import { Tabs } from 'antd';
import { PayGradesTab, CareerBandsTab, CompensationBandsTab } from './components/tabs';

export enum CompensationDataTabs {
  PAY_GRADES = 'pay-grades',
  CAREER_BANDS = 'career-bands',
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
  const [selectedTab, setSelectedTab] = useState<CompensationDataTabs>(CompensationDataTabs.PAY_GRADES);

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

  const tabItems = [
    {
      key: CompensationDataTabs.PAY_GRADES,
      label: t('hr.pay_grades', 'Pay Grades'),
      children: (
        <PayGradesTab 
          {...contextProps}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      ),
    },
    {
      key: CompensationDataTabs.CAREER_BANDS,
      label: t('hr.career_bands', 'Career Bands'),
      children: (
        <CareerBandsTab 
          {...contextProps}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      ),
    },
    {
      key: CompensationDataTabs.COMPENSATION_BANDS,
      label: t('hr.compensation_bands', 'Compensation Bands'),
      children: (
        <CompensationBandsTab 
          {...contextProps}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      ),
    },
  ];

  return (
    <PageLayout
      headerIcon={<RiMoneyDollarCircleLine />}
      headerLabel={t('hr.compensation_data', 'Compensation Data')}
      className={className}
      contentContainer={
        <div className="gba:w-full gba:h-full" style={{ padding: '24px' }}>
          <Tabs
            activeKey={selectedTab}
            onChange={onChangeTab}
            items={tabItems}
            data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
        </div>
      }
    />
  );
};

export default CompensationData;
export { CompensationData }; 