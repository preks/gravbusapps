import React from 'react'
import { useTranslation } from 'react-i18next'
import { PiBriefcase, PiUser, PiBuilding, PiTag, PiCalendar } from 'react-icons/pi'
import { JobPosition } from '../hooks/useJobPositionListData'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface JobPositionDetailsProps {
  jobPosition: JobPosition
  accessToken: string
}

/**
 * JobPositionDetails component displays detailed information about a job position
 * in a sidebar format for the DataContainer details panel.
 */
export const JobPositionDetails: React.FC<JobPositionDetailsProps> = ({ jobPosition, accessToken }) => {
  const { t } = useTranslation()
  const userLocale = getCurrentActiveUserLocale() || 'en-US'

  // Helper function to get contract type display value
  const getContractTypeDisplay = (contractType: any): string => {
    if (!contractType) return t('job_position.not_specified', 'Not specified')

    const translation = contractType.translations?.find(
      (t: any) => t.localeCode?.toLowerCase() === userLocale.toLowerCase()
    )

    return (
      translation?.value || contractType.value || contractType.code || t('job_position.not_specified', 'Not specified')
    )
  }

  // Helper function to get employment type display value
  const getEmploymentTypeDisplay = (employmentType: any): string => {
    if (!employmentType) return t('job_position.not_specified', 'Not specified')

    const translation = employmentType.translations?.find(
      (t: any) => t.localeCode?.toLowerCase() === userLocale.toLowerCase()
    )

    return (
      translation?.value ||
      employmentType.value ||
      employmentType.code ||
      t('job_position.not_specified', 'Not specified')
    )
  }

  // Helper function to get job family display value
  const getJobFamilyDisplay = (jobFamily: any): string => {
    if (!jobFamily) return t('job_position.not_specified', 'Not specified')

    const translation = jobFamily.translations?.find(
      (t: any) => t.localeCode?.toLowerCase() === userLocale.toLowerCase()
    )

    return translation?.value || jobFamily.value || jobFamily.code || t('job_position.not_specified', 'Not specified')
  }

  // Helper function to get department name
  const getDepartmentName = (): string => {
    const orgUnit = jobPosition.organizationalUnitEmployees?.[0]?.organizationalUnit
    return orgUnit?.name || t('job_position.not_specified', 'Not specified')
  }

  // Helper function to get employee display
  const getEmployeeDisplay = (): string => {
    const employee = jobPosition.employeePositions?.[0]
    if (!employee) return t('job_position.vacant', 'Vacant')

    return `${employee.firstName} ${employee.lastName}`
  }

  // Check if position is vacant
  const isVacant = !jobPosition.employeePositions || jobPosition.employeePositions.length === 0

  return (
    <div className="gba:p-6 gba:space-y-6 gba:relative">
      {/* Action button in top right corner with absolute positioning */}
      {accessToken && (
        <div className="gba:absolute gba:top-4 gba:right-2" onClick={e => e.stopPropagation()}>
          <AppActionButton
            data-testid="job-position-details-action-button"
            contextsArray={[FlowContextName.jobPositionEntity]}
            externalContextData={{
              jobPositionId: jobPosition.id
            }}
            prefixDataTestId="job-position-details-action"
            accessToken={accessToken}
          >
            Actions
          </AppActionButton>
        </div>
      )}

      {/* Header */}
      <div className="gba:border-b gba:border-gray-200 gba:pb-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <PiBriefcase className="gba:text-primary gba:text-xl" />
          <div>
            <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900">{jobPosition.name}</h2>
            <p className="gba:text-sm gba:text-gray-500">{t('job_position.details_subtitle', 'Position Details')}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div
            className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-sm gba:font-medium ${
              isVacant ? 'gba:bg-orange-100 gba:text-orange-800' : 'gba:bg-green-100 gba:text-green-800'
            }`}
          >
            {isVacant ? t('job_position.vacant', 'Vacant') : t('job_position.filled', 'Filled')}
          </div>
        </div>
      </div>

      {/* Job Information */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-md gba:font-medium gba:text-gray-900">
          {t('job_position.job_information', 'Job Information')}
        </h3>

        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiTag className="gba:text-gray-400 gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                {t('job_position.job_profile', 'Job Profile')}
              </p>
              <p className="gba:text-sm gba:text-gray-900">
                {jobPosition.jobProfile?.name || t('job_position.not_specified', 'Not specified')}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiTag className="gba:text-gray-400 gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                {t('job_position.job_function', 'Job Function')}
              </p>
              <p className="gba:text-sm gba:text-gray-900">
                {jobPosition.jobFunction?.name || t('job_position.not_specified', 'Not specified')}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiTag className="gba:text-gray-400 gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                {t('job_position.job_level', 'Job Level')}
              </p>
              <p className="gba:text-sm gba:text-gray-900">
                {jobPosition.jobLevel?.name || t('job_position.not_specified', 'Not specified')}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiTag className="gba:text-gray-400 gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                {t('job_position.job_family', 'Job Family')}
              </p>
              <p className="gba:text-sm gba:text-gray-900">{getJobFamilyDisplay(jobPosition.jobFunction?.jobFamily)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-md gba:font-medium gba:text-gray-900">
          {t('job_position.employment_information', 'Employment Information')}
        </h3>

        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiCalendar className="gba:text-gray-400 gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                {t('job_position.employment_type', 'Employment Type')}
              </p>
              <p className="gba:text-sm gba:text-gray-900">{getEmploymentTypeDisplay(jobPosition.employmentType)}</p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiCalendar className="gba:text-gray-400 gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                {t('job_position.contract_type', 'Contract Type')}
              </p>
              <p className="gba:text-sm gba:text-gray-900">{getContractTypeDisplay(jobPosition.contractType)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Organizational Information */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-md gba:font-medium gba:text-gray-900">
          {t('job_position.organizational_information', 'Organizational Information')}
        </h3>

        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiBuilding className="gba:text-gray-400 gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                {t('job_position.department', 'Department')}
              </p>
              <p className="gba:text-sm gba:text-gray-900">{getDepartmentName()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Employee */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-md gba:font-medium gba:text-gray-900">
          {t('job_position.current_employee', 'Current Employee')}
        </h3>

        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiUser className="gba:text-gray-400 gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-gray-700">{t('job_position.employee', 'Employee')}</p>
              <p className="gba:text-sm gba:text-gray-900">{getEmployeeDisplay()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobPositionDetails
