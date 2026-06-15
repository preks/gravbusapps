import { useTranslation } from 'react-i18next'
import {
  UserGearIcon,
  CurrencyCircleDollarIcon,
  TreeStructureIcon,
  BuildingsIcon,
  TrashIcon,
  ClockIcon
} from '@phosphor-icons/react'
import { HrSettingsCardProps } from '../components/HrSettingsCard'

export function useHrSettingsCards(): HrSettingsCardProps[] {
  const { t } = useTranslation()

  return [
    {
      title: t('hr.employment_data', 'Employment Data'),
      description: t('hr.employment_data_description', 'Manage employment types and contract types master data'),
      icon: <UserGearIcon size={24} />,
      entries: [
        {
          label: t('hr.employment_types', 'Employment Types'),
          url: '/platform/mdm/employment-data?tab=employment-types'
        },
        {
          label: t('hr.contract_types', 'Contract Types'),
          url: '/platform/mdm/employment-data?tab=contract-types'
        }
      ]
    },
    {
      title: t('hr.compensation_data', 'Compensation Data'),
      description: t('hr.compensation_data_description', 'Manage compensation bands and salary structures'),
      icon: <CurrencyCircleDollarIcon size={24} />,
      entries: [
        {
          label: t('hr.pay_grades', 'Pay Grades'),
          url: '/platform/mdm/compensation-data?tab=pay-grades'
        },
        {
          label: t('hr.career_bands', 'Career Bands'),
          url: '/platform/mdm/compensation-data?tab=career-bands'
        },
        {
          label: t('hr.compensation_bands', 'Compensation Bands'),
          url: '/platform/mdm/compensation-data?tab=compensation-bands'
        }
      ]
    },
    {
      title: t('hr.job_structure_data', 'Job Structure Data'),
      description: t('hr.job_structure_data_description', 'Manage job families, level groups, functions, and profiles'),
      icon: <TreeStructureIcon size={24} />,
      entries: [
        {
          label: t('hr.job_families', 'Job Families'),
          url: '/platform/mdm/job-structure-data?tab=job-families'
        },
        {
          label: t('hr.job_levels', 'Job Levels'),
          url: '/platform/mdm/job-structure-data?tab=job-levels'
        },
        {
          label: t('hr.job_functions', 'Job Functions'),
          url: '/platform/mdm/job-structure-data?tab=job-functions'
        },
        {
          label: t('hr.job_profiles', 'Job Profiles'),
          url: '/platform/mdm/job-structure-data?tab=job-profiles'
        }
      ]
    },
    {
      title: t('hr.organizational_data', 'Organizational Data'),
      description: t(
        'hr.organizational_data_description',
        'Manage company information, projects, site locations, capabilities, cost centers, departments, and teams'
      ),
      icon: <BuildingsIcon size={24} />,
      entries: [
        {
          label: t('hr.companies', 'Companies'),
          url: '/platform/mdm/organizational-data?tab=companies'
        },
        {
          label: t('hr.projects', 'Projects'),
          url: '/platform/mdm/organizational-data?tab=projects'
        },
        {
          label: t('hr.site_locations', 'Site Locations'),
          url: '/platform/mdm/organizational-data?tab=site-locations'
        },
        {
          label: t('hr.capabilities', 'Capabilities'),
          url: '/platform/mdm/organizational-data?tab=capabilities'
        },
        {
          label: t('hr.cost_centers', 'Cost Centers'),
          url: '/platform/mdm/organizational-data?tab=cost-centers'
        },
        {
          label: t('hr.departments', 'Departments'),
          url: '/platform/mdm/organizational-data?tab=departments'
        },
        {
          label: t('hr.teams', 'Teams'),
          url: '/platform/mdm/organizational-data?tab=teams'
        }
      ]
    },
    {
      title: t('hr.position_management', 'Position Management'),
      description: t('hr.position_management_description', 'Manage job position lifecycle and terminations'),
      icon: <TrashIcon size={24} />,
      entries: [
        {
          label: t('hr.position_termination', 'Position Termination'),
          url: '/platform/hr/workforce-management?view=positions'
        }
      ]
    },
    {
      title: t('hr.time_attendance', 'Time Attendance'),
      description: t('hr.time_attendance_description', 'Manage time attendance and tracking'),
      icon: <ClockIcon size={24} />,
      entries: [
        {
          label: t('hr.time_types', 'Time Types'),
          url: '/platform/mdm/time-attendance?tab=time-types'
        }
      ]
    }
  ]
}
