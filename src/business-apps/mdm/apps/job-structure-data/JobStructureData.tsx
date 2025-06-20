import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { RiOrganizationChart } from '@remixicon/react';
import { Tabs } from 'antd';
import { JobFamiliesTab } from './components/tabs/JobFamiliesTab';
import { JobLevelsTab } from './components/tabs/JobLevelsTab';
import { JobFunctionsTab } from './components/tabs/JobFunctionsTab';
import { JobProfilesTab } from './components/tabs/JobProfilesTab';

export enum JobStructureDataTabs {
  JOB_FAMILIES = 'job-families',
  JOB_LEVELS = 'job-levels',
  JOB_FUNCTIONS = 'job-functions',
  JOB_PROFILES = 'job-profiles'
}

export interface JobStructureDataProps extends BusinessAppContextProps {
  className?: string;
  prefixDataTestId?: string;
}

const DATA_TEST_ID = 'JobStructureData';

const JobStructureData: React.FC<JobStructureDataProps> = ({ 
  className, 
  prefixDataTestId,
  ...contextProps 
}) => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<JobStructureDataTabs>(JobStructureDataTabs.JOB_FAMILIES);

  useEffect(() => {
    const setTabFromUrl = () => {
      // Check URL query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      
      if (tabParam && Object.values(JobStructureDataTabs).includes(tabParam as JobStructureDataTabs)) {
        setSelectedTab(tabParam as JobStructureDataTabs);
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
    setSelectedTab(value as JobStructureDataTabs);
  };

  const tabItems = [
    {
      key: JobStructureDataTabs.JOB_FAMILIES,
      label: t('hr.job_families', 'Job Families'),
      children: (
        <JobFamiliesTab 
          {...contextProps}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      ),
    },
    {
      key: JobStructureDataTabs.JOB_LEVELS,
      label: t('hr.job_levels', 'Job Levels'),
      children: (
        <JobLevelsTab 
          {...contextProps}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      ),
    },
    {
      key: JobStructureDataTabs.JOB_FUNCTIONS,
      label: t('hr.job_functions', 'Job Functions'),
      children: (
        <JobFunctionsTab 
          {...contextProps}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      ),
    },
    {
      key: JobStructureDataTabs.JOB_PROFILES,
      label: t('hr.job_profiles', 'Job Profiles'),
      children: (
        <JobProfilesTab 
          {...contextProps}
          prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
        />
      ),
    },
  ];

  return (
    <PageLayout
      headerIcon={<RiOrganizationChart />}
      headerLabel={t('hr.job_structure_data', 'Job Structure Data')}
      className={className}
      contentContainer={
        <div className="w-full h-full" style={{ padding: '24px' }}>
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

export default JobStructureData;
export { JobStructureData }; 