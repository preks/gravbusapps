/** @jest-environment jsdom */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import type { AgentPackageV1 } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { MarketplaceAgentDetail } from '../MarketplaceAgentDetail'
import { legacyTemplateToCatalogItem, packageSummaryToCatalogItem } from '../marketplaceCatalogTypes'
import { MARKETPLACE_AGENTS } from '../marketplaceAgents'

function apiCatalogItem() {
  return packageSummaryToCatalogItem({
    package_id: 'standard-hr-operations-agent',
    version: '1.0.0',
    name: 'Standard HR Operations Agent',
    description: 'HR operations expert',
    category: 'hr',
    publisher: 'newwork',
    skill_count: 2,
    tool_count: 4,
    install_count: 0,
    is_active: true
  })
}

function bundle(): AgentPackageV1 {
  return {
    manifest: {
      package_id: 'standard-hr-operations-agent',
      version: '1.0.0',
      name: 'Standard HR Operations Agent',
      description: 'HR operations expert',
      publisher: 'newwork',
      category: 'hr'
    },
    agent: {},
    skills: [
      {
        skill_id: 'std-hr-employee-directory',
        name: 'HR employee directory and skills',
        tool_refs: ['builtin.newwork_search_employees', 'builtin.newwork_get_employee_profile']
      },
      {
        skill_id: 'std-hr-leave-absence',
        name: 'Leave and absence management',
        tool_refs: ['builtin.newwork_request_employee_absence', 'builtin.compose_email']
      }
    ],
    skill_bindings: [],
    functions: [],
    policies: [],
    requirements: {
      builtin_tool_refs: [
        'builtin.compose_email',
        'builtin.newwork_get_employee_profile',
        'builtin.newwork_request_employee_absence',
        'builtin.newwork_search_employees'
      ]
    }
  }
}

describe('MarketplaceAgentDetail', () => {
  it('renders real bundled skill names and tool refs for API-backed packages', async () => {
    const onLoadBundle = jest.fn().mockResolvedValue(bundle())

    render(
      <MarketplaceAgentDetail
        agent={apiCatalogItem()}
        onBack={() => {}}
        onHire={() => {}}
        onLoadBundle={onLoadBundle}
      />
    )

    const skills = await screen.findByTestId('marketplace-detail-skills')
    expect(skills).toHaveTextContent('HR employee directory and skills')
    expect(skills).toHaveTextContent('Leave and absence management')

    const tools = screen.getByTestId('marketplace-detail-tools')
    expect(tools).toHaveTextContent('builtin.newwork_search_employees')
    expect(tools).toHaveTextContent('builtin.compose_email')

    expect(onLoadBundle).toHaveBeenCalledWith('standard-hr-operations-agent', '1.0.0')
  })

  it('falls back to bundled counts when the bundle fetch fails', async () => {
    const onLoadBundle = jest.fn().mockRejectedValue(new Error('boom'))

    render(
      <MarketplaceAgentDetail
        agent={apiCatalogItem()}
        onBack={() => {}}
        onHire={() => {}}
        onLoadBundle={onLoadBundle}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('marketplace-detail-skills-summary')).toHaveTextContent('2 bundled skills included')
    })
    expect(screen.getByTestId('marketplace-detail-tools-summary')).toHaveTextContent('4 tools wired via skills')
  })

  it('keeps legacy templates on their static skill and tool chips', () => {
    const legacy = legacyTemplateToCatalogItem(MARKETPLACE_AGENTS[0])
    const onLoadBundle = jest.fn()

    render(<MarketplaceAgentDetail agent={legacy} onBack={() => {}} onHire={() => {}} onLoadBundle={onLoadBundle} />)

    expect(screen.getByTestId('marketplace-detail-skills')).toBeInTheDocument()
    expect(onLoadBundle).not.toHaveBeenCalled()
  })
})
