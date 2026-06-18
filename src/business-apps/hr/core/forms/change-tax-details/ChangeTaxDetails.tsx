import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { Alert, AlertDescription, Spinner, useTranslation } from '@newwork/nw-design-system'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import translations from './_i18n'
import { useChangeTaxDetailsData } from './useChangeTaxDetailsData'
import { getChangeTaxDetailsLabels } from './changeTaxDetailsLabels'
import { buildEmployeeTaxDetailPayload } from './changeTaxDetailsPayload'
import { ChangeTaxDetailsFormFields } from './ChangeTaxDetailsFormFields'
import type { TaxInfoFormValues } from './types'
import { useEmployeeDocumentSync } from '../document-sync/useEmployeeDocumentSync'

function toValidEmployeeDocumentId(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return ''
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(trimmed) ? trimmed : ''
}

function getEmployeeId(additionalData: unknown, userInfo: unknown): string {
  const ad = additionalData as any
  return (
    ad?.psi_taskPayload?.employeeId ||
    ad?.psi_taskPayload?.initialParameters?.employeeId ||
    ad?.psi_taskPayload?.psi_initialParameters?.employeeId ||
    (typeof ad?.contextData === 'object' && ad?.contextData?.employeeId) ||
    (userInfo as any)?.employeeDetails?.employeeId ||
    ''
  )
}

const defaultValues: TaxInfoFormValues = {
  taxNumber: '',
  taxBracketRef: null,
  healthInsuranceName: '',
  healthInsuranceTypeRef: null,
  taxIdentificationNumber: '',
  taxableChurchAffiliationRef: null,
  socialSecurityNumber: '',
  childTaxAllowance: '',
  requestAtTaxOffice: false,
  employeeTaxOffice: '',
  individualFreeAmount: '',
  healthInsuranceDocumentTypeId: null,
  healthInsuranceDocumentValidTo: '',
  uploadNewHealthInsuranceDocument: false
}

export const ChangeTaxDetails: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData, userInfo }) => {
  const form = useForm<TaxInfoFormValues>({ defaultValues, mode: 'onChange' })
  const initialRef = useRef<TaxInfoFormValues>(form.getValues())

  const { t } = useTranslation(translations)
  const {
    data,
    catalogs,
    isReady,
    isEmployeeInGermany,
    isEmployeeInRomania,
    employeeCountryCode,
    employeeGender,
    employeeBirthDate,
    employeeBirthName,
    employeeLastName
  } = useChangeTaxDetailsData(accessToken, additionalData, userInfo, form, initialRef)

  const getMessage = useCallback(
    (key: string, fallback: string) => {
      const translated = t(key)
      return translated === key ? fallback : translated
    },
    [t]
  )

  const title = useMemo(() => t('change-tax-details-title'), [t])

  const labels = useMemo(() => getChangeTaxDetailsLabels(t), [t])
  const taxContextWarnings = useMemo(() => {
    const warnings: string[] = []

    if (!employeeCountryCode) {
      warnings.push(t('tax-details-missing-employment-region-warning'))
    }

    if (isEmployeeInGermany && !employeeBirthDate) {
      warnings.push(t('tax-details-missing-birth-date-warning'))
    }

    if (isEmployeeInGermany && !employeeBirthName && !employeeLastName) {
      warnings.push(t('tax-details-missing-birth-name-warning'))
    }

    return warnings
  }, [employeeBirthDate, employeeBirthName, employeeCountryCode, employeeLastName, isEmployeeInGermany, t])
  const hasBlockingTaxContextWarning = taxContextWarnings.length > 0

  const employeeId = getEmployeeId(additionalData, userInfo)
  const existingHealthInsuranceDocumentIdRaw =
    typeof (data as any)?.healthInsuranceDocument === 'object' && (data as any)?.healthInsuranceDocument?.id
      ? String((data as any).healthInsuranceDocument.id)
      : null
  const existingHealthInsuranceDocumentId = toValidEmployeeDocumentId(existingHealthInsuranceDocumentIdRaw)
  const shouldEnableDocumentSync = Boolean(isReady && employeeId)
  const healthInsuranceDocumentSync = useEmployeeDocumentSync({
    accessToken,
    employeeId,
    existingDocumentIds:
      shouldEnableDocumentSync && existingHealthInsuranceDocumentId ? [existingHealthInsuranceDocumentId] : [],
    enabled: shouldEnableDocumentSync,
    appName: 'employee-profile',
    folderPath: employeeId ? `/documents/${employeeId}` : undefined
  })
  const handleHealthInsuranceFilesChange = (files: Array<{ file: File | { name: string }; id: string }>) => {
    healthInsuranceDocumentSync.onFilesChange(files as any[])
  }

  const watchedValues = form.watch()
  const isDocumentChanged =
    healthInsuranceDocumentSync.hasPendingNewUpload || healthInsuranceDocumentSync.hasRemovedInitialFiles

  const normalizeForCompare = useCallback((v: TaxInfoFormValues) => {
    const toCompareString = (x: unknown): string => {
      if (x == null) return ''
      if (typeof x === 'object') return ''
      return String(x).trim()
    }
    return {
      taxNumber: toCompareString(v.taxNumber),
      taxBracketRef: v.taxBracketRef || null,
      healthInsuranceName: toCompareString(v.healthInsuranceName),
      healthInsuranceTypeRef: v.healthInsuranceTypeRef || null,
      taxIdentificationNumber: toCompareString(v.taxIdentificationNumber),
      taxableChurchAffiliationRef: v.taxableChurchAffiliationRef || null,
      socialSecurityNumber: toCompareString(v.socialSecurityNumber),
      childTaxAllowance: toCompareString(v.childTaxAllowance),
      requestAtTaxOffice: Boolean(v.requestAtTaxOffice),
      employeeTaxOffice: toCompareString(v.employeeTaxOffice),
      individualFreeAmount: toCompareString(v.individualFreeAmount),
      healthInsuranceDocumentTypeId: v.healthInsuranceDocumentTypeId || null,
      healthInsuranceDocumentValidTo: toCompareString(v.healthInsuranceDocumentValidTo),
      uploadNewHealthInsuranceDocument: Boolean(v.uploadNewHealthInsuranceDocument)
    }
  }, [])

  const isUnchangedNow = useMemo(() => {
    if (isDocumentChanged) {
      return false
    }
    const current = normalizeForCompare(watchedValues)
    const initial = normalizeForCompare(initialRef.current)
    return JSON.stringify(current) === JSON.stringify(initial)
  }, [watchedValues, normalizeForCompare, isDocumentChanged])

  const { formState } = form
  const { isValid, isDirty, errors } = formState
  const hasValidationErrors = Object.keys(errors || {}).length > 0
  const isSubmitDisabledFinal =
    hasBlockingTaxContextWarning ||
    !isValid ||
    hasValidationErrors ||
    (!isDirty && !isDocumentChanged) ||
    isUnchangedNow

  useEffect(() => {
    if (!isReady) {
      return
    }

    form.trigger(['taxNumber', 'taxIdentificationNumber', 'socialSecurityNumber']).catch(() => {
      // Field validation errors are already reflected in form state.
    })
  }, [
    employeeBirthDate,
    employeeBirthName,
    employeeGender,
    employeeLastName,
    form,
    isEmployeeInGermany,
    isEmployeeInRomania,
    isReady
  ])

  const handlePreSubmit = async (values: TaxInfoFormValues) => {
    const syncResult = await healthInsuranceDocumentSync.syncDocuments({
      documentGroup: 'DocumentGroup:v1:SALARY',
      documentType: values.healthInsuranceDocumentTypeId || null,
      validTo: values.healthInsuranceDocumentValidTo || null,
      deleteFirst: true
    })
    const shouldClearHealthInsuranceDocument =
      healthInsuranceDocumentSync.hasRemovedInitialFiles && !healthInsuranceDocumentSync.hasPendingNewUpload

    return {
      ...values,
      uploadedHealthInsuranceDocumentId: shouldClearHealthInsuranceDocument ? null : syncResult.primaryDocumentId
    }
  }

  const onSubmit = useCallback(
    async (values: TaxInfoFormValues) => {
      const employeeId = getEmployeeId(additionalData, userInfo)
      const payload = buildEmployeeTaxDetailPayload(values, data, isEmployeeInGermany)
      payload.employeeId = employeeId
      payload.employeeTaxDetail.employeeId = employeeId
      return payload as any
    },
    [additionalData, userInfo, data, isEmployeeInGermany]
  )

  if (!isReady) {
    return (
      <div
        className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]"
        data-testid="change-tax-details-form-container"
      >
        <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
        <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-tax-details']]:!pt-0">
          <div
            className="gba:flex gba:items-center gba:justify-center gba:py-20"
            data-testid="change-tax-details-loading-spinner"
          >
            <Spinner size="xl" srText="Loading tax details..." />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]"
      data-testid="change-tax-details-form-container"
    >
      <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
      {hasBlockingTaxContextWarning && (
        <Alert variant="default" className="gba:mb-4" data-testid="change-tax-details-context-warning">
          <WarningCircleIcon className="gba:h-4 gba:w-4" />
          <AlertDescription>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span>{t('tax-details-context-warning-title')}</span>
              {taxContextWarnings.map(warning => (
                <span key={warning}>{warning}</span>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-tax-details']]:!pt-0">
        <AppActionForm
          processType="update"
          form={form as any}
          formData={initialRef.current}
          submitEventType="pse_submit"
          cancelEventType="pse_abort"
          isSubmitDisabled={isSubmitDisabledFinal}
          submitButtonTestId="flw_changeTaxDetails_submitButton"
          cancelButtonTestId="flw_changeTaxDetails_cancelButton"
          submitButtonText={t('submit')}
          cancelButtonText={t('cancel')}
          handlePreSubmit={handlePreSubmit}
          onSubmit={onSubmit}
          data-testid="change-tax-details"
          data-employee-in-germany={String(isEmployeeInGermany)}
        >
          <ChangeTaxDetailsFormFields
            form={form}
            catalogs={catalogs}
            labels={labels}
            getMessage={getMessage}
            isEmployeeInGermany={isEmployeeInGermany}
            isEmployeeInRomania={isEmployeeInRomania}
            employeeGender={employeeGender}
            employeeBirthDate={employeeBirthDate}
            employeeBirthName={employeeBirthName}
            employeeLastName={employeeLastName}
            healthInsuranceFileList={healthInsuranceDocumentSync.managedFiles}
            healthInsuranceInitialFiles={healthInsuranceDocumentSync.initialUploadFiles}
            isLoadingHealthInsuranceInitialFiles={healthInsuranceDocumentSync.shouldShowInitialDocumentLoading}
            isResolvingHealthInsuranceInitialDocuments={healthInsuranceDocumentSync.isResolvingInitialDocuments}
            hasExistingHealthInsuranceDocumentHint={Boolean(existingHealthInsuranceDocumentId)}
            hasInitialHealthInsuranceDocumentCandidates={healthInsuranceDocumentSync.hasInitialDocumentCandidates}
            onHealthInsuranceFilesChange={handleHealthInsuranceFilesChange}
          />
        </AppActionForm>
      </div>
    </div>
  )
}

export default ChangeTaxDetails
