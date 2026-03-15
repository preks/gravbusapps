import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ConnectionsSpace } from './ConnectionsSpace'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: jest.fn()
}))

describe('ConnectionsSpace', () => {
  const mockClient = {
    getConnectorProviders: jest.fn(),
    getExternalConnections: jest.fn(),
    getExternalConnectionHealth: jest.fn(),
    instantiateConnectorProvider: jest.fn(),
    createExternalConnection: jest.fn(),
    putExternalConnection: jest.fn(),
    deleteExternalConnection: jest.fn()
  }

  beforeEach(() => {
    ;(usePromptManagerClient as jest.Mock).mockReturnValue(mockClient)
    mockClient.getConnectorProviders.mockReset()
    mockClient.getExternalConnections.mockReset()
    mockClient.getExternalConnectionHealth.mockReset()
    mockClient.instantiateConnectorProvider.mockReset()
    mockClient.createExternalConnection.mockReset()
    mockClient.putExternalConnection.mockReset()
    mockClient.deleteExternalConnection.mockReset()
  })

  it('shows provider cards and an empty instances state', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: [
        {
          providerId: 'anypoint-connect.sap',
          name: 'SAP',
          description: 'SAP provider',
          kind: 'structured',
          lane: 'data_bridge',
          consumerTypes: ['function', 'board_import']
        }
      ],
      paging: { limit: 100, offset: 0, totalRecords: 1 }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [],
      paging: { limit: 100, offset: 0, totalRecords: 0 }
    })

    render(<ConnectionsSpace accessToken="token" /> as any)

    expect(await screen.findByTestId('prompt-manager-connections-provider-card-data-bridge.sap')).toBeInTheDocument()
    expect(await screen.findByTestId('prompt-manager-connections-empty')).toBeInTheDocument()
  })

  it('creates a connection from a provider card', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: [
        {
          providerId: 'anypoint-connect.sap',
          name: 'SAP',
          description: 'SAP provider',
          kind: 'structured',
          lane: 'data_bridge',
          consumerTypes: ['function', 'board_import'],
          configFields: [{ key: 'BASE_URL', fieldType: 'url' }]
        }
      ],
      paging: { limit: 100, offset: 0, totalRecords: 1 }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [],
      paging: { limit: 100, offset: 0, totalRecords: 0 }
    })
    mockClient.instantiateConnectorProvider.mockResolvedValue({
      connectionId: 'sap-1',
      name: 'SAP Europe'
    })

    render(<ConnectionsSpace accessToken="token" /> as any)

    fireEvent.click(await screen.findByTestId('prompt-manager-connections-provider-connect-data-bridge.sap'))
    fireEvent.change(await screen.findByTestId('prompt-manager-connections-form-name'), {
      target: { value: 'SAP Europe' }
    })
    fireEvent.change(screen.getByTestId('prompt-manager-connections-form-field-BASE_URL'), {
      target: { value: 'https://sap.example.com' }
    })
    await act(async () => {
      fireEvent.click(screen.getByText('save'))
    })

    expect(mockClient.instantiateConnectorProvider).toHaveBeenCalledWith('anypoint-connect.sap', {
      name: 'SAP Europe',
      description: undefined,
      url: null,
      transport: null,
      env: null,
      config: { BASE_URL: 'https://sap.example.com' },
      active: true
    })
  })

  it('tests an existing connection from the table', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: [
        {
          providerId: 'mcp.custom-server',
          name: 'Custom MCP Server',
          description: 'MCP provider',
          kind: 'mcp',
          lane: 'mcp_servers',
          consumerTypes: ['mcp_tool']
        }
      ],
      paging: { limit: 100, offset: 0, totalRecords: 1 }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [
        {
          connectionId: 'conn-flow',
          name: 'Flow Engine',
          description: 'Internal MCP',
          kind: 'mcp',
          lane: 'mcp_servers',
          providerId: 'mcp.custom-server',
          active: true,
          managed: true,
          internal: true
        }
      ],
      paging: { limit: 100, offset: 0, totalRecords: 1 }
    })
    mockClient.getExternalConnectionHealth.mockResolvedValue({
      connectionId: 'conn-flow',
      success: true,
      message: 'Connection healthy'
    })

    render(<ConnectionsSpace accessToken="token" /> as any)

    fireEvent.click(await screen.findByTestId('prompt-manager-connections-test-conn-flow'))

    expect(await screen.findByTestId('prompt-manager-connections-health-conn-flow')).toHaveTextContent(
      'Connection healthy'
    )
  })
})
