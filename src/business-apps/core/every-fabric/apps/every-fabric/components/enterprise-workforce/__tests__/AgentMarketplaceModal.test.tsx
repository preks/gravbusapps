/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AgentMarketplaceModal } from '../marketplace/AgentMarketplaceModal'
import { MARKETPLACE_AGENTS } from '../marketplace/marketplaceAgents'

describe('AgentMarketplaceModal', () => {
  it('does not render when closed', () => {
    render(<AgentMarketplaceModal open={false} onClose={jest.fn()} onHire={jest.fn()} />)
    expect(screen.queryByTestId('agent-marketplace-modal')).not.toBeInTheDocument()
  })

  it('renders the full catalog by default', () => {
    render(<AgentMarketplaceModal open onClose={jest.fn()} onHire={jest.fn()} />)
    const grid = screen.getByTestId('agent-marketplace-grid')
    expect(grid).toBeInTheDocument()
    MARKETPLACE_AGENTS.forEach(agent => {
      expect(screen.getByTestId(`marketplace-card-${agent.id}`)).toBeInTheDocument()
    })
  })

  it('narrows the catalog by value pack', () => {
    render(<AgentMarketplaceModal open onClose={jest.fn()} onHire={jest.fn()} />)

    fireEvent.click(screen.getByTestId('agent-marketplace-filter-finance'))

    expect(screen.getByTestId('marketplace-card-invoice-clerk')).toBeInTheDocument()
    expect(screen.queryByTestId('marketplace-card-recruiting-coordinator')).not.toBeInTheDocument()
  })

  it('filters the catalog by search query', () => {
    render(<AgentMarketplaceModal open onClose={jest.fn()} onHire={jest.fn()} />)

    fireEvent.change(screen.getByTestId('agent-marketplace-search'), { target: { value: 'invoice' } })

    expect(screen.getByTestId('marketplace-card-invoice-clerk')).toBeInTheDocument()
    expect(screen.queryByTestId('marketplace-card-lead-qualifier')).not.toBeInTheDocument()
  })

  it('opens an agent profile and hires it', () => {
    const onHire = jest.fn()
    render(<AgentMarketplaceModal open onClose={jest.fn()} onHire={onHire} />)

    fireEvent.click(screen.getByTestId('marketplace-card-service-desk-triage'))
    expect(screen.getByTestId('marketplace-detail-service-desk-triage')).toBeInTheDocument()
    expect(screen.getByTestId('marketplace-detail-skills')).toBeInTheDocument()
    expect(screen.getByTestId('marketplace-detail-tools')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('marketplace-detail-hire'))
    expect(onHire).toHaveBeenCalledTimes(1)
    expect(onHire.mock.calls[0][0].id).toBe('service-desk-triage')
  })

  it('returns from the profile to the grid', () => {
    render(<AgentMarketplaceModal open onClose={jest.fn()} onHire={jest.fn()} />)

    fireEvent.click(screen.getByTestId('marketplace-card-service-desk-triage'))
    fireEvent.click(screen.getByTestId('marketplace-detail-back'))

    expect(screen.getByTestId('agent-marketplace-grid')).toBeInTheDocument()
  })
})
