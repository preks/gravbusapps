import React, { useCallback, useMemo } from 'react'
import { Department } from './types'
import { formatDataTestId } from '../../shims/formatDataTestId'
import { useSetupTranslation } from '../../useSetupTranslation'
import { useFormContext } from 'react-hook-form'
import PlatformShellLayout from './containers/PlatformShellLayout'
import { Brain, Network, Rocket } from 'lucide-react'
import { wizardSectionTheme } from './theme'
import { getSetupProgressItems, setupProgressStepIndex } from './progress-steps'

export interface SummaryStepProps {
  readonly onNext: () => void
  readonly onBack: () => void
}

const DATA_TEST_ID_PREFIX = 'SummaryStep'

function SummaryStep({ onNext, onBack }: SummaryStepProps) {
  const { t } = useSetupTranslation()
  const { getValues } = useFormContext()

  const formData = getValues()

  // Utility function to get properly translated department names
  const getTranslatedDepartmentName = useCallback(
    (departmentName: string | null | undefined): string => {
      let displayName = departmentName ?? ''

      // If input is null or empty, return empty string
      if (!displayName) return ''

      // If the name is actually a translation key (starts with 'departments.')
      if (displayName.startsWith('departments.')) {
        const keyPart = displayName.replace('departments.', '').replace(/\./g, '-').replace(/_/g, '-')
        return t(`departments-${keyPart}`)
      }

      // For non-translation keys, just format it nicely
      return displayName
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    },
    [t]
  )

  const selectedDept = useMemo(() => {
    return formData.departments?.find((dept: Department) => dept.id === formData.selectedDepartmentId)
  }, [formData.departments, formData.selectedDepartmentId])

  const getUserDepartmentText = useCallback(() => {
    if (formData.userPlacementMode === 'ceo') {
      return t('summary-enterprise-management')
    }

    if (formData.userPlacementMode === 'not_in_org') {
      return t('summary-not-in-org')
    }

    return selectedDept?.name ? getTranslatedDepartmentName(selectedDept.name) : t('summary-not-selected')
  }, [formData.userPlacementMode, selectedDept, t, getTranslatedDepartmentName])

  const handleFinalize = useCallback(() => {
    onNext()
  }, [onNext])

  const departmentsCount = useMemo(() => {
    return formData.selectedDepartments?.length || 0
  }, [formData.selectedDepartments])

  const capabilitiesCount = formData.selectedCapabilities?.length || 0
  const additionalEmployeesCount = formData.additionalEmployees?.length || 0
  const userName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim()

  return (
    <PlatformShellLayout
      backgroundColorIcon={wizardSectionTheme.summary.iconBackground}
      icon={<Rocket width={40} height={40} className="gba:text-[#2563EB]" />}
      title={t('summary-title')}
      description={t('summary-description')}
      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
      onNext={handleFinalize}
      onBack={onBack}
      currentStep={setupProgressStepIndex.summary}
      stepItems={getSetupProgressItems(t)}
      nextButtonText={t('summary-finalize-setup')}
      className="gba:w-full gba:max-w-[760px]"
    >
      <div
        className="gba:mb-12 gba:w-full gba:space-y-5"
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'summary-content')}
      >
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div
            className={`${wizardSectionTheme.departments.selectedBackground} gba:rounded-2xl gba:p-6`}
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'departments-card')}
          >
            <div className="gba:mb-6 gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-full gba:bg-white gba:shadow-sm">
              <Network className="gba:text-[#2563EB]" />
            </div>
            <div className={`gba:text-lg gba:font-semibold ${wizardSectionTheme.departments.titleText}`}>
              {t('summary-departments')}
            </div>
            <div
              className={`gba:mt-8 gba:text-[48px] gba:font-bold ${wizardSectionTheme.departments.titleText}`}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'departments-count')}
            >
              {departmentsCount}
            </div>
          </div>

          <div
            className={`${wizardSectionTheme.capabilities.selectedBackground} gba:rounded-2xl gba:p-6`}
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'capabilities-card')}
          >
            <div className="gba:mb-6 gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-full gba:bg-white gba:shadow-sm">
              <Brain width={24} height={24} className="gba:text-[#0F766E]" />
            </div>
            <div className={`gba:text-lg gba:font-semibold ${wizardSectionTheme.capabilities.titleText}`}>
              {t('summary-capabilities')}
            </div>
            <div
              className={`gba:mt-8 gba:text-[48px] gba:font-bold ${wizardSectionTheme.capabilities.titleText}`}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'capabilities-count')}
            >
              {capabilitiesCount}
            </div>
          </div>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div
            className="gba:rounded-2xl gba:border gba:border-[#E7E5E4] gba:bg-white gba:p-6 gba:shadow-sm"
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'company-section')}
          >
            <h2
              className="gba:text-xl gba:font-semibold gba:text-[#09090B]"
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'company-heading')}
            >
              {t('summary-company')}
            </h2>

            <div className="gba:mt-5 gba:space-y-4">
              <div>
                <div className="gba:mb-1 gba:text-sm gba:text-[#595959]">{t('summary-company-code')}</div>
                <div
                  className="gba:font-medium gba:truncate gba:overflow-hidden"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'company-code')}
                  title={formData.companyCode}
                >
                  {formData.companyCode}
                </div>
              </div>

              <div>
                <div className="gba:mb-1 gba:text-sm gba:text-[#595959]">{t('summary-company-name')}</div>
                <div
                  className="gba:font-medium gba:truncate gba:overflow-hidden"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'company-name')}
                  title={formData.companyName}
                >
                  {formData.companyName}
                </div>
              </div>
            </div>
          </div>

          <div
            className="gba:rounded-2xl gba:border gba:border-[#E7E5E4] gba:bg-white gba:p-6 gba:shadow-sm"
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'profile-section')}
          >
            <h2
              className="gba:text-xl gba:font-semibold gba:text-[#09090B]"
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'profile-heading')}
            >
              {t('summary-your-profile')}
            </h2>

            <div className="gba:mt-5 gba:space-y-4">
              <div>
                <div className="gba:mb-1 gba:text-sm gba:text-[#595959]">{t('summary-name')}</div>
                <div className="gba:font-medium" data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'user-name')}>
                  {userName || t('summary-not-in-org')}
                </div>
              </div>

              <div>
                <div className="gba:mb-1 gba:text-sm gba:text-[#595959]">{t('summary-job-position')}</div>
                <div
                  className="gba:font-medium gba:truncate gba:overflow-hidden"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'user-position')}
                  title={formData.jobPosition}
                >
                  {formData.jobPosition || t('summary-not-selected')}
                </div>
              </div>

              <div>
                <div className="gba:mb-1 gba:text-sm gba:text-[#595959]">{t('summary-department')}</div>
                <div className="gba:font-medium" data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'user-department')}>
                  {getUserDepartmentText()}
                </div>
              </div>

              <div>
                <div className="gba:mb-1 gba:text-sm gba:text-[#595959]">{t('summary-additional-employees')}</div>
                <div
                  className="gba:font-medium"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'additional-employees-count')}
                >
                  {additionalEmployeesCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlatformShellLayout>
  )
}

export default SummaryStep
