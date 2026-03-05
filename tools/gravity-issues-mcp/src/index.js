#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

function getBaseUrl() {
  const raw =
    process.env.PRODUCT_REPORT_BASE_URL ||
    process.env.NEXT_PUBLIC_PRODUCT_REPORT_BASE_URL ||
    process.env.PRODUCT_REPORT_API_BASE_URL
  if (!raw) throw new Error('Missing PRODUCT_REPORT_BASE_URL')
  return String(raw).replace(/\/+$/, '')
}

function getToken() {
  const t = process.env.GRAVITY_ISSUES_TOKEN
  if (!t) throw new Error('Missing GRAVITY_ISSUES_TOKEN')
  return String(t)
}

function getWriteToken() {
  return String(process.env.GRAVITY_ISSUES_WRITE_TOKEN || process.env.GRAVITY_ISSUES_TOKEN || '')
}

async function fetchJson(pathname, params = {}) {
  const baseUrl = getBaseUrl()
  const url = new URL(baseUrl + pathname)
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    url.searchParams.set(k, String(v))
  })

  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Gravity-Issues-Token': getToken()
    }
  })

  const text = await resp.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!resp.ok) {
    throw new Error((json && json.error) || `Request failed (${resp.status})`)
  }
  return json
}

async function postJson(pathname, body) {
  const baseUrl = getBaseUrl()
  const url = new URL(baseUrl + pathname)
  const writeToken = getWriteToken()
  if (!writeToken) throw new Error('Missing GRAVITY_ISSUES_WRITE_TOKEN')

  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gravity-Issues-Write-Token': writeToken
    },
    body: JSON.stringify(body || {})
  })

  const text = await resp.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!resp.ok) {
    throw new Error((json && json.error) || `Request failed (${resp.status})`)
  }
  return json
}

function asTextResult(obj) {
  return {
    content: [
      {
        type: 'text',
        text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)
      }
    ]
  }
}

function pruneEvidence(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = Array.isArray(obj) ? [...obj] : { ...obj }
  if (Array.isArray(out?.items)) {
    out.items = out.items.map(item => {
      const it = { ...item }
      const bi = it.buildInfo
      if (bi && typeof bi === 'object') {
        const evidence = bi?.evidence
        if (evidence && typeof evidence === 'object') {
          const screenshot = evidence?.screenshot
          if (screenshot && typeof screenshot === 'object' && typeof screenshot.dataUrl === 'string') {
            it.hasScreenshot = true
            evidence.screenshot = { ...screenshot, dataUrl: undefined }
          }
        }
      }
      return it
    })
  }
  return out
}

function asImageResult(base64, mimeType = 'image/jpeg') {
  return {
    content: [
      {
        type: 'image',
        data: base64,
        mimeType
      }
    ]
  }
}

const IssueStatus = z.enum(['OPEN', 'IN_PROGRESS', 'DONE'])
const IssueType = z.enum(['BUG', 'SUGGESTION'])

const server = new McpServer({
  name: 'gravity-issues-mcp',
  version: '0.1.0'
})

server.tool(
  'gravity-list-issues',
  {
    screenKey: z.string().optional(),
    ownerEmail: z.string().optional(),
    ownerUserId: z.string().optional(),
    status: IssueStatus.optional(),
    type: IssueType.optional(),
    limit: z.number().int().min(1).max(200).optional()
  },
  async args => {
    const data = await fetchJson('/api/gravity/issues', args)
    return asTextResult(pruneEvidence(data))
  }
)

server.tool(
  'gravity-search-issues',
  {
    query: z.string().min(1),
    screenKey: z.string().optional(),
    ownerEmail: z.string().optional(),
    ownerUserId: z.string().optional(),
    status: IssueStatus.optional(),
    type: IssueType.optional(),
    limit: z.number().int().min(1).max(200).optional()
  },
  async ({ query, ...rest }) => {
    const data = await fetchJson('/api/gravity/issues', { ...rest, q: query })
    return asTextResult(pruneEvidence(data))
  }
)

server.tool(
  'gravity-list-screens',
  {
    ownerEmail: z.string().optional(),
    ownerUserId: z.string().optional(),
    limit: z.number().int().min(1).max(1000).optional()
  },
  async args => {
    const data = await fetchJson('/api/gravity/screens', args)
    return asTextResult(data)
  }
)

server.tool(
  'gravity-issues-for-screen',
  {
    screenKey: z.string().min(1),
    status: IssueStatus.optional(),
    type: IssueType.optional(),
    limit: z.number().int().min(1).max(200).optional()
  },
  async args => {
    const data = await fetchJson('/api/gravity/issues', args)
    return asTextResult(pruneEvidence(data))
  }
)

server.tool(
  'gravity-issues-for-owner',
  {
    owner: z.string().min(1),
    status: IssueStatus.optional(),
    type: IssueType.optional(),
    limit: z.number().int().min(1).max(200).optional()
  },
  async ({ owner, ...rest }) => {
    const maybeUuid = owner.includes('@') ? null : owner
    const params = owner.includes('@') ? { ownerEmail: owner, ...rest } : { ownerUserId: maybeUuid, ...rest }
    const data = await fetchJson('/api/gravity/issues', params)
    return asTextResult(pruneEvidence(data))
  }
)

server.tool(
  'gravity-get-issue-detail',
  'Get full detail for a single issue including console logs, failed network requests, and the screenshot image if available.',
  { id: z.string().uuid() },
  async ({ id }) => {
    const data = await fetchJson('/api/gravity/issues', { id, limit: 1 })
    const item = data?.items?.[0]
    if (!item) return asTextResult({ ok: false, error: 'Issue not found' })

    const evidence = item.buildInfo?.evidence
    const dataUrl = evidence?.screenshot?.dataUrl
    const detail = {
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      screenKey: item.screenKey,
      screenDisplayName: item.screenDisplayName,
      ownerEmail: item.ownerEmail,
      reporterName: item.reporterName,
      pageUrl: item.pageUrl,
      resolutionNotes: item.resolutionNotes ?? null,
      resolvedBy: item.resolvedBy ?? null,
      resolvedAt: item.resolvedAt ?? null,
      createdAt: item.createdAt,
      hasScreenshot: !!dataUrl
    }

    if (evidence?.telemetry?.console?.length) detail.consoleLogs = evidence.telemetry.console
    if (evidence?.telemetry?.network?.length) detail.failedRequests = evidence.telemetry.network

    const content = [{ type: 'text', text: JSON.stringify({ ok: true, issue: detail }, null, 2) }]

    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (match) content.push({ type: 'image', data: match[2], mimeType: match[1] })
    }

    return { content }
  }
)

server.tool('gravity-get-issue-screenshot', { id: z.string().uuid() }, async ({ id }) => {
  const data = await fetchJson('/api/gravity/issues', { id, limit: 1 })
  const item = data?.items?.[0]
  const dataUrl = item?.buildInfo?.evidence?.screenshot?.dataUrl
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return asTextResult({ ok: false, error: 'No screenshot for this issue' })
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return asTextResult({ ok: false, error: 'Invalid screenshot encoding' })
  const mimeType = match[1]
  const base64 = match[2]
  return asImageResult(base64, mimeType)
})

server.tool(
  'gravity-set-issue-status',
  'Change the status of an issue. When setting to DONE, include resolution_notes and resolved_by.',
  {
    id: z.string().min(1),
    status: IssueStatus,
    resolution_notes: z.string().optional().describe('Explanation of how the issue was fixed'),
    resolved_by: z.string().optional().describe('Who resolved it, e.g. "Codex Automation", a person name, or email')
  },
  async args => {
    const data = await postJson('/api/gravity/issue-status', args)
    return asTextResult(data)
  }
)

server.tool('gravity-delete-issue', { id: z.string().min(1) }, async args => {
  const data = await postJson('/api/gravity/issue-delete', args)
  return asTextResult(data)
})

const transport = new StdioServerTransport()
await server.connect(transport)
