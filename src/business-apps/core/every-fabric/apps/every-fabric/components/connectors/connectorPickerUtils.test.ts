import { getPlatformBadgeKey, resolveConnectorScope } from './connectorPickerUtils'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'

const connection = (overrides: Partial<ExternalConnection>): ExternalConnection => ({
  connection_id: 'conn-1',
  name: 'Product Issues',
  kind: 'mcp',
  lane: 'mcp_servers',
  providerIdForLogo: 'mcp.custom-server',
  active: true,
  scope: 'custom',
  ...overrides
})

describe('connectorPickerUtils', () => {
  it('keeps managed connectors user-toggleable', () => {
    expect(resolveConnectorScope({ managed: true, internal: false })).toBe('custom')
  })

  it('keeps internal connectors platform scoped', () => {
    expect(resolveConnectorScope({ managed: true, internal: true })).toBe('platform')
  })

  it('shows managed badges for toggleable managed connectors', () => {
    expect(getPlatformBadgeKey(connection({ managed: true }))).toBe('connect-badge-managed')
  })
})
