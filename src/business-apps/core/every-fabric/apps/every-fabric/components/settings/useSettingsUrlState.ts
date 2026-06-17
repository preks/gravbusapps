// URL-driven state for the Settings screens.
//
// Query-string params live under the `view=settings` shell so the
// browser back/forward buttons, deep links, and refreshes all line up:
//
//   ?tab=<settings|agents|skills|tools>  // active tab
//   &section=<configuration|memory|policies|metrics>  // settings-tab section
//   &agentId=<id>                         // selected agent (agent detail view)
//   &skillId=<id>                         // selected skill (skill editor)
//
// Intentionally separate from `useSessionUrlState` (which handles the
// top-level `view` switching) so this stays scoped to Settings.

import { useCallback, useEffect, useState } from 'react'
import { getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'
import {
  DEFAULT_SETTINGS_SECTION,
  isValidSettingsSectionId,
  type SettingsSectionId
} from './settingsSections.constants'

export type SettingsTab = 'settings' | 'agents' | 'skills' | 'tools'

const VALID_TABS: ReadonlySet<SettingsTab> = new Set<SettingsTab>(['settings', 'agents', 'skills', 'tools'])

const DEFAULT_TAB: SettingsTab = 'settings'

export interface SettingsUrlState {
  tab: SettingsTab
  section: SettingsSectionId
  agentId: string | null
  skillId: string | null
}

export interface SettingsUrlUpdate {
  tab?: SettingsTab | null
  section?: SettingsSectionId | null
  agentId?: string | null
  skillId?: string | null
}

function readSearchParam(name: string): string | null {
  if (typeof globalThis.location === 'undefined') return null
  return new URLSearchParams(globalThis.location.search).get(name)
}

function normaliseTab(value: string | null): SettingsTab {
  if (value && VALID_TABS.has(value as SettingsTab)) {
    return value as SettingsTab
  }
  return DEFAULT_TAB
}

function normaliseSection(value: string | null): SettingsSectionId {
  if (isValidSettingsSectionId(value)) {
    return value
  }
  return DEFAULT_SETTINGS_SECTION
}

function readUrlState(): SettingsUrlState {
  return {
    tab: normaliseTab(readSearchParam('tab')),
    section: normaliseSection(readSearchParam('section')),
    agentId: readSearchParam('agentId'),
    skillId: readSearchParam('skillId')
  }
}

export interface UseSettingsUrlStateApi extends SettingsUrlState {
  setTab: (tab: SettingsTab) => void
  setSection: (section: SettingsSectionId) => void
  setAgent: (agentId: string | null) => void
  setSkill: (skillId: string | null) => void
  // Combined update so callers can transition multiple params atomically
  updateUrl: (changes: SettingsUrlUpdate) => void
}

export function useSettingsUrlState(): UseSettingsUrlStateApi {
  const [state, setState] = useState<SettingsUrlState>(() => readUrlState())

  // Keep local state in sync with browser navigation events (back/forward,
  // external pushState by the parent shell).
  useEffect(() => {
    if (typeof globalThis.addEventListener !== 'function') return undefined
    const handler = () => setState(readUrlState())
    globalThis.addEventListener('popstate', handler)
    return () => globalThis.removeEventListener('popstate', handler)
  }, [])

  const updateUrl = useCallback((changes: SettingsUrlUpdate) => {
    if (globalThis.history === undefined || globalThis.location === undefined) return
    const updates: Record<string, string | null> = {}
    if ('tab' in changes) updates.tab = changes.tab ?? null
    if ('section' in changes) updates.section = changes.section ?? null
    if ('agentId' in changes) updates.agentId = changes.agentId ?? null
    if ('skillId' in changes) updates.skillId = changes.skillId ?? null
    // Default tab is implicit — drop it from the URL to keep links clean.
    if (updates.tab === DEFAULT_TAB) updates.tab = null
    // Default section is implicit — drop it from the URL to keep links clean.
    if (updates.section === DEFAULT_SETTINGS_SECTION) updates.section = null
    // Switching tabs should clear agentId/skillId to prevent stale state.
    if ('tab' in changes && changes.tab !== null) {
      updates.agentId = null
      updates.skillId = null
      if (changes.tab !== DEFAULT_TAB) {
        updates.section = null
      }
    }
    // Clearing the agent must also drop agentId param.
    if ('agentId' in changes && changes.agentId === null) {
      updates.agentId = null
    }
    // Clearing the skill must also drop skillId param.
    if ('skillId' in changes && changes.skillId === null) {
      updates.skillId = null
    }
    const next = getCurrentUrlWithUpdatedSearchParams(updates)
    if (!next) return
    if (next === `${globalThis.location.pathname}${globalThis.location.search}`) {
      // URL is already in the requested state; still resync local state
      // because the caller may have mutated upstream.
      setState(readUrlState())
      return
    }
    const currentState = globalThis.history.state
    globalThis.history.pushState({ ...(currentState ?? {}) }, '', next)
    setState(readUrlState())
  }, [])

  const setTab = useCallback((tab: SettingsTab) => updateUrl({ tab }), [updateUrl])
  const setSection = useCallback((section: SettingsSectionId) => updateUrl({ tab: 'settings', section }), [updateUrl])
  const setAgent = useCallback((agentId: string | null) => updateUrl({ agentId }), [updateUrl])
  const setSkill = useCallback((skillId: string | null) => updateUrl({ skillId }), [updateUrl])

  return {
    ...state,
    setTab,
    setSection,
    setAgent,
    setSkill,
    updateUrl
  }
}
