import { agentDisplayLabel } from '../agentTypes'

describe('agentDisplayLabel', () => {
  it('prefers display_name when set', () => {
    expect(agentDisplayLabel({ name: 'crm_sales', display_name: 'Sales Exit Agent' })).toBe('Sales Exit Agent')
  })

  it('title-cases slug name when display_name is missing', () => {
    expect(agentDisplayLabel({ name: 'crm_sales' })).toBe('Crm Sales')
  })
})
