import { useState, useEffect, useCallback } from 'react'
import type { TeamsTabKey } from '../types/teamTypes'
import {
  getInitialTeamsTab,
  getInitialTeamId,
  updateTeamsTabUrl,
  updateTeamIdUrl,
  initializeTeamsTabUrl
} from '../utils/teamsViewHelpers'

export interface TeamsViewState {
  activeTab: TeamsTabKey
  handleTabChange: (tab: TeamsTabKey) => void
  selectedTeamId: string | null
  handleTeamSelect: (teamId: string) => void
  handleBackFromTeam: () => void
}

export function useTeamsViewState(): TeamsViewState {
  const [activeTab, setActiveTab] = useState<TeamsTabKey>(getInitialTeamsTab)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(getInitialTeamId)

  const handleTabChange = useCallback((tab: TeamsTabKey) => {
    setActiveTab(tab)
    updateTeamsTabUrl(tab)
  }, [])

  const handleTeamSelect = useCallback((teamId: string) => {
    setSelectedTeamId(teamId)
    updateTeamIdUrl(teamId)
  }, [])

  const handleBackFromTeam = useCallback(() => {
    setSelectedTeamId(null)
    updateTeamIdUrl(null)
  }, [])

  useEffect(() => {
    initializeTeamsTabUrl(activeTab)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTeamsTab())
      setSelectedTeamId(getInitialTeamId())
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  return {
    activeTab,
    handleTabChange,
    selectedTeamId,
    handleTeamSelect,
    handleBackFromTeam
  }
}
