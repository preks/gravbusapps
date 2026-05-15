/**
 * Fetches and caches the server's curated model catalog for the
 * Every Fabric composer model selector.
 *
 * The catalog is loaded once per app session — it only changes when the
 * backend operator updates the supported-models list, which requires a
 * deployment. We therefore cache aggressively in module scope so all
 * instances of the hook share the same promise and resolved data.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ModelOption, ModelOptionsResponse, ReasoningEffort } from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'

// Module-level shared cache so every hook instance re-uses the same data.
let _cachedOptions: ModelOptionsResponse | null = null
let _pendingFetch: Promise<ModelOptionsResponse> | null = null

export interface UseModelOptionsResult {
  models: ModelOption[]
  defaultModelId: string
  defaultReasoningEffort: ReasoningEffort
  isLoading: boolean
  error: string | null
  /** Reload from server (bypasses module cache). */
  reload: () => void
}

export function useModelOptions(accessToken: string): UseModelOptionsResult {
  const client = useEnterpriseAgentClient(accessToken)
  const [options, setOptions] = useState<ModelOptionsResponse | null>(_cachedOptions)
  const [isLoading, setIsLoading] = useState(!_cachedOptions)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(
    async (bust = false) => {
      if (bust) {
        _cachedOptions = null
        _pendingFetch = null
      }
      if (_cachedOptions && !bust) {
        setOptions(_cachedOptions)
        setIsLoading(false)
        return
      }
      _pendingFetch ??= client.getModelOptions()
      setIsLoading(true)
      setError(null)
      try {
        const result = await _pendingFetch
        _cachedOptions = result
        if (mountedRef.current) {
          setOptions(result)
          setIsLoading(false)
        }
      } catch {
        _pendingFetch = null
        if (mountedRef.current) {
          setError('Failed to load model options. Using defaults.')
          setIsLoading(false)
        }
      }
    },
    [client.getModelOptions]
  )

  useEffect(() => {
    mountedRef.current = true
    if (!_cachedOptions) {
      load().catch(() => undefined)
    }
    return () => {
      mountedRef.current = false
    }
  }, [load])

  return {
    models: options?.models ?? [],
    defaultModelId: options?.default_model ?? 'gpt-5.4',
    defaultReasoningEffort: (options?.default_reasoning_effort ?? 'none') as ReasoningEffort,
    isLoading,
    error,
    reload: () => {
      load(true).catch(() => undefined)
    }
  }
}
