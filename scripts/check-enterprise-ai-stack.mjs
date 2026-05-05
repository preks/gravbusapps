#!/usr/bin/env node

const checks = [
  ['Every Fabric UI', process.env.EVERY_FABRIC_UI_URL || 'http://localhost:3001/'],
  ['Prompt Manager', process.env.PROMPT_MANAGER_HEALTH_URL || 'http://localhost:8002/prompt-manager/'],
  [
    'Prompt Manager Contracts',
    process.env.PROMPT_MANAGER_CONTRACTS_URL || 'http://localhost:8002/prompt-manager/api/v1/enterprise-ai/contracts'
  ],
  ['FlowBot', process.env.FLOWBOT_HEALTH_URL || 'http://localhost:8888/flowbot/'],
  ['FlowBot Tool Catalog', process.env.FLOWBOT_TOOL_CATALOG_URL || 'http://localhost:8888/flowbot/api/tools/catalog'],
  ['Functions Service', process.env.FUNCTIONS_HEALTH_URL || 'http://localhost:8081/healthz']
]

async function check(name, url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  const started = Date.now()
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    const durationMs = Date.now() - started
    clearTimeout(timeout)
    if (!response.ok && response.status !== 204) {
      return { name, url, ok: false, status: response.status, durationMs }
    }
    return { name, url, ok: true, status: response.status, durationMs }
  } catch (error) {
    clearTimeout(timeout)
    return { name, url, ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

const results = await Promise.all(checks.map(([name, url]) => check(name, url)))
for (const result of results) {
  const suffix = result.ok
    ? `UP ${result.status} ${result.durationMs}ms`
    : `DOWN ${result.status ?? ''} ${result.error ?? ''}`.trim()
  console.log(`${result.name}: ${suffix} (${result.url})`)
}

if (results.some(result => !result.ok)) {
  process.exit(1)
}
