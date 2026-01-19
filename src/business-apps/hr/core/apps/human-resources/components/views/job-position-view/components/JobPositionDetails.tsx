import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { PiBriefcase, PiUser, PiBuilding, PiTag, PiCalendar } from 'react-icons/pi'
import { JobPosition } from '../hooks/useJobPositionListData'
import { getTranslationFromI18nKeyAndLabel, formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import jobPositionTranslations from '../_i18n'

interface JobPositionDetailsProps {
  jobPosition: JobPosition
  accessToken: string
}

/**
 * JobPositionDetails component displays detailed information about a job position
 * in a sidebar format for the DataContainer details panel.
 */
export const JobPositionDetails: React.FC<JobPositionDetailsProps> = ({ jobPosition, accessToken }) => {
  const { t } = useTranslation(jobPositionTranslations)

  // Helper function to get contract type display value
  const getContractTypeDisplay = (contractType: any): string => {
    const v = getCatalogValue(contractType)
    return (
      v ||
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.job_positions_section.not_specified',
        'Not specified'
      )
    )
  }

  // Helper function to get employment type display value
  const getEmploymentTypeDisplay = (employmentType: any): string => {
    const v = getCatalogValue(employmentType)
    return (
      v ||
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.job_positions_section.not_specified',
        'Not specified'
      )
    )
  }

  // Helper function to get job family display value
  const getJobFamilyDisplay = (jobFamily: any): string => {
    const v = getCatalogValue(jobFamily)
    return (
      v ||
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.job_positions_section.not_specified',
        'Not specified'
      )
    )
  }

  // Helper function to get department name
  const getDepartmentName = (): string => {
    const orgUnit = jobPosition.organizationalUnitEmployees?.[0]?.organizationalUnit
    return (
      orgUnit?.name ||
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:human_resources_page.job_positions_section.not_specified',
        'Not specified'
      )
    )
  }

  // Helper function to get employee display
  const getEmployeeDisplay = (): string => {
    const employee = jobPosition.employeePositions?.[0]
    if (!employee)
      return getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.job_positions_section.vacant', 'Vacant')

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
            disabled={Boolean(jobPosition.activeTo)}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employees_section.actions', 'Actions')}
          </AppActionButton>
        </div>
      )}

      {/* Header */}
      <div className="gba:border-b gba:border-border gba:pb-4">
        <div className="gba:flex gba:items-center gba:gap-3 gba:pr-30">
          <PiBriefcase className="gba:text-primary gba:text-xl" />
          <div className="gba:flex-1 gba:min-w-0">
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:whitespace-normal gba:break-words">
              {jobPosition.name}
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground gba:whitespace-normal gba:break-words">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.job_positions_section.position_details',
                'Position Details'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div
            className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-sm gba:font-medium ${
              isVacant
                ? 'gba:bg-warning-secondary/50 gba:text-warning-secondary-foreground'
                : 'gba:bg-success-secondary gba:text-success-secondary-foreground'
            }`}
          >
            {isVacant
              ? getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.job_positions_section.vacant',
                  'Vacant'
                )
              : getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.job_positions_section.filled',
                  'Filled'
                )}
          </div>
        </div>
      </div>

      {/* Job Information */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-md gba:font-medium gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:human_resources_page.job_positions_section.job_information',
            'Job Information'
          )}
        </h3>

        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiTag className="gba:text-muted-foreground gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.job_positions_section.job_profile',
                  'Job Profile'
                )}
              </p>
              <p className="gba:text-sm gba:text-foreground">
                {jobPosition.jobProfile?.name ||
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.not_specified',
                    'Not specified'
                  )}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiTag className="gba:text-muted-foreground gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.job_positions_section.job_function',
                  'Job Function'
                )}
              </p>
              <p className="gba:text-sm gba:text-foreground">
                {jobPosition.jobFunction?.name || t('hr-positions-not-specified')}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiTag className="gba:text-muted-foreground gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.job_positions_section.job_level',
                  'Job Level'
                )}
              </p>
              <p className="gba:text-sm gba:text-foreground">
                {jobPosition.jobLevel?.name ||
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.not_specified',
                    'Not specified'
                  )}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiTag className="gba:text-muted-foreground gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.job_positions_section.job_family',
                  'Job Family'
                )}
              </p>
              <p className="gba:text-sm gba:text-foreground">
                {getJobFamilyDisplay(jobPosition.jobFunction?.jobFamily)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-md gba:font-medium gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:human_resources_page.job_positions_section.employment_information',
            'Employment Information'
          )}
        </h3>

        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiCalendar className="gba:text-muted-foreground gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.employees_section.employment_type',
                  'Employment Type'
                )}
              </p>
              <p className="gba:text-sm gba:text-foreground">{getEmploymentTypeDisplay(jobPosition.employmentType)}</p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiCalendar className="gba:text-muted-foreground gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.employees_section.contract_type',
                  'Contract Type'
                )}
              </p>
              <p className="gba:text-sm gba:text-foreground">{getContractTypeDisplay(jobPosition.contractType)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Organizational Information */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-md gba:font-medium gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:human_resources_page.job_positions_section.organizational_information',
            'Organizational Information'
          )}
        </h3>

        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiBuilding className="gba:text-muted-foreground gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.job_positions_section.department',
                  'Department'
                )}
              </p>
              <p className="gba:text-sm gba:text-foreground">{getDepartmentName()}</p>
            </div>
          </div>

          {/* Manager under Organizational Information */}
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiUser className="gba:text-muted-foreground gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.job_positions_section.manager',
                  'Manager'
                )}
              </p>
              <p className="gba:text-sm gba:text-foreground">
                {(() => {
                  const sup = jobPosition.employeePositions?.[0]?.supervisor
                  if (!sup)
                    return getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.not_specified',
                      'Not specified'
                    )
                  return `${sup.firstName} ${sup.lastName}`
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Employee */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-md gba:font-medium gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:human_resources_page.job_positions_section.current_employee',
            'Current Employee'
          )}
        </h3>

        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiUser className="gba:text-muted-foreground gba:mt-1" />
            <div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.job_positions_section.employee',
                  'Employee'
                )}
              </p>
              <p className="gba:text-sm gba:text-foreground">{getEmployeeDisplay()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Termination Date (optional) */}
      {Boolean(jobPosition.activeTo) && (
        <div className="gba:space-y-4">
          <h3 className="gba:text-md gba:font-medium gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.termination_date', 'Termination Date')}
            <span className="gba:ml-2 gba:text-foreground">
              {formatDate(jobPosition.activeTo as string, 'date.long')}
            </span>
          </h3>
        </div>
      )}
    </div>
  )
}

export default JobPositionDetails
