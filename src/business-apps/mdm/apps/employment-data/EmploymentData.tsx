import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs } from '@newwork/gravity-ui-catalog';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { RiBriefcaseLine } from '@remixicon/react';
import { EmploymentTypesTab } from './components/tabs/EmploymentTypesTab';
import { ContractTypesTab } from './components/tabs/ContractTypesTab';

export enum EmploymentDataTabs {
  EMPLOYMENT_TYPES = 'employment-types',
  CONTRACT_TYPES = 'contract-types'
}

export interface EmploymentDataProps extends BusinessAppContextProps {
  className?: string;
  prefixDataTestId?: string;
}

const DATA_TEST_ID = 'EmploymentData';

const EmploymentData: React.FC<EmploymentDataProps> = ({ 
  className, 
  prefixDataTestId,
  ...contextProps 
}) => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<EmploymentDataTabs>(EmploymentDataTabs.EMPLOYMENT_TYPES);

  useEffect(() => {
    const setTabFromUrl = () => {
      // Check URL query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      
      if (tabParam && Object.values(EmploymentDataTabs).includes(tabParam as EmploymentDataTabs)) {
        setSelectedTab(tabParam as EmploymentDataTabs);
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
    setSelectedTab(value as EmploymentDataTabs);
  };

  const tabItems = [
    {
      key: EmploymentDataTabs.EMPLOYMENT_TYPES,
      label: t('hr.employment_types', 'Employment Types'),
      children: (
        <EmploymentTypesTab 
          {...contextProps}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      )
    },
    {
      key: EmploymentDataTabs.CONTRACT_TYPES,
      label: t('hr.contract_types', 'Contract Types'),
      children: (
        <ContractTypesTab 
          {...contextProps}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      )
    }
  ];

  return (
    <PageLayout
      headerIcon={<RiBriefcaseLine />}
      headerLabel={t('hr.employment_data', 'Employment Data')}
      className={className}
      pageController={
        <Tabs
          activeKey={selectedTab}
          onChange={onChangeTab}
          items={tabItems.map(item => ({ key: item.key, label: item.label }))}
          className="w-full"
          data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}
        />
      }
      contentContainer={
        <div className="w-full h-full">
          {tabItems.find(item => item.key === selectedTab)?.children}
        </div>
      }
    />
  );
};

export default EmploymentData;
export { EmploymentData }; 