import React, { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import type {
  ConnectorProviderInstantiationDetails,
  ConnectorProviderODM,
  ExternalConnectionDetails,
  ExternalConnectionODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import {
  CONSUMER_TYPE_OPTIONS,
  getConnectionConsumerTypes,
  getDefaultConsumerTypes,
  getFieldLabel,
  getFieldPlaceholder,
  getProviderConfigFields,
  getProviderDescription,
  getProviderHelpUrl,
  getProviderTitle
} from './connectCatalog'
import {
  type AuthState,
  buildAuthConfig,
  ConnectionAuthFields,
  DEFAULT_AUTH_STATE,
  extractAuthState,
  isAuthConfigKey
} from './ConnectionAuthFields'
import type { CredentialBindOption } from '@/common/utils/credentialBindOptions'
import { CredentialBindField } from '@/common/components/credential-bind/CredentialBindField'

type EditorState =
  | { mode: 'create'; provider: ConnectorProviderODM }
  | { mode: 'edit'; connection: ExternalConnectionODM }

interface ConnectionSetupDialogProps {
  editorState: EditorState | null
  provider: ConnectorProviderODM | null
  onClose: () => void
  onCreate: (providerId: string, payload: ConnectorProviderInstantiationDetails) => Promise<void>
  onUpdate: (connectionId: string, payload: ExternalConnectionDetails) => Promise<void>
  t: (key: string, args?: Record<string, unknown>) => string
  /** When provided, sensitive provider fields can bind stored credentials / bundle slots. */
  credentialBindOptions?: CredentialBindOption[]
}

const parseJsonRecord = (value: string): Record<string, string> | null => {
  if (!value.trim()) return null
  const parsed = JSON.parse(value) as Record<string, string>
  return typeof parsed === 'object' && parsed !== null ? parsed : null
}

const stringifyJson = (value?: Record<string, string> | null): string =>
  value && Object.keys(value).length ? JSON.stringify(value, null, 2) : ''

export const ConnectionSetupDialog: React.FC<ConnectionSetupDialogProps> = ({
  editorState,
  provider,
  onClose,
  onCreate,
  onUpdate,
  t,
  credentialBindOptions
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [transport, setTransport] = useState<'http' | 'sse'>('http')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [configJson, setConfigJson] = useState('')
  const [envJson, setEnvJson] = useState('')
  const [active, setActive] = useState(true)
  const [consumerTypes, setConsumerTypes] = useState<string[]>([])
  const [auth, setAuth] = useState<AuthState>(DEFAULT_AUTH_STATE)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const providerFields = useMemo(() => getProviderConfigFields(provider), [provider])
  const providerFieldKeys = useMemo(() => new Set(providerFields.map(field => field.key)), [providerFields])
  const helpUrl = useMemo(() => getProviderHelpUrl(provider), [provider])
  const showUrlField = provider?.kind === 'mcp' || !!url
  const showAuthSection = provider?.kind === 'mcp'
  const lightningDomainHint = useMemo(() => {
    const domainValue = fieldValues['DOMAIN'] || ''
    return /\.lightning\.force\.com/i.test(domainValue)
  }, [fieldValues])

  useEffect(() => {
    if (!editorState) return

    const connection = editorState.mode === 'edit' ? editorState.connection : null
    const rawConfig = connection?.config || {}
    const providerBoundValues = providerFields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = rawConfig[field.key] || ''
      return acc
    }, {})
    const extraConfig = Object.entries(rawConfig).reduce<Record<string, string>>((acc, [key, value]) => {
      if (!providerFieldKeys.has(key) && !isAuthConfigKey(key)) acc[key] = value
      return acc
    }, {})

    setName(connection?.name || getProviderTitle(t, provider) || '')
    setDescription(connection?.description || '')
    setUrl(connection?.url || '')
    setTransport((connection?.transport === 'sse' ? 'sse' : 'http') as 'http' | 'sse')
    setFieldValues(providerBoundValues)
    setAuth(connection ? extractAuthState(rawConfig) : DEFAULT_AUTH_STATE)
    setConfigJson(stringifyJson(extraConfig))
    setEnvJson(stringifyJson(connection?.env))
    setActive(connection?.active !== false)
    setConsumerTypes(connection ? getConnectionConsumerTypes(connection) : getDefaultConsumerTypes(provider))
    setFormError(null)
  }, [editorState, provider, providerFieldKeys, providerFields, t])

  const handleFieldValueChange = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }))
  }

  const handleConsumerTypeToggle = (value: string, checked: boolean) => {
    setConsumerTypes(prev => (checked ? [...prev, value] : prev.filter(v => v !== value)))
  }

  const handleSave = async () => {
    if (!editorState || !provider) return
    setFormError(null)

    const missingRequired = providerFields.filter(field => field.required && !(fieldValues[field.key] || '').trim())
    if (missingRequired.length > 0) {
      setFormError(t('connect-validation-required-fields'))
      return
    }

    setIsSaving(true)

    try {
      const fieldConfig = providerFields.reduce<Record<string, string>>((acc, field) => {
        const value = (fieldValues[field.key] || '').trim()
        if (value) acc[field.key] = value
        return acc
      }, {})
      const extraConfig = parseJsonRecord(configJson)
      const env = parseJsonRecord(envJson)
      const authConfig = showAuthSection ? buildAuthConfig(auth) : {}
      const allConfig = { ...fieldConfig, ...(extraConfig || {}), ...authConfig }
      const mergedConfig = Object.keys(allConfig).length ? allConfig : null

      if (editorState.mode === 'create') {
        await onCreate(editorState.provider.providerId || editorState.provider.provider_id || '', {
          name: name.trim(),
          description: description.trim() || undefined,
          url: url.trim() || null,
          transport: url.trim() ? transport : null,
          env,
          config: mergedConfig,
          consumerTypes,
          active
        })
      } else {
        const connection = editorState.connection
        const connectionId = connection.connectionId || connection.connection_id || ''
        await onUpdate(connectionId, {
          name: name.trim(),
          description: description.trim() || undefined,
          kind: connection.kind,
          lane: connection.lane,
          providerId:
            provider.providerId ||
            provider.provider_id ||
            '' ||
            connection.providerId ||
            connection.provider_id ||
            null,
          connectorId:
            connection.connectorId || connection.connector_id || provider.connectorId || provider.connector_id || null,
          connectorName: connection.connectorName || connection.connector_name || provider.name,
          url: url.trim() || null,
          transport: url.trim() ? transport : null,
          env,
          config: mergedConfig,
          consumerTypes,
          active,
          managed: connection.managed ?? false,
          internal: connection.internal ?? false
        })
      }

      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('connect-save-failed'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!editorState || !provider) {
    return null
  }

  return (
    <Dialog open={!!editorState} onOpenChange={open => (!open ? onClose() : undefined)}>
      <DialogContent className="gba:max-h-[85vh] gba:flex gba:flex-col" data-testid="newwork-connect-setup-dialog">
        <DialogHeader>
          <DialogTitle>{editorState.mode === 'edit' ? t('connect-edit-title') : t('connect-create-title')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:overflow-y-auto gba:flex-1 gba:pr-1">
          <div className="gba:rounded-xl gba:border gba:border-border gba:p-4 gba:space-y-2">
            <div className="gba:text-sm gba:font-semibold">{getProviderTitle(t, provider)}</div>
            <div className="gba:text-sm gba:text-muted-foreground">{getProviderDescription(t, provider)}</div>
            {helpUrl ? (
              <a
                href={helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-sm gba:font-medium gba:text-primary gba:hover:underline"
                data-testid="newwork-connect-form-help-link"
              >
                <ExternalLink className="gba:h-3.5 gba:w-3.5" />
                {t('connect-setup-guide')}
              </a>
            ) : null}
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label>{t('column-name')}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} data-testid="newwork-connect-form-name" />
            </div>
            <div className="gba:space-y-2">
              <Label>{t('connect-status-label')}</Label>
              <Select value={active ? 'active' : 'inactive'} onValueChange={value => setActive(value === 'active')}>
                <SelectTrigger data-testid="newwork-connect-form-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('connect-status-active')}</SelectItem>
                  <SelectItem value="inactive">{t('connect-status-inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="gba:space-y-2">
            <Label>{t('connect-description-label')}</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="newwork-connect-form-description"
            />
          </div>

          {showUrlField ? (
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label>{t('connect-url-label')}</Label>
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder={t('connect-url-placeholder')}
                  data-testid="newwork-connect-form-url"
                />
              </div>
              <div className="gba:space-y-2">
                <Label>{t('connect-transport-label')}</Label>
                <Select value={transport} onValueChange={value => setTransport(value as 'http' | 'sse')}>
                  <SelectTrigger data-testid="newwork-connect-form-transport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP (Streamable)</SelectItem>
                    <SelectItem value="sse">SSE (Legacy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {showAuthSection ? (
            <ConnectionAuthFields
              auth={auth}
              onChange={setAuth}
              t={t}
              credentialBindOptions={credentialBindOptions}
            />
          ) : null}

          {providerFields.length ? (
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {providerFields.map(field => (
                <div
                  key={field.key}
                  className={`gba:space-y-2${field.fieldType === 'textarea' ? ' gba:col-span-2' : ''}`}
                >
                  <Label>
                    {getFieldLabel(t, field.key)}
                    {field.required ? <span className="gba:text-destructive gba:ml-0.5">*</span> : null}
                  </Label>
                  {field.fieldType === 'textarea' ? (
                    <Textarea
                      rows={3}
                      className="gba:max-h-32 gba:resize-none gba:font-mono gba:text-xs"
                      value={fieldValues[field.key] || ''}
                      onChange={e => handleFieldValueChange(field.key, e.target.value)}
                      placeholder={getFieldPlaceholder(t, field.key)}
                      required={field.required}
                      data-testid={`newwork-connect-form-field-${field.key}`}
                    />
                  ) : credentialBindOptions?.length &&
                    (field.fieldType === 'password' || field.fieldType === 'text' || field.fieldType === 'url') ? (
                    <CredentialBindField
                      value={fieldValues[field.key] || ''}
                      onChange={v => handleFieldValueChange(field.key, v)}
                      bindOptions={credentialBindOptions}
                      plainInputType={field.fieldType === 'password' ? 'password' : 'text'}
                      plainPlaceholder={getFieldPlaceholder(t, field.key)}
                      data-testid={`newwork-connect-form-field-${field.key}`}
                    />
                  ) : (
                    <Input
                      type={
                        field.fieldType === 'password'
                          ? 'password'
                          : field.fieldType === 'number'
                            ? 'number'
                            : field.fieldType === 'url'
                              ? 'url'
                              : 'text'
                      }
                      value={fieldValues[field.key] || ''}
                      onChange={e => handleFieldValueChange(field.key, e.target.value)}
                      placeholder={getFieldPlaceholder(t, field.key)}
                      required={field.required}
                      data-testid={`newwork-connect-form-field-${field.key}`}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {lightningDomainHint ? (
            <p
              className="gba:text-xs gba:text-warning-foreground gba:bg-warning/10 gba:border gba:border-warning/20 gba:rounded-lg gba:px-3 gba:py-2"
              data-testid="newwork-connect-lightning-hint"
            >
              {t('connect-validation-lightning-domain')}
            </p>
          ) : null}

          <div className="gba:space-y-3">
            <Label>{t('connect-consumer-types-label')}</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-2" data-testid="newwork-connect-form-consumer-types">
              {CONSUMER_TYPE_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className="gba:flex gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:px-3 gba:py-2 gba:text-sm gba:cursor-pointer gba:transition-colors gba:hover:bg-accent"
                >
                  <Checkbox
                    checked={consumerTypes.includes(option.value)}
                    onCheckedChange={(checked: boolean) => handleConsumerTypeToggle(option.value, checked)}
                    data-testid={`newwork-connect-form-consumer-${option.value}`}
                  />
                  <span>{t(option.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="gba:space-y-2">
            <Label>{t('connect-config-json-label')}</Label>
            <Textarea
              rows={3}
              className="gba:max-h-32 gba:resize-none gba:font-mono gba:text-xs"
              value={configJson}
              onChange={e => setConfigJson(e.target.value)}
              placeholder='{"apiKey":"secret"}'
              data-testid="newwork-connect-form-config"
            />
          </div>

          <div className="gba:space-y-2">
            <Label>{t('connect-env-json-label')}</Label>
            <Textarea
              rows={3}
              className="gba:max-h-32 gba:resize-none gba:font-mono gba:text-xs"
              value={envJson}
              onChange={e => setEnvJson(e.target.value)}
              placeholder='{"REGION":"eu-central-1"}'
              data-testid="newwork-connect-form-env"
            />
          </div>

          {formError ? (
            <div className="gba:text-destructive" data-testid="newwork-connect-form-error">
              {formError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gba:gap-2">
          <Button variant="secondary" onClick={onClose} data-testid="newwork-connect-form-close">
            {t('close')}
          </Button>
          <Button
            variant="default"
            onClick={() => void handleSave()}
            disabled={!name.trim() || isSaving}
            data-testid="newwork-connect-form-save"
          >
            {isSaving ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
