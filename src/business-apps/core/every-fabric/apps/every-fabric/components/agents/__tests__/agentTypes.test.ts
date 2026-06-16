import type { AgentDeployments } from '../agentTypes'
import { agentDisplayLabel, deriveDeploymentBadges, hasWorkforceDeployment } from '../agentTypes'

describe('agentDisplayLabel', () => {
  it('prefers display_name when set', () => {
    expect(agentDisplayLabel({ name: 'crm_sales', display_name: 'Sales Exit Agent' })).toBe('Sales Exit Agent')
  })

  it('title-cases slug name when display_name is missing', () => {
    expect(agentDisplayLabel({ name: 'crm_sales' })).toBe('Crm Sales')
  })
})

function deployments(over: Partial<AgentDeployments>): AgentDeployments {
  return {
    enterprise: { enabled: true },
    workforce: { enabled: false, status: null },
    ...over
  }
}

describe('deriveDeploymentBadges', () => {
  it('shows only Enterprise for an enterprise-only agent', () => {
    const badges = deriveDeploymentBadges({ deployments: deployments({}) })
    expect(badges.map(b => b.tone)).toEqual(['enterprise'])
  })

  it('shows Enterprise + Workforce for a live dual-surface agent', () => {
    const badges = deriveDeploymentBadges({
      deployments: deployments({ workforce: { enabled: true, status: 'active' } })
    })
    expect(badges.map(b => b.tone)).toEqual(['enterprise', 'workforce'])
  })

  it('shows a paused badge for a paused workforce deployment', () => {
    const badges = deriveDeploymentBadges({
      deployments: deployments({ workforce: { enabled: true, status: 'paused' } })
    })
    expect(badges.map(b => b.tone)).toEqual(['enterprise', 'paused'])
    expect(badges.find(b => b.tone === 'paused')?.label).toBe('Worker paused')
  })

  it('shows only Workforce for a workforce-only agent', () => {
    const badges = deriveDeploymentBadges({
      deployments: deployments({ enterprise: { enabled: false }, workforce: { enabled: true, status: 'active' } })
    })
    expect(badges.map(b => b.tone)).toEqual(['workforce'])
  })

  it('omits archived workforce deployments from badges', () => {
    const badges = deriveDeploymentBadges({
      deployments: deployments({ workforce: { enabled: false, status: 'archived' } })
    })
    expect(badges.map(b => b.tone)).toEqual(['enterprise'])
  })

  it('falls back to the legacy isWorkforce flag when deployments is absent', () => {
    expect(deriveDeploymentBadges({ isWorkforce: true }).map(b => b.tone)).toEqual(['enterprise', 'workforce'])
    expect(deriveDeploymentBadges({ isWorkforce: false }).map(b => b.tone)).toEqual(['enterprise'])
  })
})

describe('hasWorkforceDeployment', () => {
  it('uses the deployments block when present', () => {
    expect(
      hasWorkforceDeployment({ deployments: deployments({ workforce: { enabled: true, status: 'paused' } }) })
    ).toBe(true)
    expect(hasWorkforceDeployment({ deployments: deployments({}) })).toBe(false)
  })

  it('falls back to isWorkforce when deployments is absent', () => {
    expect(hasWorkforceDeployment({ isWorkforce: true })).toBe(true)
    expect(hasWorkforceDeployment({ isWorkforce: false })).toBe(false)
  })
})
