import type { MemoryNamespace } from '../settings/agentSettings.types'

const NAMESPACE_KEYS: Record<MemoryNamespace, string> = {
  preferences: 'settings-memory-namespace-preferences',
  domain: 'settings-memory-namespace-domain',
  skills: 'settings-memory-namespace-skills',
  episodes: 'settings-memory-namespace-episodes'
}

const NAMESPACE_EMPTY_KEYS: Record<MemoryNamespace, string> = {
  preferences: 'settings-memory-empty-preferences',
  domain: 'settings-memory-empty-domain',
  skills: 'settings-memory-empty-skills',
  episodes: 'settings-memory-empty-episodes'
}

export function memoryNamespaceLabel(namespace: MemoryNamespace, t: (key: string) => string): string {
  return t(NAMESPACE_KEYS[namespace])
}

export function memoryNamespaceEmptyLabel(namespace: MemoryNamespace, t: (key: string) => string): string {
  return t(NAMESPACE_EMPTY_KEYS[namespace])
}

const SALIENCE_BUCKET_KEYS: Record<string, string> = {
  routine: 'memory-lens-graph-detail-salience-routine',
  notable: 'memory-lens-graph-detail-salience-notable',
  important: 'memory-lens-graph-detail-salience-important',
  critical: 'memory-lens-graph-detail-salience-critical'
}

export function salienceBucketLabel(bucketId: string, fallback: string, t: (key: string) => string): string {
  const key = SALIENCE_BUCKET_KEYS[bucketId]
  return key ? t(key) : fallback
}
