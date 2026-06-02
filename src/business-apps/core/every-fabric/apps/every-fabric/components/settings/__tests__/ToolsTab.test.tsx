import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToolsTab } from '../ToolsTab'
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

    render(<ToolsTab accessToken="token" />)

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

    render(<ToolsTab accessToken="token" />)

    expect(await screen.findByTestId('tools-tab-disabled-badge-flowbot.web_search')).toBeInTheDocument()
    expect(screen.getByTestId('tools-tab-toggle-flowbot.web_search')).toHaveTextContent('Enable')
  })

  it('surfaces an error and leaves the tool enabled when the backend call fails', async () => {
    mockGetCanonicalProviderTools.mockResolvedValue([providerTool()])
    mockSetToolAvailability.mockRejectedValue(new Error('boom'))

    render(<ToolsTab accessToken="token" />)

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
        category: 'flowbot_actions',
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

    render(<ToolsTab accessToken="token" />)

    fireEvent.click(await screen.findByTestId('tools-tab-category-pill-flowbot_actions'))
    expect(screen.queryByTestId('tools-tab-row-flowbot.read_entity_by_id')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tool-companion-open-flowbot.read_entity_by_id'))

    await waitFor(() => {
      expect(screen.getByTestId('tools-tab-row-flowbot.read_entity_by_id')).toBeInTheDocument()
    })
  })
})
