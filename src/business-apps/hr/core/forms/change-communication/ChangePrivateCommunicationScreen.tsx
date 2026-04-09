import React, { useEffect, useMemo } from 'react'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useCommunicationLookups } from './queries/ChangeCommunicationQueries'
import { parseNumber, formatNumber, isValidPhoneNumber, getCountryCallingCode } from 'libphonenumber-js'
import { FormHeader } from './components/FormHeader'
import { ChannelTypeField } from './components/ChannelTypeField'
import { TypeField } from './components/TypeField'
import { ValueField } from './components/ValueField'
import { useCommunicationFormState } from './hooks/useCommunicationFormState'
import { useCommunicationValidation } from './hooks/useCommunicationValidation'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../apps/employee-record/_i18n'
import { DeleteLayout } from '@/components/delete-layout/DeleteLayout'

const prefixDataTestId = 'ChangePrivateCommunicationScreen'

function getInitialParams(context: BusinessAppContextProps) {
  return (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters ?? {}
}

const ChangePrivateCommunicationScreen: React.FC<BusinessAppContextProps> = context => {
  const { channels, types, communications, employee, loading } = useCommunicationLookups(context)
  const { t } = useTranslation(translations)
  const initialParams = getInitialParams(context)
  const isDeleteMode = initialParams.mode === 'delete'
  const autoConfirmDelete = isDeleteMode && initialParams.autoConfirmDelete === true

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
      currentValue !== (formState.baseline.value || '')
    )
  }, [
    formState.baseline,
    formState.channelType,
    formState.valueType,
    formState.value,
    formState.isPhoneType,
    formState.selectedCountryCode,
    formState.phoneNumber
  ])

  useEffect(() => {
    if (!autoConfirmDelete) return
    const employeeId = initialParams.employeeId || context.userInfo?.employeeDetails?.employeeId
    dispatchProcessContinueEvent('pse_submit', {
      employeeId,
      event: 'pse_submit',
      mode: 'delete',
      employeeCommunication: {
        id: initialParams.communicationId,
        version: initialParams.version,
        employeeId,
        isDeleted: true
      },
      completeNotification: {
        type: 'success',
        message: t('notification-communication-deleted-success')
      }
    })
  }, [autoConfirmDelete, initialParams, context.userInfo?.employeeDetails?.employeeId, t])

  if (autoConfirmDelete) {
    return null
  }

  const validateForm = () => {
    if (isDeleteMode) return null
    const errors: string[] = []
    if (!formState.channelType) errors.push(validation.channelRequiredMessage)
    if (!formState.valueType) errors.push(validation.typeRequiredMessage)
    if (validation.valueValidationMessage) errors.push(validation.valueValidationMessage)
    return errors.length > 0 ? errors : null
  }

  const handlePreSubmit = async () => {
    const employeeId = initialParams.employeeId || context.userInfo?.employeeDetails?.employeeId

    if (isDeleteMode) {
      return {
        employeeId,
        event: 'pse_submit',
        mode: 'delete',
        employeeCommunication: {
          id: initialParams.communicationId,
          version: initialParams.version,
          employeeId,
          isDeleted: true
        },
        completeNotification: {
          type: 'success',
          message: t('notification-communication-deleted-success')
        }
      }
    }

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

    return {
      employeeId,
      event: 'pse_submit',
      employeeCommunication: {
        channelRef: formState.channelType,
        typeRef: formState.valueType,
        purpose: 'PRIVATE',
        value: formattedValue,
        employeeId,
        ...(typeof formState.baseline?.version === 'number' ? { version: formState.baseline?.version } : {}),
        ...(formState.baseline?.id ? { id: formState.baseline.id } : {})
      },
      completeNotification: {
        type: 'success',
        message: t('notification-communication-updated-success')
      }
    }
  }

  if (isDeleteMode) {
    return (
      <AppActionForm
        processType="delete"
        formData={{}}
        onSubmit={data => data}
        validateForm={validateForm}
        handlePreSubmit={handlePreSubmit}
        submitEventType="pse_submit"
        cancelEventType="pse_abort"
        submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
        submitButtonVariant="destructive"
        submitButtonTestId="flw_changeCommunication_btnDelete"
        cancelButtonTestId="flw_changeCommunication_btnCancel"
        data-testid={formatDataTestId(prefixDataTestId, 'DeleteContainer')}
      >
        <div className="gba:bg-white gba:max-w-xl gba:w-full gba:p-6">
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
          <DeleteLayout
            itemType={t('details-private-communication')}
            itemTitle={initialParams.value || ''}
            data-testid={formatDataTestId(prefixDataTestId, 'delete-layout')}
          />
        </div>
      </AppActionForm>
    )
  }

  return (
    <AppActionForm
      processType="update"
      formData={{}}
      onSubmit={data => data}
      validateForm={validateForm}
      handlePreSubmit={handlePreSubmit}
      isSubmitDisabled={!validation.isValid || !hasChanges}
      submitEventType="pse_submit"
      cancelEventType="pse_abort"
      submitButtonTestId="flw_changeRelationship_btnSubmit"
      cancelButtonTestId="flw_changeRelationship_btnCancel"
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
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
