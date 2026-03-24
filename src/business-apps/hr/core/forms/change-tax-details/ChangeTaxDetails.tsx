import React, { useCallback, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFileClient } from '@/common/network/files/useFileClient'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import translations from './_i18n'
import { useChangeTaxDetailsData } from './useChangeTaxDetailsData'
import { getChangeTaxDetailsLabels } from './changeTaxDetailsLabels'
import { buildEmployeeTaxDetailPayload } from './changeTaxDetailsPayload'
import { executeHealthInsuranceDocumentUpload } from './handleHealthInsuranceDocumentUpload'
import { ChangeTaxDetailsFormFields } from './ChangeTaxDetailsFormFields'
import type { TaxInfoFormValues } from './types'

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
  const [healthInsuranceFileList, setHealthInsuranceFileList] = useState<any[]>([])
  const fileClient = useFileClient({ accessToken: accessToken ?? '' })

  const { t } = useTranslation(translations)
  const {
    data,
    catalogs,
    isReady,
    isEmployeeInGermany,
    isEmployeeInRomania,
    employeeGender,
    employeeBirthDate,
    employeeBirthName,
    employeeLastName
  } = useChangeTaxDetailsData(accessToken, additionalData, userInfo, form, initialRef)

  const getMessage = useCallback(
    (key: string, fallback: string) => {
      void fallback
      return t(key)
    },
    [t]
  )

  const title = useMemo(() => t('change-tax-details-title'), [t])

  const labels = useMemo(() => getChangeTaxDetailsLabels(t), [t])

  const handleHealthInsuranceFilesChange = useCallback(
    (files: Array<{ file: File | { name: string }; id: string }>) => {
      const mapped = files
        .filter(f => f.file instanceof File)
        .map(f => ({ uid: f.id, name: (f.file as File).name, status: 'done', originFileObj: f.file as File }))
      setHealthInsuranceFileList(mapped as any[])
    },
    []
  )

  const watchedValues = form.watch()

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
    const current = normalizeForCompare(watchedValues)
    const initial = normalizeForCompare(initialRef.current)
    return JSON.stringify(current) === JSON.stringify(initial)
  }, [watchedValues, normalizeForCompare])

  const { formState } = form
  const { isValid, isDirty, errors } = formState
  const hasValidationErrors = Object.keys(errors || {}).length > 0
  const isSubmitDisabledFinal = !isValid || hasValidationErrors || !isDirty || isUnchangedNow

  const handlePreSubmit =
    healthInsuranceFileList.length > 0 && healthInsuranceFileList[0]?.originFileObj
      ? async (values: TaxInfoFormValues) => {
          const employeeId = getEmployeeId(additionalData, userInfo)
          const file = healthInsuranceFileList[0].originFileObj as File
          const uploadedId = await executeHealthInsuranceDocumentUpload(
            file,
            values,
            employeeId,
            accessToken ?? '',
            fileClient
          )
          return { ...values, uploadedHealthInsuranceDocumentId: uploadedId }
        }
      : undefined

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
            healthInsuranceFileList={healthInsuranceFileList}
            onHealthInsuranceFilesChange={handleHealthInsuranceFilesChange}
          />
        </AppActionForm>
      </div>
    </div>
  )
}

export default ChangeTaxDetails
