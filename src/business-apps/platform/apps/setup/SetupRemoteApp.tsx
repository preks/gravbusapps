'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Spinner } from '@newwork/nw-design-system'

import {
  AdditionalEmployeesStep,
  CapabilitiesSelectionStep,
  CompanySetupStep,
  DepartmentSelectionStep,
  SummaryStep,
  WelcomeStep,
  YourDepartmentStep
} from './lib/components/setup-wizard'

import type { FormData } from './lib/types'
import { createEnterprisePresetState } from './lib/data'
import { useValidationSchema, type ValidationSchemaType } from './lib/schemas/validation-schema'
import { navigateToSameOriginOrRoot } from '@/common/utils/safeUrlUtils'
import { fetchActiveStructureBootstrap, submitSetupRemote } from './setupApiRemote'
import { useSetupTranslation } from './lib/useSetupTranslation'

const DATA_TEST_ID_PREFIX = 'OrgChartSetup'

const defaultFormValues: FormData = {
  companyCode: '',
  companyName: '',
  companyDescription: null,
  firstName: null,
  lastName: null,
  jobPosition: '',
  userPlacementMode: null,
  selectedDepartmentId: null,
  selectedDepartmentName: null,
  customDepartmentName: null,
  departments: [],
  selectedDepartments: [],
  capabilities: [],
  departmentCapabilities: {},
  selectedCapabilities: [],
  additionalEmployees: []
}

export type SetupRemoteAppViewProps = {
  accessToken?: string
  userInfo?: {
    email?: string
    givenName?: string
    familyName?: string
  }
  additionalData?: Record<string, unknown>
}

function SetupRemoteAppInner({ accessToken, userInfo }: SetupRemoteAppViewProps) {
  const { t } = useSetupTranslation()
  const [step, setStep] = useState(1)
  const [hideHeader] = useState(true)
  const [isManualLoading, setIsManualLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [finalizeFailed, setFinalizeFailed] = useState(false)
  const [activeStructureBlocked, setActiveStructureBlocked] = useState(false)
  const [isCheckingStructure, setIsCheckingStructure] = useState(true)

  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const isGuardOverridden = searchParams.get('forceSetup') === 'true'

  const validationSchemaWithTranslations = useValidationSchema()

  const methods = useForm<FormData & ValidationSchemaType>({
    resolver: zodResolver(validationSchemaWithTranslations) as Resolver<FormData & ValidationSchemaType>,
    defaultValues: {
      ...defaultFormValues,
      firstName: userInfo?.givenName ?? null,
      lastName: userInfo?.familyName ?? null
    }
  })

  const { handleSubmit, setValue, getValues, trigger } = methods

  useEffect(() => {
    if (userInfo?.givenName) setValue('firstName', userInfo.givenName)
    if (userInfo?.familyName) setValue('lastName', userInfo.familyName)
  }, [userInfo?.givenName, userInfo?.familyName, setValue])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (isGuardOverridden) {
        setIsCheckingStructure(false)
        setActiveStructureBlocked(false)
        return
      }
      try {
        if (!accessToken) {
          setIsCheckingStructure(false)
          return
        }
        const bootstrap = await fetchActiveStructureBootstrap(accessToken)
        if (cancelled) return
        if (bootstrap.hasActiveStructure && bootstrap.structureId) {
          setActiveStructureBlocked(true)
        }
      } catch {
        if (!cancelled) {
          setIsCheckingStructure(false)
        }
        return
      }
      if (!cancelled) {
        setIsCheckingStructure(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [accessToken, isGuardOverridden])

  const initializePresetState = useCallback(() => {
    const formValues = getValues()

    if ((formValues.departments?.length ?? 0) > 0 && (formValues.capabilities?.length ?? 0) > 0) {
      return
    }

    const presetState = createEnterprisePresetState()

    setValue('departments', presetState.departments)
    setValue('selectedDepartments', presetState.selectedDepartments)
    setValue('selectedDepartmentId', null)
    setValue('selectedDepartmentName', null)
    setValue('capabilities', presetState.capabilities)
    setValue('departmentCapabilities', presetState.departmentCapabilities)
    setValue('selectedCapabilities', presetState.selectedCapabilities)
  }, [getValues, setValue])

  const validateAllSteps = useCallback((): boolean => {
    const formValues = getValues()
    if (!formValues.companyCode?.trim() || !formValues.companyName?.trim() || !formValues.userPlacementMode) {
      return false
    }

    if (formValues.userPlacementMode === 'not_in_org') {
      return true
    }

    const employees = formValues.additionalEmployees ?? []
    const managerCountByDept = new Map<string, number>()
    for (const employee of employees) {
      if (employee.isManager && employee.departmentId) {
        managerCountByDept.set(employee.departmentId, (managerCountByDept.get(employee.departmentId) ?? 0) + 1)
      }
    }
    if ([...managerCountByDept.values()].some(count => count > 1)) {
      return false
    }

    const hasName = Boolean(formValues.firstName?.trim() && formValues.lastName?.trim())

    if (formValues.userPlacementMode === 'ceo') {
      return hasName
    }

    if (formValues.userPlacementMode === 'existing_department') {
      const hasCurrentUserDetails = Boolean(hasName && formValues.jobPosition?.trim())
      return Boolean(formValues.selectedDepartmentId && hasCurrentUserDetails)
    }

    return false
  }, [getValues])

  const handleFinalize = useCallback(async () => {
    if (!validateAllSteps()) return

    try {
      setFinalizeFailed(false)
      setIsManualLoading(true)
      const formValues = getValues()
      const result = await submitSetupRemote(
        formValues,
        {
          email: userInfo?.email ?? null,
          givenName: userInfo?.givenName ?? null,
          familyName: userInfo?.familyName ?? null
        },
        accessToken,
        isGuardOverridden
      )

      setIsManualLoading(false)
      setIsRedirecting(true)
      setStep(7)

      navigateToSameOriginOrRoot(result.redirectUrl)
    } catch (error) {
      setIsManualLoading(false)
      setFinalizeFailed(true)
      // eslint-disable-next-line no-console -- surface setup failures in dev / support
      console.error('Setup process failed:', error)
    }
  }, [
    accessToken,
    getValues,
    isGuardOverridden,
    userInfo?.email,
    userInfo?.familyName,
    userInfo?.givenName,
    validateAllSteps
  ])

  const handleNext = useCallback(() => {
    setStep(prev => prev + 1)
  }, [])

  const handleBack = useCallback(() => {
    setStep(prev => prev - 1)
  }, [])

  const isProcessing = useMemo(() => isManualLoading || isRedirecting, [isManualLoading, isRedirecting])

  useEffect(() => {
    const navigationMenu = document.querySelector('[data-testid="NavigationMenu-container"]') as HTMLElement
    const header = document.querySelector('header') as HTMLElement

    if (hideHeader) {
      document.body.classList.add('display-none')
      if (navigationMenu) navigationMenu.style.display = 'none'
      if (header) header.style.display = 'none'
    } else {
      document.body.classList.remove('overflow-hidden')
      if (navigationMenu) navigationMenu.style.display = ''
      if (header) header.style.display = ''
    }

    return () => {
      document.body.classList.remove('overflow-hidden')
      if (navigationMenu) navigationMenu.style.display = ''
      if (header) header.style.display = ''
    }
  }, [hideHeader])

  const formatDataTestId = useMemo(() => (prefix: string, suffix: string) => `${prefix}-${suffix}`, [])

  if (isCheckingStructure && !isRedirecting && !isManualLoading) {
    return (
      <div className="gba:flex gba:min-h-screen gba:items-center gba:justify-center gba:bg-white">
        <Spinner size="xl" />
      </div>
    )
  }

  if (activeStructureBlocked && !isGuardOverridden && !isRedirecting && !isManualLoading) {
    return (
      <div className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:bg-white gba:px-6">
        <div className="gba:w-full gba:max-w-lg gba:rounded-xl gba:border gba:border-gray-200 gba:bg-white gba:p-8 gba:text-center gba:shadow-sm">
          <h1 className="gba:mb-3 gba:text-2xl gba:font-semibold gba:text-[#09090B]">{t('setup-guard-title')}</h1>
          <p className="gba:mb-6 gba:text-gray-600">{t('setup-guard-message')}</p>
          <button
            className="gba:rounded-md gba:bg-[#162455] gba:px-4 gba:py-2 gba:text-white"
            type="button"
            onClick={() => {
              window.location.assign('/platform')
            }}
            data-testid={`${DATA_TEST_ID_PREFIX}-guard-back-home`}
          >
            {t('setup-guard-back-home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:relative gba:min-h-screen" data-testid={`${DATA_TEST_ID_PREFIX}-root`}>
      {step === 1 && (
        <div className="gba:fixed gba:inset-0 gba:z-50 gba:overflow-auto">
          <WelcomeStep onNext={handleNext} data-testid={`${DATA_TEST_ID_PREFIX}-welcome-step`} />
        </div>
      )}

      {step > 1 && step < 8 && (
        <div className="gba:fixed gba:inset-0 gba:z-50 gba:overflow-auto">
          <FormProvider {...methods}>
            {isProcessing ? (
              <div className="gba:min-h-screen gba:flex gba:flex-col gba:items-center gba:justify-center">
                <div
                  className="gba:bg-white gba:p-8 gba:rounded-lg gba:shadow-md gba:max-w-md gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center"
                  data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
                >
                  <h3
                    className="gba:text-lg gba:font-medium gba:mb-2"
                    data-testid={`${DATA_TEST_ID_PREFIX}-loading-title`}
                  >
                    {isRedirecting ? t('completion-title') : t('loading-title')}
                  </h3>
                  <p
                    className="gba:text-center gba:text-gray-600"
                    data-testid={`${DATA_TEST_ID_PREFIX}-loading-message`}
                  >
                    {isRedirecting ? t('completion-message') : t('loading-message')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {step === 2 && (
                  <CompanySetupStep<FormData & ValidationSchemaType>
                    onNext={() => {
                      const companySetupFields = ['companyCode', 'companyName']
                      void trigger(companySetupFields as never).then(formIsValid => {
                        if (formIsValid) {
                          initializePresetState()
                          setStep(3)
                        }
                      })
                    }}
                    onBack={handleBack}
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'company-setup-step')}
                  />
                )}
                {step === 3 && (
                  <DepartmentSelectionStep<FormData & ValidationSchemaType>
                    onNext={() => {
                      setStep(4)
                    }}
                    onBack={handleBack}
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'department-selection-step')}
                  />
                )}
                {step === 4 && (
                  <YourDepartmentStep<FormData & ValidationSchemaType>
                    onNext={() => {
                      handleSubmit(() => {
                        setStep(5)
                      })()
                    }}
                    onBack={handleBack}
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'your-department-step')}
                  />
                )}
                {step === 5 && (
                  <CapabilitiesSelectionStep
                    onNext={() => setStep(6)}
                    onBack={handleBack}
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'capabilities-selection-step')}
                  />
                )}
                {step === 6 && (
                  <AdditionalEmployeesStep accessToken={accessToken} onNext={() => setStep(7)} onBack={handleBack} />
                )}
                {step === 7 && (
                  <>
                    {finalizeFailed ? (
                      <div
                        role="alert"
                        className="gba:mb-4 gba:rounded-md gba:border gba:border-red-200 gba:bg-red-50 gba:px-4 gba:py-3 gba:text-sm gba:text-red-800"
                        data-testid={`${DATA_TEST_ID_PREFIX}-finalize-error`}
                      >
                        <p className="gba:font-medium">{t('errors-finalize-failed-title')}</p>
                        <p className="gba:mt-1 gba:text-red-800/90">{t('errors-finalize-unknown')}</p>
                      </div>
                    ) : null}
                    <SummaryStep
                      onNext={handleFinalize}
                      onBack={handleBack}
                      data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'summary-step')}
                    />
                  </>
                )}
              </>
            )}
          </FormProvider>
        </div>
      )}
    </div>
  )
}

function SetupRemoteApp(props: SetupRemoteAppViewProps) {
  return <SetupRemoteAppInner {...props} />
}

export default SetupRemoteApp
