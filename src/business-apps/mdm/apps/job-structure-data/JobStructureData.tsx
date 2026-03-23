import React from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TreeStructureIcon } from '@phosphor-icons/react'
import { Tabs, TabsList, TabsTrigger, TabsContent, Toaster } from '@newwork/nw-design-system'
import { JobFamiliesTab, JobLevelGroupDetails, JobFunctionsTab, JobProfilesTab } from './components/tabs'
import { useTabQueryParamSync } from '../../hooks/useTabQueryParamSync'

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

const JobStructureData: React.FC<JobStructureDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation()
  const [selectedTab, onChangeTab] = useTabQueryParamSync(JobStructureDataTabs, JobStructureDataTabs.JOB_FAMILIES)

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
