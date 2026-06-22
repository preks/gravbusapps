import React, { useMemo } from 'react'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useCommunicationLookups } from './queries/ChangeCommunicationQueries'
import { FormHeader } from './components/FormHeader'
import { ChannelTypeField } from './components/ChannelTypeField'
import { TypeField } from './components/TypeField'
import { ValueField } from './components/ValueField'
import { useCommunicationFormState } from './hooks/useCommunicationFormState'
import { useCommunicationValidation } from './hooks/useCommunicationValidation'
import { buildPhoneNumberWithCountryCode } from '@/common/utils/validation/phoneNumberValidation'
import { Alert, AlertDescription, LocalizationProvider, useTranslation } from '@newwork/nw-design-system'
import translations from '../../apps/employee-record/_i18n'
import { DeleteLayout } from '@/components/delete-layout/DeleteLayout'

const prefixDataTestId = 'ChangePrivateCommunicationScreen'

function getInitialParams(context: BusinessAppContextProps) {
  return (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters ?? {}
}

const ChangePrivateCommunicationScreenContent: React.FC<BusinessAppContextProps> = context => {
  const { channels, types, communications, employee, addressCountryCode, loading } = useCommunicationLookups(context)
  const { t } = useTranslation(translations)
  const initialParams = getInitialParams(context)
  const isDeleteMode = initialParams.mode === 'delete'
  const employeeId = initialParams.employeeId || context.userInfo?.employeeDetails?.employeeId
  const isEmployeeContextMissing = !employeeId
  const employeeContextError = t('communication-employee-context-missing')

  const formState = useCommunicationFormState({
    channels,
    types,
    communications,
    loading,
    initialCommunicationId: initialParams.communicationId,
    defaultCountryCode: addressCountryCode
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
      currentValue = buildPhoneNumberWithCountryCode(formState.phoneNumber, formState.selectedCountryCode)
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
  const shouldShowLoadedRecordValidation = Boolean(formState.baseline?.id && !validation.isValid)

  const validateForm = () => {
    if (isEmployeeContextMissing) return [employeeContextError]
    if (isDeleteMode) return null
    const errors: string[] = []
    if (!formState.channelType) errors.push(validation.channelRequiredMessage)
    if (!formState.valueType) errors.push(validation.typeRequiredMessage)
    if (validation.valueValidationMessage) errors.push(validation.valueValidationMessage)
    return errors.length > 0 ? errors : null
  }

  const handlePreSubmit = async () => {
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
      formattedValue = buildPhoneNumberWithCountryCode(formState.phoneNumber, formState.selectedCountryCode)
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
        isSubmitDisabled={isEmployeeContextMissing}
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
          {isEmployeeContextMissing && (
            <Alert variant="destructive" className="gba:mb-4" data-testid="change-communication-context-error">
              <AlertDescription>{employeeContextError}</AlertDescription>
            </Alert>
          )}
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
      isSubmitDisabled={isEmployeeContextMissing || !validation.isValid || !hasChanges}
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
          {isEmployeeContextMissing && (
            <Alert variant="destructive" data-testid="change-communication-context-error">
              <AlertDescription>{employeeContextError}</AlertDescription>
            </Alert>
          )}
          <ChannelTypeField
            value={formState.channelType}
            onChange={formState.setChannelType}
            channels={channels}
            loading={loading}
            error={validation.channelRequiredMessage}
            touched={formState.channelTouched || shouldShowLoadedRecordValidation}
          />

          <TypeField
            value={formState.valueType}
            onChange={formState.setValueType}
            types={types}
            loading={loading}
            error={validation.typeRequiredMessage}
            touched={formState.typeTouched || shouldShowLoadedRecordValidation}
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
            touched={formState.valueTouched || shouldShowLoadedRecordValidation}
          />
        </div>
      </div>
    </AppActionForm>
  )
}

const ChangePrivateCommunicationScreen: React.FC<BusinessAppContextProps> = context => {
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])
  return (
    <LocalizationProvider locale={locale as any}>
      <ChangePrivateCommunicationScreenContent {...context} />
    </LocalizationProvider>
  )
}

export default ChangePrivateCommunicationScreen
