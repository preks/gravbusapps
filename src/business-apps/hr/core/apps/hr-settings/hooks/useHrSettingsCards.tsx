import { useTranslation } from 'react-i18next'
import { RiUserSettingsLine, RiMoneyDollarCircleLine, RiOrganizationChart, RiBuilding2Line } from '@remixicon/react'
import { HrSettingsCardProps } from '../components/HrSettingsCard'

export function useHrSettingsCards(): HrSettingsCardProps[] {
  const { t } = useTranslation()
  
  return [
    {
      title: t('hr.employment_data', 'Employment Data'),
      description: t('hr.employment_data_description', 'Manage employment types and contract types master data'),
      icon: <RiUserSettingsLine />,
      entries: [
        {
          label: t('hr.employment_types', 'Employment Types'),
          url: '/mdm/apps/employment-data?tab=employment-types'
        },
        {
          label: t('hr.contract_types', 'Contract Types'),
          url: '/mdm/apps/employment-data?tab=contract-types'
        }
      ]
    },
    {
      title: t('hr.compensation_data', 'Compensation Data'),
      description: t('hr.compensation_data_description', 'Manage compensation bands and salary structures'),
      icon: <RiMoneyDollarCircleLine />,
      entries: [
        {
          label: t('hr.compensation_bands', 'Compensation Bands'),
          url: '/mdm/apps/compensation-data?tab=compensation-bands'
        }
      ]
    },
    {
      title: t('hr.job_structure_data', 'Job Structure Data'),
      description: t('hr.job_structure_data_description', 'Manage job families, level groups, functions, and profiles'),
      icon: <RiOrganizationChart />,
      entries: [
        {
          label: t('hr.job_families', 'Job Families'),
          url: '/mdm/apps/job-structure-data?tab=job-families'
        },
        {
          label: t('hr.job_levels', 'Job Levels'),
          url: '/mdm/apps/job-structure-data?tab=job-levels'
        },
        {
          label: t('hr.job_functions', 'Job Functions'),
          url: '/mdm/apps/job-structure-data?tab=job-functions'
        },
        {
          label: t('hr.job_profiles', 'Job Profiles'),
          url: '/mdm/apps/job-structure-data?tab=job-profiles'
        }
      ]
    },
    {
      title: t('hr.organizational_data', 'Organizational Data'),
      description: t('hr.organizational_data_description', 'Manage company information, projects, and site locations'),
      icon: <RiBuilding2Line />,
      entries: [
        {
          label: t('hr.companies', 'Companies'),
          url: '/mdm/apps/organizational-data?tab=companies'
        },
        {
          label: t('hr.projects', 'Projects'),
          url: '/mdm/apps/organizational-data?tab=projects'
        },
        {
          label: t('hr.site_locations', 'Site Locations'),
          url: '/mdm/apps/organizational-data?tab=site-locations'
        }
      ]
    }
  ]
} 