/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { ConnectionsSection } from '../ConnectionsSection'
import type { ExternalConnection, UseFabricConnectorsReturn } from '../../../../hooks/useFabricConnectors'
import type { WorkforceAgent } from '../../workforceTypes'

const mockUseFabricConnectors = jest.fn()

jest.mock('../../../../hooks/useFabricConnectors', () => ({
  useFabricConnectors: (token: string) => mockUseFabricConnectors(token)
}))

jest.mock('@/business-apps/core/create/apps/newwork-connect/components/ConnectorLogo', () => ({
  ConnectorLogo: () => <span data-testid="connector-logo" />
}))

function connector(id: string, name: string): ExternalConnection {
  return {
    connection_id: id,
    name,
    kind: 'structured',
    lane: 'anypoint_connect',
    providerIdForLogo: 'salesforce',
    active: true,
    scope: 'custom'
  }
}

function fabricReturn(connectors: ExternalConnection[], overrides: Partial<UseFabricConnectorsReturn> = {}): UseFabricConnectorsReturn {
  return {
    availableConnectors: connectors,
    activeConnectors: [],
    activeConnectionIds: new Set(),
    toggleConnector: jest.fn(),
    hydrateActiveIds: jest.fn(),
    isLoading: false,
    error: null,
    ...overrides
  }
}

function buildAgent(connectionIds: string[] | undefined): WorkforceAgent {
  return {
    agent_id: 'a1',
    name: 'enpal_bot',
    display_name: 'Enpal Bot',
    description: '',
    domain: 'sales',
    surfaces: ['workforce'],
    is_active: true,
    status: 'active',
    tags: [],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: {
      role: 'Ops',
      department: null,
      owner_user_id: null,
      autonomy_level: 'approval_required',
      escalation: {
        owner_user_id: null,
        ticket_queue: null,
        notify_emails: [],
        confidence_threshold: 0.5,
        blocked_intents: []
      },
      budget: { daily_credit_limit: null, weekly_credit_limit: null, monthly_credit_limit: null, on_exceeded: 'pause' },
      knowledge_refs: [],
      instructions: '',
      connection_ids: connectionIds
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
}

describe('ConnectionsSection', () => {
  beforeEach(() => {
    mockUseFabricConnectors.mockReset()
  })

  it('renders the bound connection as selected and adds another on save', async () => {
    mockUseFabricConnectors.mockReturnValue(
      fabricReturn([connector('conn-a', 'Salesforce Prod'), connector('conn-b', 'Salesforce Sandbox')])
    )
    const onSave = jest.fn().mockResolvedValue(undefined)

    render(<ConnectionsSection agent={buildAgent(['conn-a'])} accessToken="tok" isSaving={false} onSave={onSave} />)

    expect(screen.getByTestId('workforce-connection-conn-a')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('workforce-connection-conn-b')).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByTestId('workforce-connection-conn-b'))
    fireEvent.click(screen.getByTestId('workforce-config-section-save-connections'))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ connection_ids: ['conn-a', 'conn-b'] }))
  })

  it('unbinds a connection and saves the reduced list', async () => {
    mockUseFabricConnectors.mockReturnValue(fabricReturn([connector('conn-a', 'Salesforce Prod')]))
    const onSave = jest.fn().mockResolvedValue(undefined)

    render(<ConnectionsSection agent={buildAgent(['conn-a'])} accessToken="tok" isSaving={false} onSave={onSave} />)

    fireEvent.click(screen.getByTestId('workforce-connection-conn-a'))
    fireEvent.click(screen.getByTestId('workforce-config-section-save-connections'))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ connection_ids: [] }))
  })

  it('tolerates a missing connection_ids field (older payloads)', () => {
    mockUseFabricConnectors.mockReturnValue(fabricReturn([connector('conn-a', 'Salesforce Prod')]))

    render(<ConnectionsSection agent={buildAgent(undefined)} accessToken="tok" isSaving={false} onSave={jest.fn()} />)

    expect(screen.getByTestId('workforce-connection-conn-a')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('workforce-config-section-save-connections')).toBeDisabled()
  })

  it('shows the load error state', () => {
    mockUseFabricConnectors.mockReturnValue(fabricReturn([], { error: new Error('boom') }))

    render(<ConnectionsSection agent={buildAgent([])} accessToken="tok" isSaving={false} onSave={jest.fn()} />)

    expect(screen.getByTestId('workforce-connections-error')).toBeInTheDocument()
  })
})
