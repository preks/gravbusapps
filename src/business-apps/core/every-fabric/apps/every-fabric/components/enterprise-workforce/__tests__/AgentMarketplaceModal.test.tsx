/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { AgentMarketplaceModal } from '../marketplace/AgentMarketplaceModal'
import { MARKETPLACE_AGENTS } from '../marketplace/marketplaceAgents'

function createMockClient(): PromptManagerClient {
  return {
    listMarketplacePackages: jest.fn().mockRejectedValue(new Error('offline')),
    marketplaceInstall: jest.fn(),
    marketplacePreflight: jest.fn(),
    marketplaceUnpublish: jest.fn(),
    buildMarketplacePackage: jest.fn()
  } as unknown as PromptManagerClient
}

describe('AgentMarketplaceModal', () => {
  it('does not render when closed', () => {
    render(<AgentMarketplaceModal open={false} client={createMockClient()} onClose={jest.fn()} />)
    expect(screen.queryByTestId('agent-marketplace-modal')).not.toBeInTheDocument()
  })

  it('renders the full catalog by default', async () => {
    render(<AgentMarketplaceModal open client={createMockClient()} onClose={jest.fn()} />)
    await waitFor(() => {
      expect(screen.getByTestId('agent-marketplace-grid')).toBeInTheDocument()
    })
    MARKETPLACE_AGENTS.forEach(agent => {
      expect(screen.getByTestId(`marketplace-card-${agent.id}`)).toBeInTheDocument()
    })
  })

  it('narrows the catalog by value pack', async () => {
    render(<AgentMarketplaceModal open client={createMockClient()} onClose={jest.fn()} />)
    await waitFor(() => expect(screen.getByTestId('agent-marketplace-grid')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('agent-marketplace-filter-finance'))

    expect(screen.getByTestId('marketplace-card-invoice-clerk')).toBeInTheDocument()
    expect(screen.queryByTestId('marketplace-card-recruiting-coordinator')).not.toBeInTheDocument()
  })

  it('filters the catalog by search query', async () => {
    render(<AgentMarketplaceModal open client={createMockClient()} onClose={jest.fn()} />)
    await waitFor(() => expect(screen.getByTestId('agent-marketplace-grid')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('agent-marketplace-search'), { target: { value: 'invoice' } })

    expect(screen.getByTestId('marketplace-card-invoice-clerk')).toBeInTheDocument()
    expect(screen.queryByTestId('marketplace-card-lead-qualifier')).not.toBeInTheDocument()
  })

  it('opens an agent profile and hires it via legacy callback', async () => {
    const onHireLegacy = jest.fn()
    render(<AgentMarketplaceModal open client={createMockClient()} onClose={jest.fn()} onHireLegacy={onHireLegacy} />)
    await waitFor(() => expect(screen.getByTestId('agent-marketplace-grid')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('marketplace-card-service-desk-triage'))
    expect(screen.getByTestId('marketplace-detail-service-desk-triage')).toBeInTheDocument()
    expect(screen.getByTestId('marketplace-detail-skills')).toBeInTheDocument()
    expect(screen.getByTestId('marketplace-detail-tools')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('marketplace-detail-hire'))
    expect(onHireLegacy).toHaveBeenCalledTimes(1)
    expect(onHireLegacy.mock.calls[0][0].id).toBe('service-desk-triage')
  })

  it('returns from the profile to the grid', async () => {
    render(<AgentMarketplaceModal open client={createMockClient()} onClose={jest.fn()} />)
    await waitFor(() => expect(screen.getByTestId('agent-marketplace-grid')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('marketplace-card-service-desk-triage'))
    fireEvent.click(screen.getByTestId('marketplace-detail-back'))

    expect(screen.getByTestId('agent-marketplace-grid')).toBeInTheDocument()
  })
})
