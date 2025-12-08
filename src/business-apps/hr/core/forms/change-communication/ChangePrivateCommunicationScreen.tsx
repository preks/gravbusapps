import React, { useMemo } from 'react'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useCommunicationLookups } from './queries/ChangeCommunicationQueries'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { parseNumber, formatNumber, isValidPhoneNumber, getCountryCallingCode } from 'libphonenumber-js'
import { FormHeader } from './components/FormHeader'
import { ChannelTypeField } from './components/ChannelTypeField'
import { TypeField } from './components/TypeField'
import { PurposeField } from './components/PurposeField'
import { ValueField } from './components/ValueField'
import { useCommunicationFormState } from './hooks/useCommunicationFormState'
import { useCommunicationValidation } from './hooks/useCommunicationValidation'

const prefixDataTestId = 'ChangePrivateCommunicationScreen'

const ChangePrivateCommunicationScreen: React.FC<BusinessAppContextProps> = context => {
  const { channels, types, communications, employee, loading } = useCommunicationLookups(context)

  const formState = useCommunicationFormState({
    channels,
    types,
    communications,
    loading
  })

  const validation = useCommunicationValidation({
    normalizedChannelType: formState.normalizedChannelType,
    value: formState.value,
    isPhoneType: formState.isPhoneType,
    phoneNumber: formState.phoneNumber,
    selectedCountryCode: formState.selectedCountryCode,
    channelType: formState.channelType,
    valueType: formState.valueType
  })

  const hasChanges = useMemo(() => {
    if (!formState.baseline) return false
    let currentValue = formState.value.trim()
    if (formState.isPhoneType) {
      if (formState.selectedCountryCode && formState.phoneNumber.trim()) {
        try {
          const callingCode = getCountryCallingCode(formState.selectedCountryCode)
          currentValue = `+${callingCode}${formState.phoneNumber.trim()}`
        } catch {
          currentValue = formState.phoneNumber.trim()
        }
      } else {
        currentValue = formState.phoneNumber.trim()
      }
    }
    return (
      formState.channelType !== formState.baseline.channelRef ||
      formState.valueType !== formState.baseline.typeRefId ||
      currentValue !== (formState.baseline.value || '') ||
      formState.purpose !== (formState.baseline.purpose || 'PRIVATE')
    )
  }, [
    formState.baseline,
    formState.channelType,
    formState.valueType,
    formState.value,
    formState.purpose,
    formState.isPhoneType,
    formState.selectedCountryCode,
    formState.phoneNumber
  ])

  const validateForm = () => {
    const errors: string[] = []
    if (!formState.channelType) errors.push(validation.channelRequiredMessage)
    if (!formState.valueType) errors.push(validation.typeRequiredMessage)
    if (validation.valueValidationMessage) errors.push(validation.valueValidationMessage)
    return errors.length > 0 ? errors : null
  }

  const handlePreSubmit = async () => {
    let formattedValue = formState.value.trim()

    if (formState.isPhoneType) {
      if (formState.selectedCountryCode && formState.phoneNumber.trim()) {
        try {
          const callingCode = getCountryCallingCode(formState.selectedCountryCode)
          const fullNumber = `+${callingCode}${formState.phoneNumber.trim()}`
          const parsed = parseNumber(fullNumber)
          if (parsed && 'phone' in parsed && isValidPhoneNumber(fullNumber)) {
            formattedValue = formatNumber(parsed, 'E.164')
          } else {
            formattedValue = fullNumber
          }
        } catch {
          formattedValue = formState.phoneNumber.trim()
        }
      } else {
        formattedValue = formState.phoneNumber.trim()
      }
    }

    const employeeId =
      (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      context.userInfo?.employeeDetails?.employeeId

    return {
      employeeCommunication: {
        channelRef: formState.channelType,
        typeRef: formState.valueType,
        purpose: formState.purpose,
        value: formattedValue,
        employeeId,
        ...(typeof formState.baseline?.version === 'number' ? { version: formState.baseline?.version } : {}),
        ...(formState.baseline?.id ? { id: formState.baseline.id } : {})
      }
    }
  }

  return (
    <AppActionForm
      processType="update"
      formData={{}}
      onSubmit={data => data}
      validateForm={validateForm}
      handlePreSubmit={handlePreSubmit}
      isSubmitDisabled={!validation.isValid || !hasChanges}
      submitButtonTestId="flw_changeRelationship_btnSubmit"
      cancelButtonTestId="flw_changeRelationship_btnCancel"
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      onCancel={() => {
        dispatchProcessContinueEvent('pse_abort', {
          event: 'pse_abort',
          pso_exitStrategy: 'abort',
          pso_completeNotification: {
            type: 'error',
            messageKey: getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_module.toast_notification_cancel_create_absence',
              'The action has been canceled.'
            )
          }
        })
      }}
    >
      <div className="gba:bg-white gba:max-w-xl gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        <FormHeader
          employee={
            employee
              ? {
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  pictureThumbnail: employee.pictureThumbnail,
                  jobTitle: employee.jobTitle
                }
              : undefined
          }
        />

        <div className="gba:px-0 gba:py-6 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-160px)]">
          <ChannelTypeField
            value={formState.channelType}
            onChange={formState.setChannelType}
            channels={channels}
            loading={loading}
            error={validation.channelRequiredMessage}
            touched={formState.channelTouched}
          />

          <TypeField
            value={formState.valueType}
            onChange={formState.setValueType}
            types={types}
            loading={loading}
            error={validation.typeRequiredMessage}
            touched={formState.typeTouched}
            secondaryTypeId={formState.secondaryTypeId}
            hasPrimaryForSelection={formState.hasPrimaryForSelection}
          />

          <PurposeField value={formState.purpose} onChange={formState.setPurpose} />

          <ValueField
            value={formState.value}
            phoneNumber={formState.phoneNumber}
            selectedCountryCode={formState.selectedCountryCode}
            isPhoneType={formState.isPhoneType}
            countries={formState.countries}
            onChange={formState.setValue}
            onPhoneNumberChange={formState.setPhoneNumber}
            onCountryCodeChange={formState.setSelectedCountryCode}
            onTouched={() => formState.setValueTouched(true)}
            error={validation.valueValidationMessage}
            touched={formState.valueTouched}
          />
        </div>
      </div>
    </AppActionForm>
  )
}

export default ChangePrivateCommunicationScreen
