import { compactOutputForChartDeliverable, extractSummarySection } from '../finalAnswerOutput'

describe('extractSummarySection', () => {
  it('returns body under ### Summary heading', () => {
    const output = '### Summary\n\nRevenue grew 12%.\n\n### Details\n\nMore text'
    expect(extractSummarySection(output)).toBe('Revenue grew 12%.')
  })

  it('returns null when no summary heading', () => {
    expect(extractSummarySection('No summary here')).toBeNull()
  })
})

const identityT = (key: string) => key

describe('compactOutputForChartDeliverable', () => {
  it('returns full output when no visual artifacts', () => {
    const output = 'Chart rendered successfully.\n\n### Summary\n\nDone.'
    expect(compactOutputForChartDeliverable(output, false, identityT)).toBe(output)
  })

  it('compacts chart deliverable boilerplate to summary section', () => {
    const output = 'Chart rendered successfully.\n\n### Summary\n\nKey insight.\n\nOpen the dashboard artifact.'
    const compact = compactOutputForChartDeliverable(output, true, identityT)
    expect(compact).toBe('### Summary\n\nKey insight.\n\nOpen the dashboard artifact.')
  })
})
