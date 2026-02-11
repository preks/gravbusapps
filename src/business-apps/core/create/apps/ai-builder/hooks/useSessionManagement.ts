import { useState, useEffect } from 'react'
import { SessionMetadata, SessionUser } from '../types/session'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const SESSION_ID_QUERY_PARAM = 'sessionId'

function getSessionIdFromUrl(): string | null {
  if (globalThis.window === undefined) return null
  return new URLSearchParams(globalThis.window.location.search).get(SESSION_ID_QUERY_PARAM)
}

function setSessionIdInUrl(sid: string | null): void {
  if (globalThis.window === undefined) return
  const params = new URLSearchParams(globalThis.window.location.search)
  if (sid) params.set(SESSION_ID_QUERY_PARAM, sid)
  else params.delete(SESSION_ID_QUERY_PARAM)
  const newSearch = params.toString()
  const newUrl =
    globalThis.window.location.pathname + (newSearch ? '?' + newSearch : '') + globalThis.window.location.hash
  globalThis.window.history.replaceState({}, '', newUrl)
}

interface UseSessionManagementProps {
  accessToken?: string
  repositoryId: string
  currentUser: SessionUser | null
}

interface UseSessionManagementReturn {
  sessions: SessionMetadata[]
  sessionId: string
  showSessionList: boolean
  setSessionId: (id: string) => void
  setShowSessionList: (show: boolean) => void
  createNewSession: () => Promise<void>
  selectSession: (sid: string) => void
  deleteSession: (sid: string) => Promise<void>
  backToSessionList: () => void
  updateSessionsState: (updatedSessions: SessionMetadata[]) => void
  saveSessionToAPI: (session: SessionMetadata) => Promise<void>
}

export const useSessionManagement = ({
  accessToken,
  repositoryId,
  currentUser
}: UseSessionManagementProps): UseSessionManagementReturn => {
  const [sessions, setSessions] = useState<SessionMetadata[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [showSessionList, setShowSessionList] = useState(true)

  const builderClient = useBuilderClient(accessToken)

  // Load all sessions from API (for team visibility)
  useEffect(() => {
    const loadSessionsFromAPI = async () => {
      try {
        // Pass empty string as userId to get all sessions
        const response = await builderClient.listSessions('')
        if (response.success) {
          setSessions(response.sessions)
          // Also cache in localStorage for faster initial load
          localStorage.setItem('ai-builder-sessions', JSON.stringify(response.sessions))
        }
      } catch (error) {
        console.error('Failed to load sessions from API:', error)
        // Fallback to localStorage if API fails
        try {
          const stored = localStorage.getItem('ai-builder-sessions')
          if (stored) {
            const parsedSessions: SessionMetadata[] = JSON.parse(stored)
            setSessions(parsedSessions)
          }
        } catch (localError) {
          console.error('Failed to load sessions from localStorage:', localError)
        }
      }
    }

    loadSessionsFromAPI()
  }, [])

  // Open session from URL when sessions are loaded
  useEffect(() => {
    if (sessions.length === 0) return
    const urlSessionId = getSessionIdFromUrl()
    if (!urlSessionId) return
    const exists = sessions.some(s => s.sessionId === urlSessionId)
    if (exists) {
      setSessionId(urlSessionId)
      setShowSessionList(false)
    }
  }, [sessions])

  // Save a single session to API and update local state
  const saveSessionToAPI = async (session: SessionMetadata) => {
    try {
      await builderClient.saveSession({
        sessionId: session.sessionId, // Include sessionId to update existing session
        repoId: repositoryId || undefined,
        targetPath: session.targetPath,
        resourceUrl: session.resourceUrl,
        fileCount: session.fileCount,
        description: session.description,
        createdBy: session.createdBy
      })
    } catch (apiError) {
      console.error('Failed to save session to API:', session.sessionId, apiError)
    }
  }

  // Update sessions state and localStorage (does NOT save to API)
  const updateSessionsState = (updatedSessions: SessionMetadata[]) => {
    localStorage.setItem('ai-builder-sessions', JSON.stringify(updatedSessions))
    setSessions(updatedSessions)
  }

  const createNewSession = async () => {
    if (!currentUser) {
      alert(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.user_not_loaded',
          'User information not loaded yet. Please wait a moment.'
        )
      )
      return
    }

    try {
      // Create session on server - it will generate the sessionId
      const response = await builderClient.saveSession({
        repoId: repositoryId || undefined,
        targetPath: null,
        resourceUrl: null,
        fileCount: 0,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.new_session_description',
          'New AI Builder session'
        ),
        createdBy: currentUser
      })

      const newSession: SessionMetadata = {
        sessionId: response.sessionId,
        repoId: repositoryId || null,
        targetPath: null,
        resourceUrl: null,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileCount: 0,
        createdBy: currentUser,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.new_session_description',
          'New AI Builder session'
        )
      }

      const updatedSessions = [newSession, ...sessions]
      updateSessionsState(updatedSessions)
      setSessionId(response.sessionId)
      setShowSessionList(false)
      setSessionIdInUrl(response.sessionId)
    } catch (error) {
      console.error('Failed to create session:', error)
      alert(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.create_session_failed',
          'Failed to create session. Please try again.'
        )
      )
    }
  }

  const selectSession = (sid: string) => {
    setSessionId(sid)
    setShowSessionList(false)
    setSessionIdInUrl(sid)
    // Update last modified time
    const updatedSession = sessions.find(s => s.sessionId === sid)
    if (updatedSession) {
      const updated = sessions.map(s => (s.sessionId === sid ? { ...s, lastModified: new Date().toISOString() } : s))
      updateSessionsState(updated)
      // Only save the session that was selected, not all sessions
      saveSessionToAPI({ ...updatedSession, lastModified: new Date().toISOString() })
    }
  }

  const deleteSession = async (sid: string) => {
    try {
      // Delete from API
      await builderClient.deleteSession(sid)

      // Delete from local state
      const updated = sessions.filter(s => s.sessionId !== sid)
      localStorage.setItem('ai-builder-sessions', JSON.stringify(updated))
      setSessions(updated)

      // If deleting current session, go back to session list
      if (sessionId === sid) {
        setSessionId('')
        setShowSessionList(true)
        setSessionIdInUrl(null)
      }

      // Also clean up session data from localStorage
      localStorage.removeItem(`ai-builder-session-${sid}`)
    } catch {
      alert(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.delete_session_failed',
          'Failed to delete session. Please try again.'
        )
      )
    }
  }

  const backToSessionList = () => {
    setShowSessionList(true)
    setSessionIdInUrl(null)
  }

  return {
    sessions,
    sessionId,
    showSessionList,
    setSessionId,
    setShowSessionList,
    createNewSession,
    selectSession,
    deleteSession,
    backToSessionList,
    updateSessionsState,
    saveSessionToAPI
  }
}
