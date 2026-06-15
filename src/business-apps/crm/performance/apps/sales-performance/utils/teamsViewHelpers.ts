/**
 * Shared URL helpers for Teams view sub-tabs
 * Mirrors analyticsViewHelpers pattern (analyticsTab → teamsTab)
 */

import type { TeamsTabKey } from '../types/teamTypes'

const VALID_TEAMS_TABS = new Set<TeamsTabKey>(['comparison', 'list'])

export const getInitialTeamsTab = (): TeamsTabKey => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const tabFromUrl = urlParams.get('teamsTab') ?? urlParams.get('teamTab')

  if (tabFromUrl && VALID_TEAMS_TABS.has(tabFromUrl as TeamsTabKey)) {
    return tabFromUrl as TeamsTabKey
  }

  return 'comparison'
}

export const getInitialTeamId = (): string | null => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  return urlParams.get('teamId')
}

export const updateTeamsTabUrl = (tab: TeamsTabKey): void => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  urlParams.set('teamsTab', tab)
  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

export const updateTeamIdUrl = (teamId: string | null): void => {
  const urlParams = new URLSearchParams(globalThis.location.search)

  if (teamId) {
    urlParams.set('teamId', teamId)
  } else if (urlParams.has('teamId')) {
    urlParams.delete('teamId')
  }

  if (!teamId && urlParams.has('teamView')) {
    urlParams.delete('teamView')
  }

  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

export const initializeTeamsTabUrl = (currentTab: TeamsTabKey): void => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  if (!urlParams.has('teamsTab')) {
    updateTeamsTabUrl(currentTab)
  }
}
