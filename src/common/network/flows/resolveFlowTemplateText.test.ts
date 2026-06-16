import { resolveFlowTemplateText, containsFlowTemplateExpressions } from './resolveFlowTemplateText'

describe('resolveFlowTemplateText', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('returns plain text without calling the API', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock

    const result = await resolveFlowTemplateText({
      text: 'Plain task message',
      flowId: 'wf-1',
      accessToken: 'token'
    })

    expect(result).toBe('Plain task message')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resolves template expressions using workflowId', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        resolvedValue: 'Aktenzeichen WG-2024-001, Betrag 450 EUR'
      })
    })

    const template = 'Sachbearbeiter prüft die Ergebnisse für Aktenzeichen {{$steps.step_0.resultData.aktenzeichen}}.'

    const result = await resolveFlowTemplateText({
      text: template,
      flowId: 'wf-1',
      accessToken: 'token'
    })

    expect(result).toBe('Aktenzeichen WG-2024-001, Betrag 450 EUR')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/expressions/test-resolve'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          expression: template,
          workflowId: 'wf-1'
        })
      })
    )
  })

  it('falls back to raw text when resolution fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Workflow not found' })
    })

    const template = 'Value: {{$steps.step_0.resultData.aktenzeichen}}'
    const result = await resolveFlowTemplateText({
      text: template,
      flowId: 'wf-missing',
      accessToken: 'token'
    })

    expect(result).toBe(template)
  })
})

describe('containsFlowTemplateExpressions', () => {
  it('detects template markers', () => {
    expect(containsFlowTemplateExpressions('Hello {{$steps.step_0.formData.x}}')).toBe(true)
    expect(containsFlowTemplateExpressions('Hello world')).toBe(false)
  })
})
