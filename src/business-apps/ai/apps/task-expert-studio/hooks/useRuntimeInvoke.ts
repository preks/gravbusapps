import { useCallback } from 'react'
import { env } from '@/common/env/EnvUtils'

// Get runtime base URL with fallback to localhost for local development
const getRuntimeBase = () => {
  const runtimeUrl = env('NEXT_PUBLIC_TOOL_RUNTIME_BASE_URL')
  if (runtimeUrl) {
    return runtimeUrl.endsWith('/') ? runtimeUrl.slice(0, -1) : runtimeUrl
  }

  // Fallback to localhost for local development
  return 'http://localhost:3000'
}

export interface TestFunctionOptions {
  source: string
  payload: unknown
  config?: Record<string, any>
  settings?: Record<string, any>
  schemaConfig?: { input?: Record<string, unknown>; output?: Record<string, unknown> }
}

export const useRuntimeInvoke = () => {
  const invoke = useCallback(async (toolId: string, payload: unknown) => {
    const runtimeBase = getRuntimeBase()
    const url = new URL(`/api/${encodeURIComponent(toolId)}`, runtimeBase)
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Runtime error ${res.status}: ${text}`)
    }
    const data = await res.json().catch(async () => ({ content: await res.text() }))
    return data
  }, [])

  const test = useCallback(async (options: TestFunctionOptions) => {
    const runtimeBase = getRuntimeBase()
    const url = new URL('/test', runtimeBase)

    const body: any = {
      source: options.source,
      payload: options.payload || {},
      config: options.config || {},
      settings: options.settings || {}
    }

    // Only include schemaConfig if it's provided and has content
    if (options.schemaConfig && (options.schemaConfig.input || options.schemaConfig.output)) {
      body.schemaConfig = options.schemaConfig
    }

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const text = await res.text()
      const errorData = await res.json().catch(() => ({ error: text }))
      throw new Error(errorData.error || errorData.message || `Runtime error ${res.status}: ${text}`)
    }
    const data = await res.json()
    return data.result || data
  }, [])

  return { invoke, test }
}

export default useRuntimeInvoke
