import React, { useState } from 'react'
import { useEmployeeContext } from '../context/EmployeeContext'
import {
  Button,
  Input,
  DateInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  useTranslation
} from '@newwork/nw-design-system'
import { PlusIcon, CaretDownIcon } from '@phosphor-icons/react'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import CreateJobPositionModal from './CreateJobPositionModal'
import translations from '../../_i18n'

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
    loading,
    error,
    submit,
    isEdit,
    accessToken,
    structureId,
    organizationalUnitsError,
    organizationalUnitsLoading,
    refetchJobPositions,
    jobPositionsError,
    jobPositionsLoading,
    employmentTypesError,
    employmentTypesLoading,
    contractTypesError,
    contractTypesLoading
  } = useEmployeeContext()

  const [showAdditionalAttributes, setShowAdditionalAttributes] = useState(false)
  const [isCreateJobPositionModalOpen, setIsCreateJobPositionModalOpen] = useState(false)

  const selectedOrgUnit = organizationalUnits.find(unit => unit.id === formValues.organizationalUnitId)
  const selectedOrgUnitName = selectedOrgUnit?.name || ''

  const isFormValid =
    formValues.firstName?.trim() &&
    formValues.lastName?.trim() &&
    formValues.email?.trim() &&
    formValues.organizationalUnitId &&
    formValues.jobPositionId &&
    formValues.employmentTypeId &&
    formValues.contractTypeId

  const isEmailValid = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isEmailFieldValid = !formValues.email || isEmailValid(formValues.email)

  const handleJobPositionChange = (selectedJobPositionId: string) => {
    if (selectedJobPositionId) {
      const selectedJobPosition = allJobPositions.find(jp => jp.id === selectedJobPositionId)

      if (selectedJobPosition) {
        const updates: any = { jobPositionId: selectedJobPositionId }

        if (selectedJobPosition.employmentType?.id) {
          updates.employmentTypeId = selectedJobPosition.employmentType.id
        }

        if (selectedJobPosition.contractType?.id) {
          updates.contractTypeId = selectedJobPosition.contractType.id
        }

        setFormValues(updates)
      } else {
        setFormValues({ jobPositionId: selectedJobPositionId })
      }
    } else {
      setFormValues({
        jobPositionId: '',
        employmentTypeId: '',
        contractTypeId: ''
      })
    }
  }

  const handleSubmit = async () => {
    try {
      await submit()

      const hireDateToUse = formValues.hireDate || new Date().toISOString().split('T')[0]
      const hireDateFormatted = `${hireDateToUse}T00:00:00`

      const payload: any = {
        employee: {
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          preferredName: formValues.preferredName,
          fullName: `${formValues.firstName} ${formValues.lastName}`,
          communication: [
            {
              purpose: 'INTERNAL',
              typeRef: 'CommunicationType:v1:1',
              channelRef: 'CommunicationChannel:v1:e-mail',
              value: formValues.email,
              valueExtension: 'string'
            }
          ],
          workingCondition: [
            {
              contractStatus: 'ACTIVE',
              contractTypeRef: formValues.contractTypeId,
              employmentTypeRef: formValues.employmentTypeId,
              hireDate: hireDateFormatted
            }
          ]
        },
        organizationalUnitId: formValues.organizationalUnitId,
        structureId: structureId,
        jobPositionId: formValues.jobPositionId,
        changeMode: 'INSERT',
        createUser: true
      }

      if (formValues.preferredName && formValues.preferredName.trim()) {
        payload.employee.displayName = `${formValues.preferredName} ${formValues.lastName}`
      } else {
        payload.employee.displayName = `${formValues.firstName} ${formValues.lastName}`
      }

      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (err) {
      console.error('Error submitting employee form:', err)
    }
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <form className="gba:h-full gba:flex gba:flex-col" onSubmit={e => e.preventDefault()}>
        <div className="gba:flex-1 gba:overflow-y-auto gba:overflow-x-hidden gba:space-y-6">
          <div className="gba:space-y-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:border-b gba:border-border gba:pb-2">
              {t('employee-form-personal-information')}
            </h3>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                {t('employee-form-first-name')}
                <span className="gba:text-destructive"> *</span>
              </label>
              <Input
                value={formValues.firstName}
                onChange={e => setFormValues({ firstName: e.target.value })}
                placeholder={t('action-enter-placeholder')}
              />
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                {t('employee-form-last-name')}
                <span className="gba:text-destructive"> *</span>
              </label>
              <Input
                value={formValues.lastName}
                onChange={e => setFormValues({ lastName: e.target.value })}
                placeholder={t('action-enter-placeholder')}
              />
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                {t('employee-form-email')}
                <span className="gba:text-destructive"> *</span>
              </label>
              <Input
                type="email"
                value={formValues.email}
                onChange={e => setFormValues({ email: e.target.value })}
                placeholder={t('action-enter-placeholder')}
                className={!isEmailFieldValid ? 'gba:border-destructive' : ''}
              />
              {!isEmailFieldValid && (
                <div className="gba:text-destructive gba:text-sm gba:mt-1">{t('employee-form-email-invalid')}</div>
              )}
            </div>
          </div>

          <div className="gba:space-y-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:border-b gba:border-border gba:pb-2">
              {t('employee-form-employment-information')}
            </h3>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                {t('employee-form-organizational-unit')}
                <span className="gba:text-destructive"> *</span>
              </label>
              <Select
                value={formValues.organizationalUnitId || undefined}
                onValueChange={value => setFormValues({ organizationalUnitId: value })}
                disabled={organizationalUnitsLoading}
              >
                <SelectTrigger className="gba:w-full">
                  <SelectValue
                    placeholder={organizationalUnitsLoading ? t('loading') : t('action-select-placeholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {organizationalUnits.length === 0 ? (
                    <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                      {organizationalUnitsLoading ? t('loading') : t('employee-form-no-results')}
                    </div>
                  ) : (
                    organizationalUnits.map(unit => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {organizationalUnitsError && (
                <div className="gba:text-destructive gba:text-sm gba:mt-1">{organizationalUnitsError}</div>
              )}
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                {t('employee-form-job-position')}
                <span className="gba:text-destructive"> *</span>
              </label>
              <div className="gba:flex gba:gap-2 gba:items-center">
                <div className="gba:flex-1">
                  <Select
                    value={formValues.jobPositionId || undefined}
                    onValueChange={handleJobPositionChange}
                    disabled={!formValues.organizationalUnitId || jobPositionsLoading}
                  >
                    <SelectTrigger className="gba:w-full">
                      <SelectValue placeholder={jobPositionsLoading ? t('loading') : t('action-select-placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {jobPositions.length === 0 ? (
                        <div className="gba:p-2 gba:text-sm gba:text-muted-foreground gba:text-center">
                          {jobPositionsLoading ? t('loading') : t('employee-form-no-positions')}
                        </div>
                      ) : (
                        jobPositions.map(position => (
                          <SelectItem key={position.id} value={position.id}>
                            {position.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
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
              {jobPositionsError && (
                <div className="gba:text-destructive gba:text-sm gba:mt-1">{jobPositionsError}</div>
              )}
              {jobPositions.length === 0 &&
                !jobPositionsLoading &&
                !jobPositionsError &&
                formValues.organizationalUnitId && (
                  <div className="gba:text-muted-foreground gba:text-sm gba:mt-1">
                    {t('employee-form-no-vacant-positions')}
                  </div>
                )}
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                {t('employee-form-hire-date')}
              </label>
              <DateInput
                type="date"
                value={formValues.hireDate || ''}
                onChange={v => setFormValues({ hireDate: typeof v === 'string' ? v : '' })}
                className="gba:w-full"
                captionLayout="dropdown"
              />
            </div>
          </div>

          <Collapsible open={showAdditionalAttributes} onOpenChange={setShowAdditionalAttributes}>
            <div className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden">
              <CollapsibleTrigger className="gba:w-full gba:px-3 gba:py-2 gba:text-left gba:flex gba:items-center gba:justify-between gba:bg-muted gba:hover:bg-muted gba:rounded-lg gba:transition-colors">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {t('employee-form-additional-attributes')}
                </span>
                <CaretDownIcon
                  className={`gba:w-4 gba:h-4 gba:transform gba:transition-transform ${showAdditionalAttributes ? 'gba:rotate-180' : ''}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="gba:p-4 gba:space-y-6 gba:border-t gba:border-border">
                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                      {t('employee-form-preferred-name')}
                    </label>
                    <Input
                      value={formValues.preferredName}
                      onChange={e => setFormValues({ preferredName: e.target.value })}
                      placeholder={t('action-enter-placeholder')}
                    />
                  </div>

                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                      {t('employee-form-employment-type')}
                      <span className="gba:text-destructive"> *</span>
                    </label>
                    <Select
                      value={formValues.employmentTypeId || undefined}
                      onValueChange={value => setFormValues({ employmentTypeId: value })}
                      disabled={!formValues.jobPositionId || employmentTypesLoading}
                    >
                      <SelectTrigger className="gba:w-full">
                        <SelectValue
                          placeholder={employmentTypesLoading ? t('loading') : t('action-select-placeholder')}
                        />
                      </SelectTrigger>
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
                    {employmentTypesError && (
                      <div className="gba:text-destructive gba:text-sm gba:mt-1">{employmentTypesError}</div>
                    )}
                  </div>

                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                      {t('employee-form-contract-type')}
                      <span className="gba:text-destructive"> *</span>
                    </label>
                    <Select
                      value={formValues.contractTypeId || undefined}
                      onValueChange={value => setFormValues({ contractTypeId: value })}
                      disabled={!formValues.jobPositionId || contractTypesLoading}
                    >
                      <SelectTrigger className="gba:w-full">
                        <SelectValue
                          placeholder={contractTypesLoading ? t('loading') : t('action-select-placeholder')}
                        />
                      </SelectTrigger>
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
                    {contractTypesError && (
                      <div className="gba:text-destructive gba:text-sm gba:mt-1">{contractTypesError}</div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {error && (
            <div className="gba:bg-destructive/10 gba:border gba:border-destructive gba:rounded-md gba:p-4">
              <div className="gba:text-destructive gba:text-sm">{error}</div>
            </div>
          )}
        </div>

        <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-border">
          <Button
            variant="default"
            disabled={!isFormValid || !isEmailFieldValid || loading}
            className="gba:w-full"
            onClick={handleSubmit}
          >
            {loading ? t('loading') : isEdit ? t('employee-form-update-employee') : t('employee-form-create-employee')}
          </Button>
        </div>
      </form>

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
