import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TreeStructureIcon } from '@phosphor-icons/react'
import { Tabs, TabsList, TabsTrigger, TabsContent, Toaster } from '@newwork/nw-design-system'
import { JobFamiliesTab, JobLevelGroupDetails, JobFunctionsTab, JobProfilesTab } from './components/tabs'

export enum JobStructureDataTabs {
  JOB_FAMILIES = 'job-families',
  JOB_LEVELS = 'job-levels',
  JOB_FUNCTIONS = 'job-functions',
  JOB_PROFILES = 'job-profiles'
}

export interface JobStructureDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'JobStructureData'

// Helper function to get initial tab from URL
const getInitialTab = (): JobStructureDataTabs => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')

    if (tabParam && Object.values(JobStructureDataTabs).includes(tabParam as JobStructureDataTabs)) {
      return tabParam as JobStructureDataTabs
    }
  }
  return JobStructureDataTabs.JOB_FAMILIES
}

const JobStructureData: React.FC<JobStructureDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState<JobStructureDataTabs>(getInitialTab)

  useEffect(() => {
    const setTabFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')

      if (tabParam && Object.values(JobStructureDataTabs).includes(tabParam as JobStructureDataTabs)) {
        setSelectedTab(tabParam as JobStructureDataTabs)
      }
    }

    window.addEventListener('popstate', setTabFromUrl)
    return () => {
      window.removeEventListener('popstate', setTabFromUrl)
    }
  }, [])

  const onChangeTab = (value: string) => {
    // Update URL with query parameter
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    history.replaceState(null, '', url.toString())
    setSelectedTab(value as JobStructureDataTabs)
  }

  return (
    <PageLayout
      headerIcon={<TreeStructureIcon weight="duotone" color="var(--nw-decorative)" />}
      headerLabel={t('hr.job_structure_data', 'Job Structure Data')}
      className={`${className ? className : ''} gba:!overflow-y-visible`}
      contentContainer={
        <div className="no-scrollbar gba:w-full gba:h-full gba:overflow-y-auto gba:pb-8" style={{ padding: '24px' }}>
          <div data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}>
            <Tabs value={selectedTab} onValueChange={onChangeTab} className="gba:w-full">
              <TabsList className="gba:w-full">
                <TabsTrigger value={JobStructureDataTabs.JOB_FAMILIES}>
                  {t('hr.job_families', 'Job Families')}
                </TabsTrigger>
                <TabsTrigger value={JobStructureDataTabs.JOB_LEVELS}>{t('hr.job_levels', 'Job Levels')}</TabsTrigger>
                <TabsTrigger value={JobStructureDataTabs.JOB_FUNCTIONS}>
                  {t('hr.job_functions', 'Job Functions')}
                </TabsTrigger>
                <TabsTrigger value={JobStructureDataTabs.JOB_PROFILES}>
                  {t('hr.job_profiles', 'Job Profiles')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={JobStructureDataTabs.JOB_FAMILIES}>
                <JobFamiliesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
              </TabsContent>

              <TabsContent value={JobStructureDataTabs.JOB_LEVELS}>
                <JobLevelGroupDetails
                  {...contextProps}
                  prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
                />
              </TabsContent>

              <TabsContent value={JobStructureDataTabs.JOB_FUNCTIONS}>
                <JobFunctionsTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
              </TabsContent>

              <TabsContent value={JobStructureDataTabs.JOB_PROFILES}>
                <JobProfilesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
              </TabsContent>
            </Tabs>
          </div>
          <Toaster position="bottom-right" richColors />
        </div>
      }
    />
  )
}

export default JobStructureData
export { JobStructureData }
