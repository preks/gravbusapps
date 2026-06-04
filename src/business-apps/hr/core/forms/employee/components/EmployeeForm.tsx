import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEmployeeContext } from '../context/EmployeeContext'
import { useDelayedBoolean } from '../hooks/useDelayedBoolean'
import {
  Button,
  Input,
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Combobox,
  FormControl,
  FormField,
  FormFieldGroup,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
  WizardForm,
  WizardFormStep,
  useWizard,
  useTranslation
} from '@newwork/nw-design-system'
import type { WizardStep } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import CreateJobPositionModal from './CreateJobPositionModal'
import translations from '../../_i18n'

const createEmployeeFormSchema = (t: (key: string) => string) =>
  z.object({
    legalEntityId: z.string().min(1, t('employee-form-required-legal-entity')),
    siteLocationId: z.string().min(1, t('employee-form-required-site-location')),
    costCenterId: z.string().optional().default(''),
    firstName: z.string().min(1, t('employee-form-required-first-name')),
    lastName: z.string().min(1, t('employee-form-required-last-name')),
    email: z.string().min(1, t('employee-form-required-email')).email(t('employee-form-email-invalid')),
    preferredName: z.string().optional().default(''),
    organizationalUnitId: z.string().min(1, t('employee-form-required-org-unit')),
    jobPositionId: z.string().min(1, t('employee-form-required-job-position')),
    hireDate: z.string().min(1, t('employee-form-required-hire-date')),
    employmentTypeId: z.string().min(1, t('employee-form-required-employment-type')),
    contractTypeId: z.string().min(1, t('employee-form-required-contract-type')),
    fixedTermUntil: z.string().optional().default(''),
    fixedTermReason: z.string().optional().default('')
  })

type EmployeeFormData = z.infer<ReturnType<typeof createEmployeeFormSchema>>

function RequiredFormLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel>
      <span className="gba:text-foreground">{children}</span>
    </FormLabel>
  )
}

function hasEmptyRequiredField(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length === 0 : value == null
}

type EmployeeWizardNavigationForm = {
  watch: (names: Array<FieldPath<EmployeeFormData>>) => unknown[]
  trigger: (
    names?: FieldPath<EmployeeFormData> | Array<FieldPath<EmployeeFormData>>,
    options?: { shouldFocus?: boolean }
  ) => Promise<boolean>
}

function WizardNavigation({
  form,
  steps,
  submitDisabled,
  submitLabel
}: {
  form: EmployeeWizardNavigationForm
  steps: WizardStep<EmployeeFormData>[]
  submitDisabled: boolean
  submitLabel: string
}) {
  const { t } = useTranslation(translations)
  const { currentStep, isLastStep, isFirstStep, nextStep, previousStep } = useWizard()
  const currentFields = steps[currentStep]?.fields ?? []
  const currentValues = form.watch(currentFields)
  const isNextDisabled = currentValues.some(hasEmptyRequiredField)

  const handleNext = useCallback(async () => {
    const isValid = await form.trigger(currentFields, { shouldFocus: true })
    if (isValid) {
      nextStep()
    }
  }, [currentFields, form, nextStep])

  return (
    <div className="gba:flex gba:gap-3 gba:pt-4">
      {!isFirstStep && (
        <Button type="button" variant="outline" onClick={previousStep} className="gba:flex-1">
          {t('employee-form-back')}
        </Button>
      )}
      {!isLastStep && (
        <Button type="button" variant="default" onClick={handleNext} className="gba:flex-1" disabled={isNextDisabled}>
          {t('employee-form-next')}
        </Button>
      )}
      {isLastStep && (
        <Button type="submit" variant="default" className="gba:flex-1" disabled={submitDisabled}>
          {submitLabel}
        </Button>
      )}
    </div>
  )
}

const EmployeeForm: React.FC = () => {
  const { t } = useTranslation(translations)
  const {
    formValues,
    setFormValues,
    organizationalUnits,
    jobPositions,
    allJobPositions,
    employmentTypes,
    contractTypes,
    legalEntities,
    siteLocations,
    costCenters,
    loading,
    error,
    submit,
    isEdit,
    accessToken,
    structureId,
    legalEntitiesLoading,
    searchLegalEntities,
    loadMoreLegalEntities,
    hasMoreLegalEntities,
    siteLocationsLoading,
    searchSiteLocations,
    loadMoreSiteLocations,
    hasMoreSiteLocations,
    costCentersLoading,
    searchCostCenters,
    loadMoreCostCenters,
    hasMoreCostCenters,
    organizationalUnitsLoading,
    loadMoreOrganizationalUnits,
    hasMoreOrganizationalUnits,
    searchOrganizationalUnits,
    refetchJobPositions,
    jobPositionsError,
    jobPositionsLoading,
    jobPositionsInitialLoadDone,
    loadMoreJobPositions,
    hasMoreJobPositions,
    searchJobPositions,
    employmentTypesLoading,
    contractTypesLoading
  } = useEmployeeContext()

  const [isCreateJobPositionModalOpen, setIsCreateJobPositionModalOpen] = useState(false)
  const [isProcessPending, setIsProcessPending] = useState(false)

  const employeeFormSchema = useMemo(() => createEmployeeFormSchema(t), [t])

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      legalEntityId: formValues.legalEntityId || '',
      siteLocationId: formValues.siteLocationId || '',
      costCenterId: formValues.costCenterId || '',
      firstName: formValues.firstName || '',
      lastName: formValues.lastName || '',
      email: formValues.email || '',
      preferredName: formValues.preferredName || '',
      organizationalUnitId: formValues.organizationalUnitId || '',
      jobPositionId: formValues.jobPositionId || '',
      hireDate: formValues.hireDate || '',
      employmentTypeId: formValues.employmentTypeId || '',
      contractTypeId: formValues.contractTypeId || '',
      fixedTermUntil: formValues.fixedTermUntil || '',
      fixedTermReason: formValues.fixedTermReason || ''
    },
    mode: 'onTouched'
  })

  // Sync react-hook-form → context whenever form values change
  useEffect(() => {
    const subscription = form.watch(values => {
      setFormValues(values as Partial<typeof formValues>)
    })
    return () => subscription.unsubscribe()
  }, [form, setFormValues])

  // Sync context → react-hook-form when context updates externally (auto-fill from job position)
  useEffect(() => {
    const currentValues = form.getValues()
    const fieldsToSync: Array<keyof EmployeeFormData> = [
      'organizationalUnitId',
      'jobPositionId',
      'employmentTypeId',
      'contractTypeId',
      'siteLocationId'
    ]
    for (const field of fieldsToSync) {
      if (formValues[field] !== currentValues[field]) {
        form.setValue(field, formValues[field] || '', { shouldValidate: true })
      }
    }
  }, [
    formValues.organizationalUnitId,
    formValues.jobPositionId,
    formValues.employmentTypeId,
    formValues.contractTypeId,
    formValues.siteLocationId,
    form
  ])

  const showOrgUnitsLoading = useDelayedBoolean(organizationalUnitsLoading, 300)
  const showJobPositionsLoading = useDelayedBoolean(jobPositionsLoading, 300)
  const showLegalEntitiesLoading = useDelayedBoolean(legalEntitiesLoading, 300)
  const showSiteLocationsLoading = useDelayedBoolean(siteLocationsLoading, 300)
  const showCostCentersLoading = useDelayedBoolean(costCentersLoading, 300)

  const selectedOrgUnit = organizationalUnits.find(unit => unit.id === formValues.organizationalUnitId)
  const selectedOrgUnitName = selectedOrgUnit?.name || ''

  const legalEntityOptions = useMemo(() => legalEntities.map(le => ({ value: le.id, label: le.name })), [legalEntities])
  const siteLocationOptions = useMemo(
    () => siteLocations.map(sl => ({ value: sl.id, label: sl.name })),
    [siteLocations]
  )
  const costCenterOptions = useMemo(() => costCenters.map(cc => ({ value: cc.id, label: cc.name })), [costCenters])
  const organizationalUnitOptions = useMemo(
    () => organizationalUnits.map(unit => ({ value: unit.id, label: unit.name })),
    [organizationalUnits]
  )
  const jobPositionOptions = useMemo(
    () => jobPositions.map(position => ({ value: position.id, label: position.name })).filter(Boolean),
    [jobPositions]
  )

  const jobPositionEmptyText = (() => {
    if (formValues.organizationalUnitId) {
      if (jobPositionsLoading) return t('loading')
      return t('employee-form-no-positions')
    }
    return t('employee-form-select-org-unit-first')
  })()

  const handleLegalEntityChange = useCallback(
    (value: string) => {
      if (value !== formValues.legalEntityId) {
        form.setValue('legalEntityId', value ?? '', { shouldValidate: true })
        form.setValue('siteLocationId', '', { shouldValidate: true })
        setFormValues({ legalEntityId: value ?? '', siteLocationId: '' })
      }
    },
    [formValues.legalEntityId, form, setFormValues]
  )

  const handleJobPositionChange = useCallback(
    (selectedJobPositionId: string) => {
      if (selectedJobPositionId) {
        const selectedJobPosition = allJobPositions.find(jp => jp.id === selectedJobPositionId)
        if (selectedJobPosition) {
          const updates: any = { jobPositionId: selectedJobPositionId }
          if (selectedJobPosition.employmentType?.id) updates.employmentTypeId = selectedJobPosition.employmentType.id
          if (selectedJobPosition.contractType?.id) updates.contractTypeId = selectedJobPosition.contractType.id
          setFormValues(updates)
          form.setValue('jobPositionId', selectedJobPositionId, { shouldValidate: true })
          if (updates.employmentTypeId)
            form.setValue('employmentTypeId', updates.employmentTypeId, { shouldValidate: true })
          if (updates.contractTypeId) form.setValue('contractTypeId', updates.contractTypeId, { shouldValidate: true })
        } else {
          setFormValues({ jobPositionId: selectedJobPositionId })
          form.setValue('jobPositionId', selectedJobPositionId, { shouldValidate: true })
        }
      } else {
        setFormValues({ jobPositionId: '', employmentTypeId: '', contractTypeId: '' })
        form.setValue('jobPositionId', '', { shouldValidate: true })
        form.setValue('employmentTypeId', '', { shouldValidate: true })
        form.setValue('contractTypeId', '', { shouldValidate: true })
      }
    },
    [allJobPositions, form, setFormValues]
  )

  const formatDateToMidnight = (value?: string) => {
    if (!value) return undefined
    return `${value}T00:00:00`
  }

  const handleSubmit = async (data: EmployeeFormData) => {
    setIsProcessPending(true)
    try {
      await submit()

      const hireDateToUse = data.hireDate || new Date().toISOString().split('T')[0]
      const hireDateFormatted = formatDateToMidnight(hireDateToUse)
      const fixedTermUntilFormatted = formatDateToMidnight(data.fixedTermUntil)
      const fixedTermReason = data.fixedTermUntil ? 'Fixed-Term Employment' : data.fixedTermReason

      const payload: any = {
        employee: {
          firstName: data.firstName,
          lastName: data.lastName,
          preferredName: data.preferredName,
          fullName: `${data.firstName} ${data.lastName}`,
          communication: [
            {
              purpose: 'INTERNAL',
              typeRef: 'CommunicationType:v1:1',
              channelRef: 'CommunicationChannel:v1:e-mail',
              value: data.email,
              valueExtension: 'string'
            }
          ],
          workingCondition: [
            {
              contractStatus: 'ACTIVE',
              contractTypeRef: data.contractTypeId,
              employmentTypeRef: data.employmentTypeId,
              hireDate: hireDateFormatted,
              exitDate: fixedTermUntilFormatted,
              additionalProperties: fixedTermReason ? { fixedTermReason } : undefined
            }
          ]
        },
        organizationalUnitId: data.organizationalUnitId,
        structureId,
        jobPositionId: data.jobPositionId,
        companyId: data.legalEntityId,
        siteLocationId: data.siteLocationId,
        costCenterId: data.costCenterId || undefined,
        changeMode: 'INSERT',
        createUser: true
      }

      window.dispatchEvent(new CustomEvent('com.newwork.employeeForm.saveEmployeePayload', { detail: { payload } }))

      dispatchProcessContinueEvent('pse_submit', payload)
      await new Promise<void>(resolve => {
        const handleProcessCompletion = (event: Event) => {
          const customEvent = event as CustomEvent<{ resolution?: 'success' | 'failure' }>
          const detail = customEvent?.detail ?? null
          if (detail?.resolution === 'success' || detail?.resolution === 'failure') {
            cleanup()
            resolve()
          }
        }
        const cleanup = () => {
          globalThis.window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
          globalThis.window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion)
        }
        globalThis.window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
        globalThis.window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion)
      })
    } catch (err) {
      console.error('Error submitting employee form:', err)
    } finally {
      setIsProcessPending(false)
    }
  }

  const steps: WizardStep<EmployeeFormData>[] = useMemo(
    () => [
      {
        id: 'organization',
        title: t('employee-form-tab-organization'),
        description: t('employee-form-organization-description'),
        fields: ['legalEntityId', 'siteLocationId', 'organizationalUnitId', 'jobPositionId'] as Array<
          FieldPath<EmployeeFormData>
        >,
        content: (
          <WizardFormStep>
            <FormSection title={t('employee-form-tab-organization')} collapsible={false}>
              <FormField
                control={form.control}
                name="legalEntityId"
                render={() => (
                  <FormItem>
                    <RequiredFormLabel>{t('employee-form-legal-entity')}</RequiredFormLabel>
                    <FormControl>
                      <Combobox
                        className="gba:[&&]:h-auto gba:w-full"
                        options={legalEntityOptions}
                        value={formValues.legalEntityId || ''}
                        onValueChange={v => handleLegalEntityChange(v ?? '')}
                        placeholder={t('action-select-placeholder')}
                        searchPlaceholder="Type to search..."
                        emptyText={legalEntitiesLoading ? t('loading') : t('employee-form-no-results')}
                        onSearch={searchLegalEntities}
                        searchDebounce={300}
                        loading={showLegalEntitiesLoading}
                        onLoadMore={loadMoreLegalEntities}
                        hasMore={Boolean(hasMoreLegalEntities)}
                        data-testid="employee-form-legal-entity-combobox"
                        align="start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="siteLocationId"
                render={() => (
                  <FormItem>
                    <RequiredFormLabel>{t('employee-form-site-location')}</RequiredFormLabel>
                    <FormControl>
                      <Combobox
                        className="gba:[&&]:h-auto gba:w-full"
                        options={siteLocationOptions}
                        value={formValues.siteLocationId || ''}
                        onValueChange={v => {
                          form.setValue('siteLocationId', v ?? '', { shouldValidate: true })
                          setFormValues({ siteLocationId: v ?? '' })
                        }}
                        placeholder={
                          !formValues.legalEntityId
                            ? t('employee-form-select-legal-entity-first')
                            : t('action-select-placeholder')
                        }
                        searchPlaceholder="Type to search..."
                        emptyText={siteLocationsLoading ? t('loading') : t('employee-form-no-results')}
                        onSearch={searchSiteLocations}
                        searchDebounce={300}
                        loading={showSiteLocationsLoading}
                        onLoadMore={loadMoreSiteLocations}
                        hasMore={Boolean(hasMoreSiteLocations)}
                        disabled={!formValues.legalEntityId}
                        data-testid="employee-form-site-location-combobox"
                        align="start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costCenterId"
                render={() => (
                  <FormItem>
                    <FormLabel>{t('employee-form-cost-center')}</FormLabel>
                    <FormControl>
                      <Combobox
                        className="gba:[&&]:h-auto gba:w-full"
                        options={costCenterOptions}
                        value={formValues.costCenterId || ''}
                        onValueChange={v => {
                          form.setValue('costCenterId', v ?? '', { shouldValidate: true })
                          setFormValues({ costCenterId: v ?? '' })
                        }}
                        placeholder={t('action-select-placeholder')}
                        searchPlaceholder="Type to search..."
                        emptyText={costCentersLoading ? t('loading') : t('employee-form-no-results')}
                        onSearch={searchCostCenters}
                        searchDebounce={300}
                        loading={showCostCentersLoading}
                        onLoadMore={loadMoreCostCenters}
                        hasMore={Boolean(hasMoreCostCenters)}
                        showClearButton
                        data-testid="employee-form-cost-center-combobox"
                        align="start"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organizationalUnitId"
                render={() => (
                  <FormItem>
                    <RequiredFormLabel>{t('employee-form-organizational-unit')}</RequiredFormLabel>
                    <FormControl>
                      <Combobox
                        className="gba:[&&]:h-auto gba:w-full"
                        options={organizationalUnitOptions}
                        value={formValues.organizationalUnitId || ''}
                        onValueChange={v => {
                          form.setValue('organizationalUnitId', v ?? '', { shouldValidate: true })
                          setFormValues({ organizationalUnitId: v ?? '' })
                        }}
                        placeholder={t('action-select-placeholder')}
                        searchPlaceholder="Type to search..."
                        emptyText={organizationalUnitsLoading ? t('loading') : t('employee-form-no-results')}
                        onSearch={searchOrganizationalUnits}
                        searchDebounce={300}
                        loading={showOrgUnitsLoading}
                        onLoadMore={loadMoreOrganizationalUnits}
                        hasMore={Boolean(hasMoreOrganizationalUnits)}
                        data-testid="employee-form-organizational-unit-combobox"
                        align="start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobPositionId"
                render={() => (
                  <FormItem>
                    <RequiredFormLabel>{t('employee-form-job-position')}</RequiredFormLabel>
                    <div className="gba:flex gba:gap-2 gba:items-center">
                      <FormControl>
                        <Combobox
                          className="gba:[&&]:h-auto gba:w-full"
                          options={jobPositionOptions}
                          value={formValues.jobPositionId || ''}
                          onValueChange={v => handleJobPositionChange(v ?? '')}
                          placeholder={t('action-select-placeholder')}
                          searchPlaceholder="Type to search..."
                          emptyText={jobPositionEmptyText}
                          onSearch={searchJobPositions}
                          searchDebounce={300}
                          loading={showJobPositionsLoading}
                          onLoadMore={loadMoreJobPositions}
                          hasMore={Boolean(hasMoreJobPositions)}
                          data-testid="employee-form-job-position-combobox"
                          align="start"
                          disabled={!formValues.organizationalUnitId}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsCreateJobPositionModalOpen(true)}
                        disabled={!formValues.organizationalUnitId}
                        title={
                          formValues.organizationalUnitId
                            ? t('employee-form-create-job-position-tooltip')
                            : t('employee-form-select-org-unit-first')
                        }
                        data-testid="add-job-position-button"
                      >
                        <PlusIcon className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                    <FormMessage />
                    {jobPositions.length === 0 &&
                      !jobPositionsLoading &&
                      !jobPositionsError &&
                      jobPositionsInitialLoadDone &&
                      formValues.organizationalUnitId && (
                        <div className="gba:text-muted-foreground gba:text-sm">
                          {t('employee-form-no-vacant-positions')}
                        </div>
                      )}
                  </FormItem>
                )}
              />
            </FormSection>
          </WizardFormStep>
        )
      },
      {
        id: 'personal',
        title: t('employee-form-tab-personal'),
        description: t('employee-form-personal-description'),
        fields: ['firstName', 'lastName', 'email'] as Array<FieldPath<EmployeeFormData>>,
        content: (
          <WizardFormStep>
            <FormSection title={t('employee-form-tab-personal')} collapsible={false}>
              <FormFieldGroup>
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="gba:flex-1 gba:min-w-[150px]">
                      <RequiredFormLabel>{t('employee-form-first-name')}</RequiredFormLabel>
                      <FormControl>
                        <Input placeholder={t('action-enter-placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="gba:flex-1 gba:min-w-[150px]">
                      <RequiredFormLabel>{t('employee-form-last-name')}</RequiredFormLabel>
                      <FormControl>
                        <Input placeholder={t('action-enter-placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormFieldGroup>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <RequiredFormLabel>{t('employee-form-email')}</RequiredFormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('action-enter-placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>
          </WizardFormStep>
        )
      },
      {
        id: 'employment',
        title: t('employee-form-tab-employment'),
        description: t('employee-form-employment-description'),
        fields: ['hireDate', 'employmentTypeId', 'contractTypeId'] as Array<FieldPath<EmployeeFormData>>,
        content: (
          <WizardFormStep>
            <FormSection title={t('employee-form-tab-employment')} collapsible={false}>
              <FormField
                control={form.control}
                name="hireDate"
                render={() => (
                  <FormItem>
                    <RequiredFormLabel>{t('employee-form-hire-date')}</RequiredFormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={formValues.hireDate || ''}
                        onChange={v => {
                          const val = typeof v === 'string' ? v : ''
                          form.setValue('hireDate', val, { shouldValidate: true })
                          setFormValues({ hireDate: val })
                        }}
                        className="gba:w-full"
                        captionLayout="dropdown"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="employmentTypeId"
                  render={() => (
                    <FormItem className="gba:min-w-0">
                      <RequiredFormLabel>{t('employee-form-employment-type')}</RequiredFormLabel>
                      <Select
                        value={formValues.employmentTypeId || undefined}
                        onValueChange={value => {
                          form.setValue('employmentTypeId', value, { shouldValidate: true })
                          setFormValues({ employmentTypeId: value })
                        }}
                        disabled={!formValues.jobPositionId || employmentTypesLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:w-full gba:min-w-0">
                            <SelectValue
                              placeholder={employmentTypesLoading ? t('loading') : t('action-select-placeholder')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employmentTypes.length === 0 ? (
                            <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                              {employmentTypesLoading ? t('loading') : t('employee-form-no-results')}
                            </div>
                          ) : (
                            employmentTypes.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractTypeId"
                  render={() => (
                    <FormItem className="gba:min-w-0">
                      <RequiredFormLabel>{t('employee-form-contract-type')}</RequiredFormLabel>
                      <Select
                        value={formValues.contractTypeId || undefined}
                        onValueChange={value => {
                          form.setValue('contractTypeId', value, { shouldValidate: true })
                          setFormValues({ contractTypeId: value })
                        }}
                        disabled={!formValues.jobPositionId || contractTypesLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="gba:w-full gba:min-w-0">
                            <SelectValue
                              placeholder={contractTypesLoading ? t('loading') : t('action-select-placeholder')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contractTypes.length === 0 ? (
                            <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                              {contractTypesLoading ? t('loading') : t('employee-form-no-results')}
                            </div>
                          ) : (
                            contractTypes.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fixedTermUntil"
                render={() => (
                  <FormItem>
                    <FormLabel>{t('employee-form-fixed-term-end-date')}</FormLabel>
                    <FormControl>
                      <DateInput
                        type="date"
                        value={formValues.fixedTermUntil || ''}
                        onChange={v => {
                          const val = typeof v === 'string' ? v : ''
                          form.setValue('fixedTermUntil', val)
                          setFormValues({ fixedTermUntil: val })
                        }}
                        className="gba:w-full"
                        captionLayout="dropdown"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </FormSection>
          </WizardFormStep>
        )
      }
    ],
    [
      t,
      form,
      formValues,
      legalEntityOptions,
      siteLocationOptions,
      costCenterOptions,
      organizationalUnitOptions,
      jobPositionOptions,
      employmentTypes,
      contractTypes,
      legalEntitiesLoading,
      siteLocationsLoading,
      costCentersLoading,
      organizationalUnitsLoading,
      jobPositionsLoading,
      employmentTypesLoading,
      contractTypesLoading,
      showLegalEntitiesLoading,
      showSiteLocationsLoading,
      showCostCentersLoading,
      showOrgUnitsLoading,
      showJobPositionsLoading,
      hasMoreLegalEntities,
      hasMoreSiteLocations,
      hasMoreCostCenters,
      hasMoreOrganizationalUnits,
      hasMoreJobPositions,
      searchLegalEntities,
      searchSiteLocations,
      searchCostCenters,
      searchOrganizationalUnits,
      searchJobPositions,
      loadMoreLegalEntities,
      loadMoreSiteLocations,
      loadMoreCostCenters,
      loadMoreOrganizationalUnits,
      loadMoreJobPositions,
      handleLegalEntityChange,
      handleJobPositionChange,
      setFormValues,
      jobPositionEmptyText,
      jobPositionsError,
      jobPositionsInitialLoadDone,
      jobPositions
    ]
  )

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:w-full gba:max-w-2xl gba:mx-auto gba:p-6">
      {error && (
        <div className="gba:bg-destructive/10 gba:border gba:border-destructive gba:rounded-md gba:p-4 gba:mb-4">
          <div className="gba:text-destructive gba:text-sm">{error}</div>
        </div>
      )}

      <WizardForm
        form={form}
        steps={steps}
        onSubmit={handleSubmit}
        schema={employeeFormSchema}
        allowStepJumping={false}
        contentClassName="gba:min-h-[380px]"
      >
        <WizardNavigation
          form={form}
          steps={steps}
          submitDisabled={!form.formState.isValid || loading || isProcessPending}
          submitLabel={
            loading || isProcessPending
              ? t('loading')
              : isEdit
                ? t('employee-form-update-employee')
                : t('employee-form-create-employee')
          }
        />
      </WizardForm>

      <CreateJobPositionModal
        visible={isCreateJobPositionModalOpen}
        organizationalUnitId={formValues.organizationalUnitId}
        organizationalUnitName={selectedOrgUnitName}
        accessToken={accessToken}
        structureId={structureId}
        onCancel={() => setIsCreateJobPositionModalOpen(false)}
        onSuccess={() => {
          refetchJobPositions()
        }}
      />
    </div>
  )
}

export default EmployeeForm
