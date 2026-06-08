import React, { useMemo } from 'react'
import { Badge, Spinner, useTranslation } from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { ErrorAlert } from '@/components/error-alert'
import translations from '../../_i18n'

/**
 * Generic delete-popup primitive used by the Marketing extension's four
 * confirmation popups (campaign account / content / event / event-account).
 *
 * Each consumer was previously a verbatim copy of:
 *   1. resolve `<entity>Id` from `additionalData` or `psi_initialParameters`
 *   2. fetch the entity via a by-pk hook
 *   3. submit `{ <wrapperKey>: { id, version, isDeleted: true } }`
 *   4. spinner / ErrorAlert / AppActionForm with a title + secondary line
 *
 * Wrappers now pass only the bits that differ.
 */
export interface MarketingEntityDeletePopupProps extends BusinessAppContextProps {
  /** Key on `additionalData` / `psi_initialParameters` that holds the entity id. */
  idParameterKey: string
  /** Legacy/alternate keys tried when `idParameterKey` is absent (first match wins). */
  fallbackIdParameterKeys?: string[]
  /** Wrapper key used in the submit payload (e.g. `customerCampaignAccount`). */
  payloadKey: string
  /** `data-testid` prefix shared by the popup root + ErrorAlert + fields container. */
  dataTestId: string
  /** Translation key for the popup heading. */
  titleKey: Parameters<ReturnType<typeof useTranslation>['t']>[0]
  /**
   * Optional translation key for a confirmation question. When provided, the popup renders the
   * destructive warning-box layout (icon + question + entity name badge + "cannot be undone"),
   * matching the IRM core delete popups. When omitted, the plain title + secondary line is used.
   */
  confirmQuestionKey?: Parameters<ReturnType<typeof useTranslation>['t']>[0]
  /** Fallback context message used by the ErrorAlert when load fails. */
  errorContext: string
  /**
   * React hook that loads the entity by id. Must follow the by-pk hook contract:
   * `(accessToken: string, id: string | undefined) => { data, loading, error }`.
   *
   * Hooks here are passed by reference and invoked unconditionally to satisfy
   * the rules-of-hooks (the consumer renders exactly one popup per mount).
   */
  useEntity: (
    accessToken: string,
    id: string | undefined
  ) => {
    loading: boolean
    error: string | null
    entity: { id?: string; version?: number } | null
    secondaryLine?: string | null
  }
}

export const MarketingEntityDeletePopup: React.FC<MarketingEntityDeletePopupProps> = ({
  accessToken,
  additionalData,
  idParameterKey,
  fallbackIdParameterKeys,
  payloadKey,
  dataTestId,
  titleKey,
  confirmQuestionKey,
  errorContext,
  useEntity
}) => {
  const { t } = useTranslation(translations)
  const initialParameters = useMemo(
    () =>
      (additionalData as Record<string, unknown>)?.psi_taskPayload?.psi_initialParameters as
        | Record<string, unknown>
        | undefined,
    [additionalData]
  )
  const entityId = useMemo(() => {
    const ad = additionalData as Record<string, unknown>
    const keys = [idParameterKey, ...(fallbackIdParameterKeys ?? [])]
    for (const key of keys) {
      const fromAd = ad?.[key] as string | undefined
      if (fromAd) return fromAd
      const fromInit = initialParameters?.[key] as string | undefined
      if (fromInit) return fromInit
    }
    return undefined
  }, [additionalData, initialParameters, idParameterKey, fallbackIdParameterKeys])

  const { entity, secondaryLine, loading, error } = useEntity(accessToken || '', entityId)

  const handleSubmit = async () => ({
    [payloadKey]: {
      id: entity?.id,
      version: entity?.version,
      isDeleted: true
    }
  })

  if (!accessToken || error) {
    return (
      <ErrorAlert
        errors={[
          ...(accessToken ? [] : [{ type: 'accessToken' as const }]),
          ...(error ? [{ error, context: errorContext }] : [])
        ]}
        prefixDataTestId={dataTestId}
      />
    )
  }

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-8">
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ [idParameterKey]: entityId }}
      submitButtonText={t('common-delete')}
      submitButtonVariant="destructive"
      cancelButtonText={t('common-cancel')}
      isSubmitDisabled={!entity}
      data-testid={dataTestId}
    >
      <div className="gba:space-y-4" data-testid={`${dataTestId}-fields`}>
        <h2 className="gba:text-xl gba:font-semibold">{t(titleKey)}</h2>
        {confirmQuestionKey ? (
          <div
            className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
            data-testid={`${dataTestId}-warning`}
          >
            <div className="gba:flex">
              <div className="gba:shrink-0">
                <WarningIcon className="gba:h-5 gba:w-5 gba:text-destructive" weight="fill" />
              </div>
              <div className="gba:ml-3">
                <h3 className="gba:text-sm gba:font-medium gba:text-destructive">{t(confirmQuestionKey)}</h3>
                <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                  {secondaryLine && (
                    <p>
                      <strong>{t('common-name')}:</strong>{' '}
                      <Badge variant="outline" className="gba:ml-1">
                        {secondaryLine}
                      </Badge>
                    </p>
                  )}
                  <p className="gba:mt-2 gba:font-medium gba:text-destructive">{t('common-deleteWarning')}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          secondaryLine && <p className="gba:text-sm gba:text-muted-foreground">{secondaryLine}</p>
        )}
      </div>
    </AppActionForm>
  )
}

export default MarketingEntityDeletePopup
