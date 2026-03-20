import type { LucideIcon } from 'lucide-react'
import {
  BookText,
  Building2,
  Cable,
  Cloud,
  CloudCog,
  Compass,
  DatabaseZap,
  FileBox,
  FolderOpen,
  Github,
  HardDrive,
  Landmark,
  MapPin,
  MessageSquare,
  NotebookText,
  Search,
  Server,
  Warehouse
} from 'lucide-react'
import type {
  ConnectorProviderConfigField,
  ConnectorProviderODM,
  ExternalConnectionLane,
  ExternalConnectionODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'

type Translate = (key: string, args?: Record<string, unknown>) => string

export type ConnectLane = ExternalConnectionLane

export const CONNECT_LANES: ConnectLane[] = ['anypoint_connect', 'data_bridge', 'mcp_servers']

export const LANE_CONFIG: Record<
  ExternalConnectionLane,
  { titleKey: string; descriptionKey: string; availableProvidersKey: string }
> = {
  anypoint_connect: {
    titleKey: 'connect-group-anypoint-title',
    descriptionKey: 'connect-group-anypoint-description',
    availableProvidersKey: 'connect-group-anypoint-available'
  },
  data_bridge: {
    titleKey: 'connect-group-data-bridge-title',
    descriptionKey: 'connect-group-data-bridge-description',
    availableProvidersKey: 'connect-group-data-bridge-available'
  },
  mcp_servers: {
    titleKey: 'connect-group-mcp-title',
    descriptionKey: 'connect-group-mcp-description',
    availableProvidersKey: 'connect-group-mcp-available'
  }
}

export const CUSTOM_MCP_PROVIDER_ID = 'mcp.custom-server'
export const CUSTOM_STRUCTURED_PROVIDER_ID = 'anypoint-connect.custom-structured'
export const CUSTOM_UNSTRUCTURED_PROVIDER_ID = 'data-bridge.custom-unstructured'

const buildFieldKey = (...parts: string[]): string => parts.join('_')

const providerIconMap: Record<string, LucideIcon> = {
  [CUSTOM_MCP_PROVIDER_ID]: Cable,
  'mcp.github': Github,
  'mcp.slack': MessageSquare,
  'mcp.jira': BookText,
  'mcp.brave-search': Search,
  'mcp.sentry': Compass,
  'mcp.linear': Compass,
  'mcp.google-maps': MapPin,
  'mcp.puppeteer': Compass,
  'mcp.nw-product-report': Compass,
  'anypoint-connect.sap': Building2,
  'anypoint-connect.oracle': Server,
  'anypoint-connect.salesforce': Cloud,
  'anypoint-connect.hubspot': Cloud,
  'anypoint-connect.postgresql': DatabaseZap,
  'anypoint-connect.mysql': DatabaseZap,
  'anypoint-connect.mongodb': DatabaseZap,
  'anypoint-connect.snowflake': DatabaseZap,
  'anypoint-connect.dynamics365': Building2,
  'anypoint-connect.servicenow': Server,
  [CUSTOM_STRUCTURED_PROVIDER_ID]: DatabaseZap,
  'data-bridge.sharepoint': Landmark,
  'data-bridge.onedrive': Cloud,
  'data-bridge.confluence': NotebookText,
  'data-bridge.google-drive': HardDrive,
  'data-bridge.s3': Warehouse,
  'data-bridge.notion': NotebookText,
  'data-bridge.dropbox': FolderOpen,
  'data-bridge.box': FolderOpen,
  'data-bridge.azure-blob': Cloud,
  'data-bridge.gcs': Warehouse,
  [CUSTOM_UNSTRUCTURED_PROVIDER_ID]: FileBox
}

export const getProviderIcon = (providerId: string): LucideIcon => providerIconMap[providerId] || CloudCog

export const getProviderIconForProvider = (provider?: ConnectorProviderODM | null): LucideIcon =>
  getProviderIcon(getProviderId(provider))

export const getLaneIcon = (lane: ExternalConnectionLane): LucideIcon => {
  if (lane === 'anypoint_connect') return DatabaseZap
  if (lane === 'data_bridge') return FolderOpen
  return Cable
}

const providerCopyKeys: Record<string, { title: string; description: string }> = {
  [CUSTOM_MCP_PROVIDER_ID]: {
    title: 'connect-provider-custom-mcp-title',
    description: 'connect-provider-custom-mcp-description'
  },
  'mcp.github': {
    title: 'connect-provider-github-title',
    description: 'connect-provider-github-description'
  },
  'mcp.slack': {
    title: 'connect-provider-slack-title',
    description: 'connect-provider-slack-description'
  },
  'mcp.jira': {
    title: 'connect-provider-jira-title',
    description: 'connect-provider-jira-description'
  },
  'mcp.brave-search': {
    title: 'connect-provider-brave-search-title',
    description: 'connect-provider-brave-search-description'
  },
  'mcp.sentry': {
    title: 'connect-provider-sentry-title',
    description: 'connect-provider-sentry-description'
  },
  'mcp.linear': {
    title: 'connect-provider-linear-title',
    description: 'connect-provider-linear-description'
  },
  'mcp.google-maps': {
    title: 'connect-provider-google-maps-title',
    description: 'connect-provider-google-maps-description'
  },
  'mcp.puppeteer': {
    title: 'connect-provider-puppeteer-title',
    description: 'connect-provider-puppeteer-description'
  },
  'mcp.nw-product-report': {
    title: 'connect-provider-nw-product-report-title',
    description: 'connect-provider-nw-product-report-description'
  },
  'anypoint-connect.sap': {
    title: 'connect-provider-sap-title',
    description: 'connect-provider-sap-description'
  },
  'anypoint-connect.oracle': {
    title: 'connect-provider-oracle-title',
    description: 'connect-provider-oracle-description'
  },
  'anypoint-connect.salesforce': {
    title: 'connect-provider-salesforce-title',
    description: 'connect-provider-salesforce-description'
  },
  'anypoint-connect.hubspot': {
    title: 'connect-provider-hubspot-title',
    description: 'connect-provider-hubspot-description'
  },
  'anypoint-connect.postgresql': {
    title: 'connect-provider-postgresql-title',
    description: 'connect-provider-postgresql-description'
  },
  'anypoint-connect.mysql': {
    title: 'connect-provider-mysql-title',
    description: 'connect-provider-mysql-description'
  },
  'anypoint-connect.mongodb': {
    title: 'connect-provider-mongodb-title',
    description: 'connect-provider-mongodb-description'
  },
  'anypoint-connect.snowflake': {
    title: 'connect-provider-snowflake-title',
    description: 'connect-provider-snowflake-description'
  },
  'anypoint-connect.dynamics365': {
    title: 'connect-provider-dynamics365-title',
    description: 'connect-provider-dynamics365-description'
  },
  'anypoint-connect.servicenow': {
    title: 'connect-provider-servicenow-title',
    description: 'connect-provider-servicenow-description'
  },
  [CUSTOM_STRUCTURED_PROVIDER_ID]: {
    title: 'connect-provider-custom-structured-title',
    description: 'connect-provider-custom-structured-description'
  },
  'data-bridge.sharepoint': {
    title: 'connect-provider-sharepoint-title',
    description: 'connect-provider-sharepoint-description'
  },
  'data-bridge.onedrive': {
    title: 'connect-provider-onedrive-title',
    description: 'connect-provider-onedrive-description'
  },
  'data-bridge.confluence': {
    title: 'connect-provider-confluence-title',
    description: 'connect-provider-confluence-description'
  },
  'data-bridge.google-drive': {
    title: 'connect-provider-google-drive-title',
    description: 'connect-provider-google-drive-description'
  },
  'data-bridge.s3': {
    title: 'connect-provider-s3-title',
    description: 'connect-provider-s3-description'
  },
  'data-bridge.notion': {
    title: 'connect-provider-notion-title',
    description: 'connect-provider-notion-description'
  },
  'data-bridge.dropbox': {
    title: 'connect-provider-dropbox-title',
    description: 'connect-provider-dropbox-description'
  },
  'data-bridge.box': {
    title: 'connect-provider-box-title',
    description: 'connect-provider-box-description'
  },
  'data-bridge.azure-blob': {
    title: 'connect-provider-azure-blob-title',
    description: 'connect-provider-azure-blob-description'
  },
  'data-bridge.gcs': {
    title: 'connect-provider-gcs-title',
    description: 'connect-provider-gcs-description'
  },
  [CUSTOM_UNSTRUCTURED_PROVIDER_ID]: {
    title: 'connect-provider-custom-unstructured-title',
    description: 'connect-provider-custom-unstructured-description'
  }
}

const fieldLabelKeys: Record<string, string> = {
  [buildFieldKey('BASE', 'URL')]: 'connect-field-base-url-label',
  [buildFieldKey('API', 'KEY')]: 'connect-field-api-key-label',
  HOST: 'connect-field-host-label',
  PORT: 'connect-field-port-label',
  [buildFieldKey('SERVICE', 'NAME')]: 'connect-field-service-name-label',
  [buildFieldKey('USER', 'NAME')]: 'connect-field-username-label',
  [buildFieldKey('PASS', 'WORD')]: 'connect-field-password-label',
  [buildFieldKey('SITE', 'URL')]: 'connect-field-site-url-label',
  [buildFieldKey('TENANT', 'ID')]: 'connect-field-tenant-id-label',
  [buildFieldKey('CLIENT', 'ID')]: 'connect-field-client-id-label',
  [buildFieldKey('CLIENT', 'SECRET')]: 'connect-field-client-secret-label',
  [buildFieldKey('DRIVE', 'ID')]: 'connect-field-drive-id-label',
  [buildFieldKey('EMAIL')]: 'connect-field-email-label',
  [buildFieldKey('API', 'TOKEN')]: 'connect-field-api-token-label',
  [buildFieldKey('FOLDER', 'ID')]: 'connect-field-folder-id-label',
  [buildFieldKey('SERVICE', 'ACCOUNT', 'JSON')]: 'connect-field-service-account-json-label',
  BUCKET: 'connect-field-bucket-label',
  REGION: 'connect-field-region-label',
  [buildFieldKey('ACCESS', 'KEY', 'ID')]: 'connect-field-access-key-id-label',
  [buildFieldKey('SECRET', 'ACCESS', 'KEY')]: 'connect-field-secret-access-key-label',
  [buildFieldKey('AUTH', 'TOKEN')]: 'connect-field-auth-token-label',
  [buildFieldKey('INSTANCE', 'URL')]: 'connect-field-instance-url-label',
  [buildFieldKey('ACCESS', 'TOKEN')]: 'connect-field-access-token-label',
  [buildFieldKey('PORTAL', 'ID')]: 'connect-field-portal-id-label',
  DATABASE: 'connect-field-database-label',
  [buildFieldKey('CONNECTION', 'STRING')]: 'connect-field-connection-string-label',
  ACCOUNT: 'connect-field-account-label',
  WAREHOUSE: 'connect-field-warehouse-label',
  SCHEMA: 'connect-field-schema-label',
  [buildFieldKey('DATABASE', 'ID')]: 'connect-field-database-id-label',
  [buildFieldKey('FOLDER', 'PATH')]: 'connect-field-folder-path-label',
  [buildFieldKey('ACCOUNT', 'NAME')]: 'connect-field-account-name-label',
  [buildFieldKey('ACCOUNT', 'KEY')]: 'connect-field-account-key-label',
  [buildFieldKey('CONTAINER', 'NAME')]: 'connect-field-container-name-label',
  [buildFieldKey('GITHUB', 'PERSONAL', 'ACCESS', 'TOKEN')]: 'connect-field-github-pat-label',
  [buildFieldKey('SLACK', 'BOT', 'TOKEN')]: 'connect-field-slack-bot-token-label',
  [buildFieldKey('SLACK', 'TEAM', 'ID')]: 'connect-field-slack-team-id-label',
  [buildFieldKey('BRAVE', 'API', 'KEY')]: 'connect-field-brave-api-key-label',
  [buildFieldKey('SENTRY', 'AUTH', 'TOKEN')]: 'connect-field-sentry-auth-token-label',
  [buildFieldKey('ORGANIZATION', 'SLUG')]: 'connect-field-organization-slug-label',
  [buildFieldKey('LINEAR', 'API', 'KEY')]: 'connect-field-linear-api-key-label',
  [buildFieldKey('JIRA', 'URL')]: 'connect-field-jira-url-label',
  [buildFieldKey('JIRA', 'EMAIL')]: 'connect-field-jira-email-label',
  [buildFieldKey('JIRA', 'API', 'TOKEN')]: 'connect-field-jira-api-token-label',
  [buildFieldKey('GOOGLE', 'MAPS', 'API', 'KEY')]: 'connect-field-google-maps-api-key-label'
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

export const getProviderHelpUrl = (provider?: ConnectorProviderODM | null): string | null =>
  provider?.helpUrl || provider?.help_url || null

export const CONSUMER_TYPE_OPTIONS = [
  { value: 'mcp_tool', labelKey: 'connect-consumer-mcp-tool' },
  { value: 'task_expert', labelKey: 'connect-consumer-task-expert' },
  { value: 'function', labelKey: 'connect-consumer-function' },
  { value: 'board_import', labelKey: 'connect-consumer-board-import' },
  { value: 'document_import', labelKey: 'connect-consumer-document-import' },
  { value: 'nexus', labelKey: 'connect-consumer-nexus' }
] as const

export type ConsumerTypeValue = (typeof CONSUMER_TYPE_OPTIONS)[number]['value']

export const getDefaultConsumerTypes = (provider?: ConnectorProviderODM | null): string[] =>
  provider?.consumerTypes || provider?.consumer_types || []

export const getConnectionConsumerTypes = (connection?: ExternalConnectionODM | null): string[] =>
  connection?.consumerTypes || connection?.consumer_types || []

export const getFieldLabel = (t: Translate, key: string): string => {
  const labelKey = fieldLabelKeys[key]
  return labelKey ? t(labelKey) : humanizeKey(key)
}

export const getFieldPlaceholder = (t: Translate, key: string): string => {
  const labelKey = fieldLabelKeys[key]
  return labelKey ? t(labelKey) : humanizeKey(key)
}
