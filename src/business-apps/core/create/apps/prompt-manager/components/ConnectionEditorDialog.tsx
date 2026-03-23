import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
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
  getFieldLabel,
  getFieldPlaceholder,
  getProviderConfigFields,
  getProviderDescription,
  getProviderTitle
} from './connectionsCatalog'

type EditorState =
  | { mode: 'create'; provider: ConnectorProviderODM }
  | { mode: 'edit'; connection: ExternalConnectionODM }

interface ConnectionEditorDialogProps {
  editorState: EditorState | null
  provider: ConnectorProviderODM | null
  onClose: () => void
  onCreate: (providerId: string, payload: ConnectorProviderInstantiationDetails) => Promise<void>
  onUpdate: (connectionId: string, payload: ExternalConnectionDetails) => Promise<void>
  t: (key: string, args?: Record<string, unknown>) => string
}

const parseJsonRecord = (value: string): Record<string, string> | null => {
  if (!value.trim()) return null
  const parsed = JSON.parse(value) as Record<string, string>
  return typeof parsed === 'object' && parsed !== null ? parsed : null
}

const stringifyJson = (value?: Record<string, string> | null): string =>
  value && Object.keys(value).length ? JSON.stringify(value, null, 2) : ''

export const ConnectionEditorDialog: React.FC<ConnectionEditorDialogProps> = ({
  editorState,
  provider,
  onClose,
  onCreate,
  onUpdate,
  t
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [transport, setTransport] = useState<'http' | 'sse' | 'websocket'>('http')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [configJson, setConfigJson] = useState('')
  const [envJson, setEnvJson] = useState('')
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const providerFields = useMemo(() => getProviderConfigFields(provider), [provider])
  const providerFieldKeys = useMemo(() => new Set(providerFields.map(field => field.key)), [providerFields])
  const showUrlField = provider?.kind === 'mcp' || !!url

  useEffect(() => {
    if (!editorState) return

    const connection = editorState.mode === 'edit' ? editorState.connection : null
    const rawConfig = connection?.config || {}
    const providerBoundValues = providerFields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = rawConfig[field.key] || ''
      return acc
    }, {})
    const extraConfig = Object.entries(rawConfig).reduce<Record<string, string>>((acc, [key, value]) => {
      if (!providerFieldKeys.has(key)) acc[key] = value
      return acc
    }, {})

    setName(connection?.name || getProviderTitle(t, provider) || '')
    setDescription(connection?.description || '')
    setUrl(connection?.url || '')
    setTransport(connection?.transport || 'http')
    setFieldValues(providerBoundValues)
    setConfigJson(stringifyJson(extraConfig))
    setEnvJson(stringifyJson(connection?.env))
    setActive(connection?.active !== false)
    setFormError(null)
  }, [editorState, provider, providerFieldKeys, providerFields, t])

  const handleFieldValueChange = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!editorState || !provider) return
    setFormError(null)
    setIsSaving(true)

    try {
      const fieldConfig = providerFields.reduce<Record<string, string>>((acc, field) => {
        const value = (fieldValues[field.key] || '').trim()
        if (value) acc[field.key] = value
        return acc
      }, {})
      const extraConfig = parseJsonRecord(configJson)
      const env = parseJsonRecord(envJson)
      const mergedConfig = Object.keys({ ...fieldConfig, ...(extraConfig || {}) }).length
        ? { ...fieldConfig, ...(extraConfig || {}) }
        : null

      if (editorState.mode === 'create') {
        await onCreate(editorState.provider.providerId || editorState.provider.provider_id || '', {
          name: name.trim(),
          description: description.trim() || undefined,
          url: url.trim() || null,
          transport: url.trim() ? transport : null,
          env,
          config: mergedConfig,
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
          consumerTypes:
            connection.consumerTypes ||
            connection.consumer_types ||
            provider.consumerTypes ||
            provider.consumer_types ||
            [],
          active,
          managed: connection.managed ?? false,
          internal: connection.internal ?? false
        })
      }

      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('connections-save-failed'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!editorState || !provider) {
    return null
  }

  return (
    <Dialog open={!!editorState} onOpenChange={open => (!open ? onClose() : undefined)}>
      <DialogContent data-testid="prompt-manager-connections-editor">
        <DialogHeader>
          <DialogTitle>
            {editorState.mode === 'edit' ? t('connections-edit-title') : t('connections-create-from-provider-title')}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          <div className="gba:rounded-xl gba:border gba:border-border gba:p-4 gba:space-y-1">
            <div className="gba:text-sm gba:font-semibold">{getProviderTitle(t, provider)}</div>
            <div className="gba:text-sm gba:text-muted-foreground">{getProviderDescription(t, provider)}</div>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label>{t('column-name')}</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                data-testid="prompt-manager-connections-form-name"
              />
            </div>
            <div className="gba:space-y-2">
              <Label>{t('connections-column-status')}</Label>
              <Select value={active ? 'active' : 'inactive'} onValueChange={value => setActive(value === 'active')}>
                <SelectTrigger data-testid="prompt-manager-connections-form-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('connections-status-active')}</SelectItem>
                  <SelectItem value="inactive">{t('connections-status-inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="gba:space-y-2">
            <Label>{t('connections-description-label')}</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="prompt-manager-connections-form-description"
            />
          </div>

          {showUrlField ? (
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label>{t('connections-url-label')}</Label>
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder={t('connections-url-placeholder')}
                  data-testid="prompt-manager-connections-form-url"
                />
              </div>
              <div className="gba:space-y-2">
                <Label>{t('connections-transport-label')}</Label>
                <Select value={transport} onValueChange={value => setTransport(value as 'http' | 'sse' | 'websocket')}>
                  <SelectTrigger data-testid="prompt-manager-connections-form-transport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">http</SelectItem>
                    <SelectItem value="sse">sse</SelectItem>
                    <SelectItem value="websocket">websocket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {providerFields.length ? (
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {providerFields.map(field => (
                <div key={field.key} className="gba:space-y-2">
                  <Label>{getFieldLabel(t, field.key)}</Label>
                  {field.fieldType === 'textarea' ? (
                    <Textarea
                      rows={4}
                      value={fieldValues[field.key] || ''}
                      onChange={e => handleFieldValueChange(field.key, e.target.value)}
                      placeholder={getFieldPlaceholder(t, field.key)}
                      required={field.required}
                      data-testid={`prompt-manager-connections-form-field-${field.key}`}
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
                      data-testid={`prompt-manager-connections-form-field-${field.key}`}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div className="gba:space-y-2">
            <Label>{t('connections-config-json-label')}</Label>
            <Textarea
              rows={6}
              value={configJson}
              onChange={e => setConfigJson(e.target.value)}
              placeholder='{"apiKey":"secret"}'
              data-testid="prompt-manager-connections-form-config"
            />
          </div>

          <div className="gba:space-y-2">
            <Label>{t('connections-env-json-label')}</Label>
            <Textarea
              rows={4}
              value={envJson}
              onChange={e => setEnvJson(e.target.value)}
              placeholder='{"REGION":"eu-central-1"}'
              data-testid="prompt-manager-connections-form-env"
            />
          </div>

          {formError ? <div className="gba:text-destructive">{formError}</div> : null}
        </div>

        <DialogFooter className="gba:gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('close')}
          </Button>
          <Button variant="default" onClick={() => void handleSave()} disabled={!name.trim() || isSaving}>
            {isSaving ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
