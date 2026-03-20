import type {
  ConnectorProviderConfigField,
  ConnectorProviderODM,
  ExternalConnectionLane,
  ExternalConnectionODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'

type Translate = (key: string, args?: Record<string, unknown>) => string

export const CUSTOM_MCP_PROVIDER_ID = 'mcp.custom-server'
export const CUSTOM_STRUCTURED_PROVIDER_ID = 'anypoint-connect.custom-structured'
export const CUSTOM_UNSTRUCTURED_PROVIDER_ID = 'data-bridge.custom-unstructured'

const buildFieldKey = (...parts: string[]): string => parts.join('_')

export const laneOrder: ExternalConnectionLane[] = ['mcp_servers', 'anypoint_connect', 'data_bridge']

const providerCopyKeys: Record<string, { title: string; description: string }> = {
  [CUSTOM_MCP_PROVIDER_ID]: {
    title: 'connections-provider-custom-mcp-title',
    description: 'connections-provider-custom-mcp-description'
  },
  'anypoint-connect.sap': {
    title: 'connections-provider-sap-title',
    description: 'connections-provider-sap-description'
  },
  'anypoint-connect.oracle': {
    title: 'connections-provider-oracle-title',
    description: 'connections-provider-oracle-description'
  },
  [CUSTOM_STRUCTURED_PROVIDER_ID]: {
    title: 'connections-provider-custom-structured-title',
    description: 'connections-provider-custom-structured-description'
  },
  'data-bridge.sharepoint': {
    title: 'connections-provider-sharepoint-title',
    description: 'connections-provider-sharepoint-description'
  },
  'data-bridge.onedrive': {
    title: 'connections-provider-onedrive-title',
    description: 'connections-provider-onedrive-description'
  },
  'data-bridge.confluence': {
    title: 'connections-provider-confluence-title',
    description: 'connections-provider-confluence-description'
  },
  'data-bridge.google-drive': {
    title: 'connections-provider-google-drive-title',
    description: 'connections-provider-google-drive-description'
  },
  'data-bridge.s3': {
    title: 'connections-provider-s3-title',
    description: 'connections-provider-s3-description'
  },
  [CUSTOM_UNSTRUCTURED_PROVIDER_ID]: {
    title: 'connections-provider-custom-unstructured-title',
    description: 'connections-provider-custom-unstructured-description'
  }
}

const fieldLabelKeys: Record<string, string> = {
  [buildFieldKey('BASE', 'URL')]: 'connections-field-base-url-label',
  [buildFieldKey('API', 'KEY')]: 'connections-field-api-key-label',
  HOST: 'connections-field-host-label',
  PORT: 'connections-field-port-label',
  [buildFieldKey('SERVICE', 'NAME')]: 'connections-field-service-name-label',
  [buildFieldKey('USER', 'NAME')]: 'connections-field-username-label',
  [buildFieldKey('PASS', 'WORD')]: 'connections-field-password-label',
  [buildFieldKey('SITE', 'URL')]: 'connections-field-site-url-label',
  [buildFieldKey('TENANT', 'ID')]: 'connections-field-tenant-id-label',
  [buildFieldKey('CLIENT', 'ID')]: 'connections-field-client-id-label',
  [buildFieldKey('CLIENT', 'SECRET')]: 'connections-field-client-secret-label',
  [buildFieldKey('DRIVE', 'ID')]: 'connections-field-drive-id-label',
  [buildFieldKey('EMAIL')]: 'connections-field-email-label',
  [buildFieldKey('API', 'TOKEN')]: 'connections-field-api-token-label',
  [buildFieldKey('FOLDER', 'ID')]: 'connections-field-folder-id-label',
  [buildFieldKey('SERVICE', 'ACCOUNT', 'JSON')]: 'connections-field-service-account-json-label',
  BUCKET: 'connections-field-bucket-label',
  REGION: 'connections-field-region-label',
  [buildFieldKey('ACCESS', 'KEY', 'ID')]: 'connections-field-access-key-id-label',
  [buildFieldKey('SECRET', 'ACCESS', 'KEY')]: 'connections-field-secret-access-key-label',
  [buildFieldKey('AUTH', 'TOKEN')]: 'connections-field-auth-token-label'
}

const humanizeKey = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')

export const getProviderId = (provider?: ConnectorProviderODM | null): string =>
  provider?.providerId || provider?.provider_id || ''

export const getConnectionId = (connection?: ExternalConnectionODM | null): string =>
  connection?.connectionId || connection?.connection_id || ''

export const getConnectionProviderId = (connection?: ExternalConnectionODM | null): string =>
  connection?.providerId || connection?.provider_id || ''

export const inferProviderIdFromConnection = (connection?: ExternalConnectionODM | null): string => {
  const explicitProviderId = getConnectionProviderId(connection)
  if (explicitProviderId) return explicitProviderId
  if (connection?.kind === 'mcp') return CUSTOM_MCP_PROVIDER_ID
  if (connection?.lane === 'anypoint_connect' || connection?.kind === 'structured') return CUSTOM_STRUCTURED_PROVIDER_ID
  if (connection?.lane === 'data_bridge' || connection?.kind === 'unstructured') return CUSTOM_UNSTRUCTURED_PROVIDER_ID
  return ''
}

export const getProviderTitle = (t: Translate, provider?: ConnectorProviderODM | null): string => {
  const providerId = getProviderId(provider)
  const keys = providerCopyKeys[providerId]
  return keys ? t(keys.title) : provider?.name || ''
}

export const getProviderDescription = (t: Translate, provider?: ConnectorProviderODM | null): string => {
  const providerId = getProviderId(provider)
  const keys = providerCopyKeys[providerId]
  return keys ? t(keys.description) : provider?.description || ''
}

export const getProviderConfigFields = (provider?: ConnectorProviderODM | null): ConnectorProviderConfigField[] =>
  provider?.configFields || provider?.config_fields || []

export const getFieldLabel = (t: Translate, key: string): string => {
  const labelKey = fieldLabelKeys[key]
  return labelKey ? t(labelKey) : humanizeKey(key)
}

export const getFieldPlaceholder = (t: Translate, key: string): string => {
  const labelKey = fieldLabelKeys[key]
  return labelKey ? t(labelKey) : humanizeKey(key)
}
