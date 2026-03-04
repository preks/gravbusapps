import { useMemo } from 'react'

export function useDecisionTaskExperts(
  agents: any[] | undefined,
  promptId: string | undefined
): {
  decisionTaskExperts: any[]
  selectedTaskExpert: any | undefined
  decisionResultEnumOptions: string[]
} {
  const decisionTaskExperts = useMemo(() => {
    const isDecisionExpert = (p: any): boolean => {
      if (!p || typeof p !== 'object') return false
      if (p.agent_type !== 'decision') return false
      const schema = p.response_schema
      const props = schema && typeof schema === 'object' ? (schema as Record<string, unknown>).properties : undefined
      const dr = props && typeof props === 'object' ? (props as Record<string, unknown>).decisionResult : undefined
      const en = dr && typeof dr === 'object' ? (dr as Record<string, unknown>).enum : undefined
      return Array.isArray(en) && en.length > 0 && en.every((v: any) => typeof v === 'string' && String(v).trim())
    }
    return (agents ?? []).filter(isDecisionExpert)
  }, [agents])

  const selectedTaskExpert = useMemo(() => {
    const id = String(promptId || '').trim()
    if (!id) return undefined
    return decisionTaskExperts.find(a => a._id === id)
  }, [decisionTaskExperts, promptId])

  const decisionResultEnumOptions = useMemo(() => {
    const schema = selectedTaskExpert?.response_schema
    const props = schema && typeof schema === 'object' ? schema.properties : undefined
    const dr = props && typeof props === 'object' ? (props as Record<string, unknown>).decisionResult : undefined
    const en = dr && typeof dr === 'object' ? (dr as Record<string, unknown>).enum : undefined
    if (!Array.isArray(en)) return []
    return en.map(v => String(v || '').trim()).filter(Boolean)
  }, [selectedTaskExpert])

  return { decisionTaskExperts, selectedTaskExpert, decisionResultEnumOptions }
}
