import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LocalizationProvider } from '@newwork/nw-design-system'
import { ToolsTab } from '../ToolsTab'

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')
  const labels: Record<string, string> = {
    'settings-action-disable': 'Disable',
    'settings-action-enable': 'Enable',
    'settings-tools-loading': 'Loading tools...',
    'settings-tools-error-load': 'Failed to load tools',
    'settings-tools-empty': 'No tools configured yet.',
    'settings-tools-intro': 'Tools available to enterprise agents, grouped by business domain.',
    'settings-tools-hint': 'hint',
    'settings-tools-search-placeholder': 'Search tools',
    'settings-tools-category': 'Category',
    'settings-tools-category-all': 'All ({ $count })',
    'settings-tools-no-match': 'No tools match the current filters.',
    'settings-tools-via': 'via { $source }',
    'settings-tools-disabled': 'Disabled',
    'settings-tools-no-auth': 'No auth required',
    'settings-tools-auth-required': 'Auth required',
    'settings-tools-hitl': 'HITL',
    'settings-tools-artifacts': 'Artifacts',
    'settings-tools-integrations-title': 'Configured tool integrations',
    'settings-tools-builtin': 'Built-in',
    'settings-tools-active': 'Active',
    'settings-tools-inactive': 'Inactive',
    'settings-flow-bindings-title': 'Flow companion bindings',
    'settings-flow-bindings-desc': 'desc',
    'settings-action-loading': 'Loading…',
    'shell-try-again': 'Try again'
  }
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, args?: Record<string, string | number>) => {
        let value = labels[key] ?? key
        if (args) {
          for (const [argKey, argValue] of Object.entries(args)) {
            value = value.replace(`{ $${argKey} }`, String(argValue))
          }
        }
        return value
      },
      locale: 'en-US'
    })
  }
})
import type { CanonicalProviderToolEntry } from '@/common/network/ai/prompt-manager/PromptManagerClient'

const mockGetTools = jest.fn()
const mockGetCanonicalProviderTools = jest.fn()
const mockSetToolAvailability = jest.fn()
const mockGetFlowBindings = jest.fn()
const mockUpdateFlowBinding = jest.fn()

const mockClient = {
  getTools: (...args: unknown[]) => mockGetTools(...args),
  getCanonicalProviderTools: (...args: unknown[]) => mockGetCanonicalProviderTools(...args),
  setToolAvailability: (...args: unknown[]) => mockSetToolAvailability(...args),
  getFlowBindings: (...args: unknown[]) => mockGetFlowBindings(...args),
  updateFlowBinding: (...args: unknown[]) => mockUpdateFlowBinding(...args)
}

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockClient
}))

const providerTool = (overrides: Partial<CanonicalProviderToolEntry> = {}): CanonicalProviderToolEntry => ({
  tool_ref: 'flowbot.web_search',
  canonical_name: 'web_search',
  display_name: 'Web search',
  source: 'flowbot',
  description: 'Search the web',
  input_schema: {},
  output_schema: {},
  capabilities: {},
  shadowed_by: null,
  catalog_available: true,
  category: 'web',
  tags: [],
  disabled: false,
  ...overrides
})

describe('ToolsTab enable/disable', () => {
  beforeEach(() => {
    mockGetTools.mockReset()
    mockGetCanonicalProviderTools.mockReset()
    mockSetToolAvailability.mockReset()
    mockGetFlowBindings.mockReset()
    mockUpdateFlowBinding.mockReset()
    mockGetTools.mockResolvedValue({ data: [] })
    mockGetFlowBindings.mockResolvedValue([])
    Element.prototype.scrollIntoView = jest.fn()
  })

  it('disables a tool and shows the disabled badge', async () => {
    mockGetCanonicalProviderTools.mockResolvedValue([providerTool()])
    mockSetToolAvailability.mockResolvedValue({ disabled_tool_names: ['web_search'] })

    render(
      <LocalizationProvider locale="en-US">
        <ToolsTab accessToken="token" />
      </LocalizationProvider>
    )

    const toggle = await screen.findByTestId('tools-tab-toggle-flowbot.web_search')
    expect(toggle).toHaveTextContent('Disable')

    fireEvent.click(toggle)

    await waitFor(() => expect(mockSetToolAvailability).toHaveBeenCalledWith('web_search', true))
    // Optimistic local update flips the row to disabled (badge + Enable button).
    expect(await screen.findByTestId('tools-tab-disabled-badge-flowbot.web_search')).toBeInTheDocument()
    expect(screen.getByTestId('tools-tab-toggle-flowbot.web_search')).toHaveTextContent('Enable')
  })

  it('renders an already-disabled tool with the Enable action', async () => {
    mockGetCanonicalProviderTools.mockResolvedValue([providerTool({ disabled: true })])

    render(
      <LocalizationProvider locale="en-US">
        <ToolsTab accessToken="token" />
      </LocalizationProvider>
    )

    expect(await screen.findByTestId('tools-tab-disabled-badge-flowbot.web_search')).toBeInTheDocument()
    expect(screen.getByTestId('tools-tab-toggle-flowbot.web_search')).toHaveTextContent('Enable')
  })

  it('surfaces an error and leaves the tool enabled when the backend call fails', async () => {
    mockGetCanonicalProviderTools.mockResolvedValue([providerTool()])
    mockSetToolAvailability.mockRejectedValue(new Error('boom'))

    render(
      <LocalizationProvider locale="en-US">
        <ToolsTab accessToken="token" />
      </LocalizationProvider>
    )

    fireEvent.click(await screen.findByTestId('tools-tab-toggle-flowbot.web_search'))

    expect(await screen.findByTestId('tools-tab-toggle-error')).toHaveTextContent('boom')
    expect(screen.queryByTestId('tools-tab-disabled-badge-flowbot.web_search')).not.toBeInTheDocument()
    expect(screen.getByTestId('tools-tab-toggle-flowbot.web_search')).toHaveTextContent('Disable')
  })

  it('opens a companion detail even when filters hide the companion row', async () => {
    mockGetCanonicalProviderTools.mockResolvedValue([
      providerTool({
        tool_ref: 'flowbot.saveCrmNote',
        canonical_name: 'saveCrmNote',
        display_name: 'Save CRM note',
        category: 'crm',
        related_tools: [
          {
            tool_ref: 'flowbot.read_entity_by_id',
            relation: 'entity_lookup',
            necessity: 'required',
            reason: 'Resolve the parent CRM entity id first.',
            for_fields: ['crmNote.parent']
          }
        ]
      }),
      providerTool({
        tool_ref: 'flowbot.read_entity_by_id',
        canonical_name: 'read_entity_by_id',
        display_name: 'Read entity by id',
        category: 'data'
      })
    ])

    render(
      <LocalizationProvider locale="en-US">
        <ToolsTab accessToken="token" />
      </LocalizationProvider>
    )

    fireEvent.click(await screen.findByTestId('tools-tab-category-pill-crm'))
    expect(screen.queryByTestId('tools-tab-row-flowbot.read_entity_by_id')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tool-companion-open-flowbot.read_entity_by_id'))

    await waitFor(() => {
      expect(screen.getByTestId('tools-tab-row-flowbot.read_entity_by_id')).toBeInTheDocument()
    })
  })
})
