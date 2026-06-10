import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Label, useTranslation } from '@newwork/nw-design-system'
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import translations from '../../_i18n'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { StartNodeConfig, DesignerMode, FlowStudioUpdateOptions } from '../../types/studioTypes'
import { FormBuilder } from '../form-builder'
import type { InputBlock } from '@/common/data/flow/types/flowTemplate'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'
import { useFunctionsServiceClient } from '@/common/network/functions/useFunctionsServiceClient'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { maskWebhookSecretDisplay, savedWebhookSecretMaskDisplay } from '../../utils/webhookCredentialUtils'

const WEBHOOK_API_PREFIX = '/api/triggers/webhooks'

function generateRandomSecret(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

interface WebhookStartConfigSectionProps {
  nodeId: string
  config: StartNodeConfig
  mode: DesignerMode
  accessToken: string
  studioData: FlowStudioData
  testId: string
  onFieldKeyRename: (args: { oldKey: string; newKey: string }, options?: FlowStudioUpdateOptions) => void
}

export const WebhookStartConfigSection: React.FC<WebhookStartConfigSectionProps> = ({
  nodeId,
  config,
  mode,
  accessToken,
  studioData,
  testId,
  onFieldKeyRename
}) => {
  const { t } = useTranslation(translations)
  const updateNodeConfig = useFlowStudioStore(s => s.updateNodeConfig)
  const templateId = useFlowStudioStore(s => s.templateId)
  const isDirty = useFlowStudioStore(s => s.isDirty)
  const webhookConfigRefreshKey = useFlowStudioStore(s => s.webhookConfigRefreshKey)
  const templateClient = useFlowTemplateClient(accessToken)
  const functionsClient = useFunctionsServiceClient(accessToken)

  const [webhookPath, setWebhookPath] = useState<string | null>(null)
  const [secretVisible, setSecretVisible] = useState(false)
  const [secretRevealed, setSecretRevealed] = useState<string | null>(null)
  const [secretBusy, setSecretBusy] = useState(false)
  const [secretError, setSecretError] = useState<string | null>(null)
  const [urlCopyOk, setUrlCopyOk] = useState(false)
  const [secretCopyOk, setSecretCopyOk] = useState(false)

  const webhookId = config.webhookConfig?.webhookId?.trim() || ''
  const secretRef = config.webhookConfig?.secretRef?.trim() || ''
  const pendingSecret = config.webhookConfig?.pendingWebhookSecret?.trim() || ''
  const hasStoredSecret = Boolean(secretRef)
  const hasUnsavedPending = Boolean(pendingSecret)

  const localWebhookPath = webhookId ? `${WEBHOOK_API_PREFIX}/${webhookId}` : ''
  const displayPath = webhookPath || localWebhookPath
  const displayUrl = displayPath ? `${getFlowEngineBaseUrl()}${displayPath}` : ''

  const setPendingSecret = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      updateNodeConfig(
        nodeId,
        {
          webhookConfig: {
            ...config.webhookConfig,
            pendingWebhookSecret: trimmed || undefined
          }
        },
        { markDirty: true }
      )
      setSecretVisible(false)
      setSecretRevealed(null)
    },
    [config.webhookConfig, nodeId, updateNodeConfig]
  )

  useEffect(() => {
    setSecretRevealed(null)
    setSecretVisible(false)
  }, [secretRef, pendingSecret])

  // Fetch canonical URL from CFE only after save (not while dirty — avoids 404 during PUT / before WEBHOOK is persisted).
  useEffect(() => {
    if (!templateId || config.triggerType !== 'WEBHOOK' || isDirty) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await templateClient.getWebhookConfig(templateId)
        if (!cancelled && data?.webhookPath) {
          setWebhookPath(data.webhookPath)
          if (data.webhookId && data.webhookId !== webhookId) {
            updateNodeConfig(
              nodeId,
              { webhookConfig: { ...config.webhookConfig, webhookId: data.webhookId } },
              { markDirty: false }
            )
          }
        }
      } catch {
        if (!cancelled) setWebhookPath(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    templateId,
    isDirty,
    webhookConfigRefreshKey,
    config.triggerType,
    templateClient,
    nodeId,
    updateNodeConfig,
    webhookId,
    config.webhookConfig
  ])

  const displaySecretText = useMemo(() => {
    if (secretVisible) {
      if (pendingSecret) return pendingSecret
      if (secretRevealed) return secretRevealed
      return ''
    }
    if (pendingSecret) return maskWebhookSecretDisplay(pendingSecret.length)
    if (hasStoredSecret) return savedWebhookSecretMaskDisplay()
    return t('webhook-secret-not-set')
  }, [hasStoredSecret, pendingSecret, secretRevealed, secretVisible, t])

  const handleGenerateSecret = useCallback(() => {
    setSecretError(null)
    const secret = generateRandomSecret()
    setPendingSecret(secret)
    setSecretVisible(true)
    setSecretRevealed(secret)
  }, [setPendingSecret])

  const handleToggleSecretVisible = useCallback(async () => {
    if (secretVisible) {
      setSecretVisible(false)
      setSecretRevealed(null)
      return
    }

    if (pendingSecret) {
      setSecretVisible(true)
      setSecretRevealed(pendingSecret)
      return
    }

    if (!secretRef) {
      setSecretVisible(true)
      setSecretRevealed('')
      return
    }

    setSecretBusy(true)
    setSecretError(null)
    try {
      const values = await functionsClient.resolveCredentialsBatch([secretRef])
      const value = values[secretRef]
      if (!value) {
        throw new Error(t('webhook-secret-reveal-empty'))
      }
      setSecretRevealed(value)
      setSecretVisible(true)
    } catch (e: unknown) {
      setSecretError(e instanceof Error ? e.message : String(e))
    } finally {
      setSecretBusy(false)
    }
  }, [functionsClient, pendingSecret, secretRef, secretVisible, t])

  const copyableSecret = secretVisible ? (pendingSecret || secretRevealed || '').trim() : ''

  const handleCopySecret = useCallback(async () => {
    if (!copyableSecret) return
    try {
      await navigator.clipboard.writeText(copyableSecret)
      setSecretCopyOk(true)
      window.setTimeout(() => setSecretCopyOk(false), 2000)
    } catch {
      setSecretError(t('webhook-secret-copy-failed'))
    }
  }, [copyableSecret, t])

  const handleCopyUrl = useCallback(async () => {
    if (!displayUrl) return
    try {
      await navigator.clipboard.writeText(displayUrl)
      setUrlCopyOk(true)
      window.setTimeout(() => setUrlCopyOk(false), 2000)
    } catch {
      setSecretError(t('webhook-url-copy-failed'))
    }
  }, [displayUrl, t])

  const canReveal = hasStoredSecret || hasUnsavedPending
  const canCopy = secretVisible && Boolean(copyableSecret)

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <FormBuilder
        fields={config.form ?? []}
        onChange={(fields: InputBlock[], options?: FlowStudioUpdateOptions) =>
          updateNodeConfig(nodeId, { form: fields }, options)
        }
        onFieldKeyRename={onFieldKeyRename}
        mode={mode}
        catalogs={studioData.catalogs}
        catalogsLoading={studioData.catalogsLoading}
        catalogsError={studioData.catalogsError}
        catalogsQuery={studioData.catalogsQuery}
        catalogsHasMore={studioData.catalogsHasMore}
        searchCatalogs={studioData.searchCatalogs}
        loadMoreCatalogs={studioData.loadMoreCatalogs}
        entities={studioData.entities}
        entitiesLoading={studioData.entitiesLoading}
        entitiesError={studioData.entitiesError}
        title={t('webhook-payload-schema')}
        description={t('webhook-payload-schema-desc')}
        data-testid={`${testId}-webhook-form-builder`}
      />

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('webhook-url-label')}</Label>
        <div className="gba:flex gba:gap-2">
          <Input
            value={displayUrl}
            readOnly
            placeholder={t('webhook-url-placeholder')}
            data-testid={`${testId}-webhook-url`}
            className="gba:flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!displayUrl}
            onClick={() => void handleCopyUrl()}
            data-testid={`${testId}-webhook-url-copy`}
            aria-label={t('webhook-url-copy')}
          >
            <Copy className="gba:h-3.5 gba:w-3.5" />
          </Button>
        </div>
        {urlCopyOk ? <p className="gba:text-xs gba:text-muted-foreground">{t('webhook-url-copied')}</p> : null}
        <p className="gba:text-xs gba:text-muted-foreground">{t('webhook-url-hint')}</p>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('webhook-secret-label')}</Label>

        <div className="gba:flex gba:items-center gba:gap-2">
          <div
            className="gba:flex-1 gba:min-h-9 gba:rounded-md gba:border gba:border-input gba:bg-muted/40 gba:px-3 gba:py-2 gba:font-mono gba:text-xs gba:tracking-wider gba:break-all"
            data-testid={`${testId}-webhook-secret-display`}
            aria-live="polite"
          >
            {displaySecretText}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={secretBusy || !canReveal}
            onClick={() => void handleToggleSecretVisible()}
            data-testid={`${testId}-webhook-secret-reveal`}
            aria-label={secretVisible ? t('webhook-secret-hide') : t('webhook-secret-show')}
          >
            {secretVisible ? <EyeOff className="gba:h-3.5 gba:w-3.5" /> : <Eye className="gba:h-3.5 gba:w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={secretBusy || !canCopy}
            onClick={() => void handleCopySecret()}
            data-testid={`${testId}-webhook-secret-copy`}
            aria-label={t('webhook-secret-copy')}
          >
            <Copy className="gba:h-3.5 gba:w-3.5" />
          </Button>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          <Input
            value={config.webhookConfig?.pendingWebhookSecret ?? ''}
            onChange={e => setPendingSecret(e.target.value)}
            type="text"
            autoComplete="off"
            disabled={secretBusy}
            placeholder={t('webhook-secret-manual-placeholder')}
            data-testid={`${testId}-webhook-secret-manual`}
            className="gba:flex-1 gba:font-mono gba:text-xs"
          />
          <span className="gba:text-xs gba:text-muted-foreground gba:shrink-0">{t('webhook-secret-or')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={secretBusy}
            onClick={handleGenerateSecret}
            data-testid={`${testId}-webhook-secret-generate`}
            className="gba:shrink-0"
          >
            <RefreshCw className="gba:h-3.5 gba:w-3.5 gba:mr-1" />
            {hasStoredSecret || hasUnsavedPending ? t('webhook-secret-regenerate') : t('webhook-secret-generate')}
          </Button>
        </div>

        {secretCopyOk ? <p className="gba:text-xs gba:text-muted-foreground">{t('webhook-secret-copied')}</p> : null}
        <p className="gba:text-xs gba:text-muted-foreground">{t('webhook-secret-hint')}</p>
        {hasUnsavedPending ? (
          <p className="gba:text-xs gba:text-amber-600 dark:gba:text-amber-500">{t('webhook-secret-unsaved-hint')}</p>
        ) : null}
        {secretRef ? (
          <p
            className="gba:text-xs gba:text-muted-foreground gba:font-mono"
            data-testid={`${testId}-webhook-secret-ref`}
          >
            {secretRef}
          </p>
        ) : null}
        {secretError ? <p className="gba:text-xs gba:text-destructive">{secretError}</p> : null}
      </div>
    </div>
  )
}
