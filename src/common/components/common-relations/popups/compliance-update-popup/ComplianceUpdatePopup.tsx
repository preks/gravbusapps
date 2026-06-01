import React, { useEffect } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogSelect } from '@/components/catalog-select'
import { AppActionForm } from '@/components/app-action-form'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { ComplianceUpdateFormFields } from './ComplianceUpdateFormFields'

const complianceSchema = z.object({
  singleOptIn: z.enum(['true', 'false']).default('false'),
  singleOptInDate: z.string().optional(),
  doubleOptIn: z.enum(['true', 'false']).default('false'),
  doubleOptInDate: z.string().optional(),
  optInSourceRef: z.string().optional(),
  optInStatusRef: z.string().optional()
})

type ComplianceSchemaValues = z.infer<typeof complianceSchema>

export interface ComplianceEntity {
  id: string
  version?: string | number | null
  singleOptIn?: boolean | null
  singleOptInDate?: string | null
  doubleOptIn?: boolean | null
  doubleOptInDate?: string | null
  optInSource?: { id?: string | null } | null
  optInSourceRef?: string | null
  optInStatus?: { id?: string | null } | null
  optInStatusRef?: string | null
}

export interface ComplianceUpdatePopupProps extends BusinessAppContextProps {
  entityType: 'lead' | 'contact'
  entityId: string
  entity: ComplianceEntity | null
  loading: boolean
  error: string | null
  popupTestId: string
}

const mapBooleanToFormValue = (value?: boolean | null): ComplianceSchemaValues['singleOptIn'] => {
  return value === true ? 'true' : 'false'
}

const mapFormValueToBoolean = (value: ComplianceSchemaValues['singleOptIn']): boolean | null => {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return null
}

const toDateInputValue = (value?: string | null): string => {
  if (!value) {
    return ''
  }

  return value.split('T')[0]
}

const toNullableString = (value?: string): string | null => {
  if (!value) {
    return null
  }

  return value.trim() === '' ? null : value
}

const toNullableInstantString = (value?: string): string | null => {
  const normalized = toNullableString(value)
  if (!normalized) {
    return null
  }

  // Backend expects java.time.Instant (full ISO timestamp), not date-only strings.
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00.000Z`
  }

  return normalized
}

export const ComplianceUpdatePopup: React.FC<ComplianceUpdatePopupProps> = ({
  entityType,
  entityId,
  entity,
  loading,
  error,
  popupTestId,
  ...props
}) => {
  const form = useForm({
    resolver: zodResolver(complianceSchema),
    defaultValues: {
      singleOptIn: 'false',
      singleOptInDate: '',
      doubleOptIn: 'false',
      doubleOptInDate: '',
      optInSourceRef: '',
      optInStatusRef: ''
    }
  })

  useEffect(() => {
    if (!entity) {
      return
    }

    form.reset({
      singleOptIn: mapBooleanToFormValue(entity.singleOptIn),
      singleOptInDate: toDateInputValue(entity.singleOptInDate),
      doubleOptIn: mapBooleanToFormValue(entity.doubleOptIn),
      doubleOptInDate: toDateInputValue(entity.doubleOptInDate),
      optInSourceRef: entity.optInSource?.id || entity.optInSourceRef || '',
      optInStatusRef: entity.optInStatus?.id || entity.optInStatusRef || ''
    })
  }, [entity, form])

  useEffect(() => {
    if (loading) {
      return
    }

    const applyModalWidth = (): Array<{
      element: HTMLElement
      width: string
      maxWidth: string
      minWidth: string
    }> => {
      const formElement = document.querySelector(`[data-testid="${popupTestId}-form"]`) as HTMLElement | null
      if (!formElement) {
        return []
      }

      const dialogElement = formElement.closest('[role="dialog"]') as HTMLElement | null
      const dialogContent = dialogElement?.firstElementChild as HTMLElement | null
      const candidates = [dialogElement, dialogContent].filter(Boolean) as HTMLElement[]

      const previousStyles = candidates.map(element => ({
        element,
        width: element.style.width,
        maxWidth: element.style.maxWidth,
        minWidth: element.style.minWidth
      }))

      for (const candidate of candidates) {
        candidate.style.width = 'min(90vw, 520px)'
        candidate.style.maxWidth = '520px'
        candidate.style.minWidth = 'unset'
      }

      return previousStyles
    }

    let previousStyles = applyModalWidth()
    const timeoutId =
      previousStyles.length === 0
        ? globalThis.setTimeout(() => {
            previousStyles = applyModalWidth()
          }, 0)
        : null

    return () => {
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId)
      }

      for (const entry of previousStyles) {
        entry.element.style.width = entry.width
        entry.element.style.maxWidth = entry.maxWidth
        entry.element.style.minWidth = entry.minWidth
      }
    }
  }, [loading, popupTestId])

  const handleSubmit = async (values: ComplianceSchemaValues) => {
    if (!entity) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'crm.compliance.error.missingEntity',
          'Record data is not available for update'
        )
      )
    }

    const entityVersion =
      typeof entity.version === 'string'
        ? Number.parseInt(entity.version, 10) || 0
        : (entity.version as number | null | undefined) || 0

    return {
      changeMode: 'UPDATE',
      [entityType]: {
        id: entity.id,
        version: entityVersion,
        singleOptIn: mapFormValueToBoolean(values.singleOptIn),
        singleOptInDate: toNullableInstantString(values.singleOptInDate),
        doubleOptIn: mapFormValueToBoolean(values.doubleOptIn),
        doubleOptInDate: toNullableInstantString(values.doubleOptInDate),
        optInSourceRef: toNullableString(values.optInSourceRef),
        optInStatusRef: toNullableString(values.optInStatusRef)
      }
    }
  }

  if (!entityId) {
    return (
      <Alert variant="destructive" data-testid={`${popupTestId}-missing-id`}>
        <AlertDescription>
          {getTranslationFromI18nKeyAndLabel('crm.compliance.error.missingEntityId', 'No record ID was provided')}
        </AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid={`${popupTestId}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${popupTestId}-error`}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!entity) {
    return (
      <Alert variant="destructive" data-testid={`${popupTestId}-missing-entity`}>
        <AlertDescription>
          {getTranslationFromI18nKeyAndLabel('crm.compliance.error.entityNotFound', 'Record not found')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <CatalogSelect.Provider
      accessToken={props.accessToken}
      userInfo={props.userInfo}
      additionalData={props.additionalData}
      form={form}
    >
      <AppActionForm
        processType="update"
        onSubmit={handleSubmit}
        formData={form.getValues()}
        form={form}
        schema={complianceSchema}
        data-testid={`${popupTestId}-form`}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm.compliance.updateAction', 'Update compliance data')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      >
        <div className="gba:space-y-6 gba:w-full" data-testid={`${popupTestId}-content`}>
          <h2 className="gba:text-xl gba:font-semibold gba:mb-1" data-testid={`${popupTestId}-title`}>
            {getTranslationFromI18nKeyAndLabel('crm.compliance.updateTitle', 'Update compliance data')}
          </h2>

          <ComplianceUpdateFormFields control={form.control} />
        </div>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

ComplianceUpdatePopup.displayName = 'ComplianceUpdatePopup'

export default ComplianceUpdatePopup
