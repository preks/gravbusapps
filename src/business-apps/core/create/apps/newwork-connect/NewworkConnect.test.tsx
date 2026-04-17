import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { NewworkConnect } from './NewworkConnect'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: jest.fn()
}))

jest.mock('@/common/components/premium-hero/PremiumHeroShell', () => ({
  PremiumHeroShell: ({ children, 'data-testid': testId }: any) => <div data-testid={testId}>{children}</div>
}))

const mockProviders = [
  {
    providerId: 'mcp.github',
    name: 'GitHub',
    kind: 'mcp',
    lane: 'mcp_servers',
    consumerTypes: ['mcp_tool', 'task_expert'],
    configFields: [{ key: 'GITHUB_PERSONAL_ACCESS_TOKEN', fieldType: 'password' }]
  },
  {
    providerId: 'mcp.slack',
    name: 'Slack',
    kind: 'mcp',
    lane: 'mcp_servers',
    consumerTypes: ['mcp_tool', 'task_expert'],
    configFields: [{ key: 'SLACK_BOT_TOKEN', fieldType: 'password' }]
  },
  {
    providerId: 'mcp.custom-server',
    name: 'Custom MCP Server',
    kind: 'mcp',
    lane: 'mcp_servers',
    consumerTypes: ['mcp_tool', 'task_expert'],
    configFields: []
  },
  {
    providerId: 'anypoint-connect.sap',
    name: 'SAP',
    kind: 'structured',
    lane: 'anypoint_connect',
    consumerTypes: ['function', 'board_import'],
    configFields: [{ key: 'BASE_URL', fieldType: 'url' }]
  },
  {
    providerId: 'anypoint-connect.salesforce',
    name: 'Salesforce',
    kind: 'structured',
    lane: 'anypoint_connect',
    consumerTypes: ['function', 'board_import'],
    configFields: [
      { key: 'DOMAIN', fieldType: 'url', required: true },
      { key: 'CLIENT_ID', fieldType: 'text', required: true },
      { key: 'CLIENT_SECRET', fieldType: 'password', required: true }
    ]
  },
  {
    providerId: 'anypoint-connect.postgresql',
    name: 'PostgreSQL',
    kind: 'structured',
    lane: 'anypoint_connect',
    consumerTypes: ['function', 'board_import'],
    configFields: [
      { key: 'HOST', fieldType: 'text' },
      { key: 'DATABASE', fieldType: 'text' }
    ]
  },
  {
    providerId: 'data-bridge.sharepoint',
    name: 'SharePoint',
    kind: 'unstructured',
    lane: 'data_bridge',
    consumerTypes: ['function', 'document_import'],
    configFields: [{ key: 'SITE_URL', fieldType: 'url' }]
  },
  {
    providerId: 'data-bridge.notion',
    name: 'Notion',
    kind: 'unstructured',
    lane: 'data_bridge',
    consumerTypes: ['function', 'document_import'],
    configFields: [{ key: 'API_KEY', fieldType: 'password' }]
  },
  {
    providerId: 'data-bridge.dropbox',
    name: 'Dropbox',
    kind: 'unstructured',
    lane: 'data_bridge',
    consumerTypes: ['function', 'document_import'],
    configFields: [{ key: 'ACCESS_TOKEN', fieldType: 'password' }]
  }
]

describe('NewworkConnect', () => {
  const mockClient = {
    getConnectorProviders: jest.fn(),
    getExternalConnections: jest.fn(),
    getExternalConnectionHealth: jest.fn(),
    instantiateConnectorProvider: jest.fn(),
    putExternalConnection: jest.fn(),
    deleteExternalConnection: jest.fn()
  }

  beforeEach(() => {
    ;(usePromptManagerClient as jest.Mock).mockReturnValue(mockClient)
    mockClient.getConnectorProviders.mockReset()
    mockClient.getExternalConnections.mockReset()
    mockClient.getExternalConnectionHealth.mockReset()
    mockClient.instantiateConnectorProvider.mockReset()
    mockClient.putExternalConnection.mockReset()
    mockClient.deleteExternalConnection.mockReset()
  })

  it('renders hero cards for all three lanes and shows active connections', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: mockProviders,
      paging: { limit: 100, offset: 0, totalRecords: mockProviders.length }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [
        {
          connectionId: 'conn-1',
          name: 'SharePoint HR',
          lane: 'data_bridge',
          kind: 'unstructured',
          providerId: 'data-bridge.sharepoint',
          active: true
        },
        {
          connectionId: 'conn-2',
          name: 'GitHub Org',
          lane: 'mcp_servers',
          kind: 'mcp',
          providerId: 'mcp.github',
          active: true
        }
      ],
      paging: { limit: 100, offset: 0, totalRecords: 2 }
    })

    render((<NewworkConnect accessToken="token" />) as any)

    expect(await screen.findByTestId('newwork-connect-hero-card-anypoint_connect')).toBeInTheDocument()
    expect(screen.getByTestId('newwork-connect-hero-card-data_bridge')).toBeInTheDocument()
    expect(screen.getByTestId('newwork-connect-hero-card-mcp_servers')).toBeInTheDocument()
    expect(screen.getByTestId('newwork-connect-hero-instance-conn-1')).toBeInTheDocument()
    expect(screen.getByTestId('newwork-connect-hero-instance-conn-2')).toBeInTheDocument()
  })

  it('shows provider catalog cards in the tab content', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: mockProviders,
      paging: { limit: 100, offset: 0, totalRecords: mockProviders.length }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [],
      paging: { limit: 100, offset: 0, totalRecords: 0 }
    })

    render((<NewworkConnect accessToken="token" />) as any)

    expect(await screen.findByTestId('newwork-connect-catalog-anypoint_connect')).toBeInTheDocument()
    expect(screen.getByTestId('newwork-connect-provider-select-data-bridge.sharepoint')).toBeInTheDocument()
    expect(screen.getByTestId('newwork-connect-provider-select-data-bridge.notion')).toBeInTheDocument()
  })

  it('creates an AnyPoint Connect connection (SAP) from the catalog', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: mockProviders,
      paging: { limit: 100, offset: 0, totalRecords: mockProviders.length }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [],
      paging: { limit: 100, offset: 0, totalRecords: 0 }
    })
    mockClient.instantiateConnectorProvider.mockResolvedValue({ connectionId: 'sap-1', name: 'SAP Europe' })

    render((<NewworkConnect accessToken="token" />) as any)

    fireEvent.click(await screen.findByTestId('newwork-connect-tab-anypoint_connect'))
    fireEvent.click(await screen.findByTestId('newwork-connect-provider-select-anypoint-connect.sap'))
    fireEvent.change(await screen.findByTestId('newwork-connect-form-name'), { target: { value: 'SAP Europe' } })
    fireEvent.change(screen.getByTestId('newwork-connect-form-field-BASE_URL'), {
      target: { value: 'https://sap.example.com' }
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('newwork-connect-form-save'))
    })

    expect(mockClient.instantiateConnectorProvider).toHaveBeenCalledWith('anypoint-connect.sap', {
      name: 'SAP Europe',
      description: undefined,
      url: null,
      transport: null,
      env: null,
      config: { BASE_URL: 'https://sap.example.com' },
      consumerTypes: ['function', 'board_import'],
      active: true
    })
  })

  it('creates an MCP connection (GitHub) from the catalog', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: mockProviders,
      paging: { limit: 100, offset: 0, totalRecords: mockProviders.length }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [],
      paging: { limit: 100, offset: 0, totalRecords: 0 }
    })
    mockClient.instantiateConnectorProvider.mockResolvedValue({ connectionId: 'gh-1', name: 'My GitHub' })

    render((<NewworkConnect accessToken="token" />) as any)

    fireEvent.click(await screen.findByTestId('newwork-connect-tab-mcp_servers'))
    fireEvent.click(await screen.findByTestId('newwork-connect-provider-select-mcp.github'))
    fireEvent.change(await screen.findByTestId('newwork-connect-form-name'), { target: { value: 'My GitHub' } })
    fireEvent.change(screen.getByTestId('newwork-connect-form-field-GITHUB_PERSONAL_ACCESS_TOKEN'), {
      target: { value: 'ghp_secret' }
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('newwork-connect-form-save'))
    })

    expect(mockClient.instantiateConnectorProvider).toHaveBeenCalledWith(
      'mcp.github',
      expect.objectContaining({
        name: 'My GitHub',
        config: { GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_secret' },
        consumerTypes: ['mcp_tool', 'task_expert']
      })
    )
  })

  it('blocks save when required Salesforce fields are empty', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: mockProviders,
      paging: { limit: 100, offset: 0, totalRecords: mockProviders.length }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [],
      paging: { limit: 100, offset: 0, totalRecords: 0 }
    })

    render((<NewworkConnect accessToken="token" />) as any)

    fireEvent.click(await screen.findByTestId('newwork-connect-tab-anypoint_connect'))
    fireEvent.click(await screen.findByTestId('newwork-connect-provider-select-anypoint-connect.salesforce'))

    fireEvent.change(await screen.findByTestId('newwork-connect-form-name'), { target: { value: 'My Salesforce' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('newwork-connect-form-save'))
    })

    expect(mockClient.instantiateConnectorProvider).not.toHaveBeenCalled()
  })

  it('saves Salesforce when all required fields are filled', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: mockProviders,
      paging: { limit: 100, offset: 0, totalRecords: mockProviders.length }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [],
      paging: { limit: 100, offset: 0, totalRecords: 0 }
    })
    mockClient.instantiateConnectorProvider.mockResolvedValue({ connectionId: 'sf-1', name: 'My Salesforce' })

    render((<NewworkConnect accessToken="token" />) as any)

    fireEvent.click(await screen.findByTestId('newwork-connect-tab-anypoint_connect'))
    fireEvent.click(await screen.findByTestId('newwork-connect-provider-select-anypoint-connect.salesforce'))

    fireEvent.change(await screen.findByTestId('newwork-connect-form-name'), { target: { value: 'My Salesforce' } })
    fireEvent.change(screen.getByTestId('newwork-connect-form-field-DOMAIN'), {
      target: { value: 'https://myorg.my.salesforce.com' }
    })
    fireEvent.change(screen.getByTestId('newwork-connect-form-field-CLIENT_ID'), {
      target: { value: 'test-client-id' }
    })
    fireEvent.change(screen.getByTestId('newwork-connect-form-field-CLIENT_SECRET'), {
      target: { value: 'test-client-secret' }
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('newwork-connect-form-save'))
    })

    expect(mockClient.instantiateConnectorProvider).toHaveBeenCalledWith(
      'anypoint-connect.salesforce',
      expect.objectContaining({
        name: 'My Salesforce',
        config: {
          DOMAIN: 'https://myorg.my.salesforce.com',
          CLIENT_ID: 'test-client-id',
          CLIENT_SECRET: 'test-client-secret'
        },
        consumerTypes: ['function', 'board_import']
      })
    )
  })

  it('shows lightning domain hint when user pastes a lightning URL', async () => {
    mockClient.getConnectorProviders.mockResolvedValue({
      data: mockProviders,
      paging: { limit: 100, offset: 0, totalRecords: mockProviders.length }
    })
    mockClient.getExternalConnections.mockResolvedValue({
      data: [],
      paging: { limit: 100, offset: 0, totalRecords: 0 }
    })

    render((<NewworkConnect accessToken="token" />) as any)

    fireEvent.click(await screen.findByTestId('newwork-connect-tab-anypoint_connect'))
    fireEvent.click(await screen.findByTestId('newwork-connect-provider-select-anypoint-connect.salesforce'))

    fireEvent.change(await screen.findByTestId('newwork-connect-form-field-DOMAIN'), {
      target: { value: 'https://myorg.lightning.force.com' }
    })

    expect(screen.getByTestId('newwork-connect-lightning-hint')).toBeInTheDocument()
  })
})
