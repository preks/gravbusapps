import type { PromptContent, PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface PromptParameterGroups {
  system: string[]
  user: string[]
}

function normalizeParameterList(values?: string[]): string[] {
  const seen = new Set<string>()

  return (values ?? []).reduce<string[]>((acc, value) => {
    const normalized = String(value || '').trim()
    if (!normalized || seen.has(normalized)) return acc
    seen.add(normalized)
    acc.push(normalized)
    return acc
  }, [])
}

function extractPromptContentParameters(content?: PromptContent | null): string[] {
  if (!content || typeof content !== 'object') return []
  return normalizeParameterList(content.parameters)
}

function hasPromptContentParameterMetadata(content?: PromptContent | null): boolean {
  return Boolean(content && typeof content === 'object' && Array.isArray(content.parameters))
}

export function extractPromptParameters(prompt?: Partial<PromptODM> | null): PromptParameterGroups {
  return {
    system: extractPromptContentParameters(prompt?.system_content ?? null),
    user: extractPromptContentParameters(prompt?.user_content ?? null)
  }
}

export function hasPromptParameterMetadata(prompt?: Partial<PromptODM> | null): boolean {
  if (!prompt || typeof prompt !== 'object') return false
  return (
    hasPromptContentParameterMetadata(prompt.system_content ?? null) ||
    hasPromptContentParameterMetadata(prompt.user_content ?? null)
  )
}

export function syncPromptParamMap(
  existing: Record<string, string> | undefined,
  allowedParams: string[]
): { map: Record<string, string>; changed: boolean } {
  const nextMap: Record<string, string> = {}
  let changed = false
  const current = existing ?? {}

  for (const paramName of normalizeParameterList(allowedParams)) {
    if (Object.prototype.hasOwnProperty.call(current, paramName)) {
      nextMap[paramName] = current[paramName] ?? ''
    } else {
      nextMap[paramName] = ''
      changed = true
    }
  }

  if (!changed) {
    const currentKeys = Object.keys(current)
    if (currentKeys.length !== Object.keys(nextMap).length) {
      changed = true
    } else {
      changed = currentKeys.some(key => !Object.prototype.hasOwnProperty.call(nextMap, key))
    }
  }

  return { map: nextMap, changed }
}

export function getUnmappedPromptParams(
  paramMap: Record<string, string> | undefined,
  allowedParams: string[]
): string[] {
  const current = paramMap ?? {}
  return normalizeParameterList(allowedParams).filter(paramName => !String(current[paramName] ?? '').trim())
}
