/** @jest-environment jsdom */
import { PromptManagerClient } from '../PromptManagerClient'

interface MockResponseInit {
  status?: number
  body?: unknown
  jsonBody?: boolean
}

// Lightweight stand-in for fetch's `Response`. The version of jsdom in this
// workspace does not expose `Response`/`Headers` globally, so we mock just
// the methods that `RestClient` uses (`ok`, `status`, `headers.get`,
// `json()`, `text()`, `blob()`).
function makeFetchResponse({ status = 200, body = {}, jsonBody = true }: MockResponseInit = {}) {
  const ok = status >= 200 && status < 300
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'ERR',
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null)
    },
    json: async () => body,
    text: async () => (typeof body === 'string' || !jsonBody ? String(body ?? '') : JSON.stringify(body)),
    blob: async () => body
  } as unknown as Response
}

describe('PromptManagerClient — Workforce Agents', () => {
  const originalFetch = global.fetch
  let fetchMock: jest.Mock
  let client: PromptManagerClient

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(makeFetchResponse({ body: {} }))
    global.fetch = fetchMock as unknown as typeof fetch
    client = new PromptManagerClient('https://pm.example/api/v1')
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  function getFetchCall(callIndex = 0) {
    const [rawUrl, init] = fetchMock.mock.calls[callIndex]
    return { url: new URL(rawUrl as string), init: init as RequestInit }
  }

  describe('listWorkforceAgents', () => {
    it('calls the workforce list endpoint without optional params', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ body: { data: [], total: 0 } }))
      const page = await client.listWorkforceAgents()
      const { url, init } = getFetchCall()
      expect(url.pathname.endsWith('/workforce/agents')).toBe(true)
      expect(url.searchParams.toString()).toBe('')
      expect(init.method).toBe('GET')
      expect(page).toEqual({ data: [], total: 0 })
    })

    it('serialises filter params to the query string', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ body: { data: [], total: 0 } }))
      await client.listWorkforceAgents({
        status: 'active',
        limit: 25,
        offset: 50
      })
      const { url } = getFetchCall()
      expect(url.searchParams.get('status')).toBe('active')
      expect(url.searchParams.get('limit')).toBe('25')
      expect(url.searchParams.get('offset')).toBe('50')
    })
  })

  describe('createWorkforceAgent', () => {
    it('POSTs the request body to /workforce/agents', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ body: { agent_id: 'agent-1' } }))
      await client.createWorkforceAgent({
        name: 'insurance_specialist',
        display_name: 'Insurance Specialist',
        role: 'Customer Care',
        autonomy_level: 'approval_required',
        skill_ids: ['skill-1']
      })
      const { url, init } = getFetchCall()
      expect(init.method).toBe('POST')
      expect(url.pathname.endsWith('/workforce/agents')).toBe(true)
      expect(JSON.parse(init.body as string)).toEqual({
        name: 'insurance_specialist',
        display_name: 'Insurance Specialist',
        role: 'Customer Care',
        autonomy_level: 'approval_required',
        skill_ids: ['skill-1']
      })
    })
  })

  describe('agent lifecycle helpers', () => {
    it('activateWorkforceAgent POSTs to the activate path', async () => {
      await client.activateWorkforceAgent('agent-42')
      const { url, init } = getFetchCall()
      expect(init.method).toBe('POST')
      expect(url.pathname.endsWith('/workforce/agents/agent-42/activate')).toBe(true)
    })

    it('pauseWorkforceAgent POSTs to the pause path', async () => {
      await client.pauseWorkforceAgent('agent-42')
      const { url, init } = getFetchCall()
      expect(init.method).toBe('POST')
      expect(url.pathname.endsWith('/workforce/agents/agent-42/pause')).toBe(true)
    })

    it('archiveWorkforceAgent POSTs to the archive path', async () => {
      await client.archiveWorkforceAgent('agent-42')
      const { url, init } = getFetchCall()
      expect(init.method).toBe('POST')
      expect(url.pathname.endsWith('/workforce/agents/agent-42/archive')).toBe(true)
    })

    it('updateWorkforceAgent uses PATCH', async () => {
      await client.updateWorkforceAgent('agent-42', { display_name: 'Renamed' })
      const { url, init } = getFetchCall()
      expect(init.method).toBe('PATCH')
      expect(url.pathname.endsWith('/workforce/agents/agent-42')).toBe(true)
      expect(JSON.parse(init.body as string)).toEqual({ display_name: 'Renamed' })
    })

    it('encodes agent ids that contain reserved characters', async () => {
      await client.getWorkforceAgent('agent/with space')
      const { url } = getFetchCall()
      expect(url.pathname).toContain(encodeURIComponent('agent/with space'))
    })
  })

  describe('triggers', () => {
    it('listWorkforceTriggers uses GET on the nested resource', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ body: [] }))
      await client.listWorkforceTriggers('agent-1')
      const { url, init } = getFetchCall()
      expect(init.method).toBe('GET')
      expect(url.pathname.endsWith('/workforce/agents/agent-1/triggers')).toBe(true)
    })

    it('createWorkforceTrigger POSTs the trigger payload', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ body: { trigger_id: 'trig-1' } }))
      await client.createWorkforceTrigger('agent-1', {
        type: 'inbound_email',
        name: 'Support mailbox',
        config: { mailbox: 'support@acme.com', email_account_id: 'acct-123' }
      })
      const { url, init } = getFetchCall()
      expect(init.method).toBe('POST')
      expect(url.pathname.endsWith('/workforce/agents/agent-1/triggers')).toBe(true)
      expect(JSON.parse(init.body as string)).toEqual({
        type: 'inbound_email',
        name: 'Support mailbox',
        config: { mailbox: 'support@acme.com', email_account_id: 'acct-123' }
      })
    })

    it('deleteWorkforceTrigger uses DELETE and resolves on 204', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ status: 204, body: '' }))
      await client.deleteWorkforceTrigger('trig-1')
      const { url, init } = getFetchCall()
      expect(init.method).toBe('DELETE')
      expect(url.pathname.endsWith('/workforce/triggers/trig-1')).toBe(true)
    })

    it('updateWorkforceTrigger PATCHes the partial payload', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse({
          body: {
            trigger_id: 'trig-1',
            agent_id: 'agent-1',
            workspace_id: null,
            type: 'schedule',
            name: 'Renamed',
            enabled: false,
            config: { cron: '0 0 * * *' },
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z'
          }
        })
      )
      const result = await client.updateWorkforceTrigger('trig-1', {
        enabled: false,
        name: 'Renamed',
        config: { cron: '0 0 * * *' }
      })
      const { url, init } = getFetchCall()
      expect(init.method).toBe('PATCH')
      expect(url.pathname.endsWith('/workforce/triggers/trig-1')).toBe(true)
      expect(JSON.parse(init.body as string)).toEqual({
        enabled: false,
        name: 'Renamed',
        config: { cron: '0 0 * * *' }
      })
      expect(result.enabled).toBe(false)
      expect(result.name).toBe('Renamed')
    })
  })

  describe('dispatchWorkforceTestWebhook', () => {
    it('POSTs subject and body to the test-webhook path', async () => {
      fetchMock.mockResolvedValueOnce(
        makeFetchResponse({
          body: {
            session_id: 'sess-1',
            trigger_id: 'trig-webhook',
            accepted: true
          }
        })
      )
      const result = await client.dispatchWorkforceTestWebhook('trig-webhook', {
        subject: 'Test webhook',
        body: 'Customer escalation details'
      })
      const { url, init } = getFetchCall()
      expect(init.method).toBe('POST')
      expect(url.pathname.endsWith('/workforce/triggers/trig-webhook/test-webhook')).toBe(true)
      expect(JSON.parse(init.body as string)).toEqual({
        subject: 'Test webhook',
        body: 'Customer escalation details'
      })
      expect(result).toEqual({
        session_id: 'sess-1',
        trigger_id: 'trig-webhook',
        accepted: true
      })
    })
  })

  describe('runs', () => {
    it('listWorkforceRuns includes status filter when provided', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ body: { data: [], total: 0 } }))
      await client.listWorkforceRuns('agent-1', { status: 'escalated', limit: 10 })
      const { url, init } = getFetchCall()
      expect(init.method).toBe('GET')
      expect(url.pathname.endsWith('/workforce/agents/agent-1/runs')).toBe(true)
      expect(url.searchParams.get('status')).toBe('escalated')
      expect(url.searchParams.get('limit')).toBe('10')
    })

    it('getWorkforceRun GETs a single run by deep-agent session id', async () => {
      fetchMock.mockResolvedValueOnce(makeFetchResponse({ body: { session_id: 'sess-1' } }))
      const run = await client.getWorkforceRun('sess-1')
      const { url, init } = getFetchCall()
      expect(init.method).toBe('GET')
      expect(url.pathname.endsWith('/workforce/runs/sess-1')).toBe(true)
      expect(run).toEqual({ session_id: 'sess-1' })
    })
  })
})
