import { parseFlowSuccessShellState } from './shellState'

const parseLocation = (hash = '', search = '') =>
  parseFlowSuccessShellState({
    hash,
    search
  } as Location)

describe('flow success shell state', () => {
  it('maps the legacy overview summary route to the operations activity stream', () => {
    const state = parseLocation('#overview', '?overviewView=summary')

    expect(state.primaryView).toBe('operations')
    expect(state.operationsView).toBe('activity')
  })

  it('maps the legacy overview dashboard route to the operations dashboard', () => {
    const state = parseLocation('#overview', '?overviewView=dashboard&templateId=FLOW_A')

    expect(state.primaryView).toBe('operations')
    expect(state.operationsView).toBe('dashboard')
    expect(state.templateId).toBe('FLOW_A')
  })

  it('maps removed capacity routes to the operations overview', () => {
    const state = parseLocation('#analysis', '?analysisView=capacity')

    expect(state.primaryView).toBe('operations')
    expect(state.operationsView).toBe('overview')
  })

  it('maps removed dynamic runtime routes to the operations overview', () => {
    const state = parseLocation('#operations', '?operationsView=dynamic')

    expect(state.primaryView).toBe('operations')
    expect(state.operationsView).toBe('overview')
  })
})
