import React, { useState, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button, AiButton } from '@newwork/nw-design-system'
import { Input } from '@newwork/nw-design-system'
import { Textarea } from '@newwork/nw-design-system'
import {
  Loader2,
  Bot,
  Sparkles,
  Upload,
  Download,
  CheckCircle,
  CheckCircle2,
  X,
  AlertCircle,
  Copy,
  Check,
  PanelLeft,
  PanelLeftClose,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Brain
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Label } from '@newwork/nw-design-system'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { SYSTEM_PROMPT } from './config/systemPrompt'
import { FileExplorer } from './components/FileExplorer'
import { FilePreview } from './components/FilePreview'
import { SessionList } from './components/SessionList'
import { AdminSettings } from './components/AdminSettings'
import { IndexingProgress } from './components/IndexingProgress'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_ID } from '@/common/data/employee/queries/employeeQueries'
import { SessionMetadata, SessionUser } from './types/session'
import { saveSession, listSessions, deleteSession as deleteSessionAPI } from './api/sessionClient'
import { loadChatHistory, saveChatHistory } from './api/chatClient'
import { ENV } from './config/environment'
import { useDebounce } from '@/common/hooks/useDebounce'

// Normalize excessive newlines and fix spacing issues
const normalizeNewlines = (text: string): string => {
  return (
    text
      .replace(/([.!?])([A-Z])/g, '$1 $2') // Add space between sentence end and next sentence start
      .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
      .replace(/^\n+/, '') // Remove leading newlines
      .replace(/\n+$/, '') // Remove trailing newlines
      .replace(/\n\n+/g, '\n\n') // Ensure max 2 consecutive newlines
      // Remove extra newlines around list items (- or * or numbered)
      .replace(/\n\n+([-*]|\d+\.)\s/g, '\n$1 ') // Single newline before list items
      .replace(/([-*]|\d+\.)\s.*\n\n+(?=[-*]|\d+\.)/g, match => match.replace(/\n\n+/g, '\n'))
  ) // Single newline between list items
}

// Simple markdown renderer for code blocks and inline code
const MarkdownRenderer: React.FC<{ content: string }> = ({ content: rawContent }) => {
  // Normalize newlines before processing
  const content = normalizeNewlines(rawContent)
  const [copiedBlocks, setCopiedBlocks] = useState<Set<number>>(new Set())

  const copyToClipboard = (text: string, blockIndex: number) => {
    navigator.clipboard.writeText(text)
    setCopiedBlocks(prev => new Set(prev).add(blockIndex))
    setTimeout(() => {
      setCopiedBlocks(prev => {
        const newSet = new Set(prev)
        newSet.delete(blockIndex)
        return newSet
      })
    }, 2000)
  }

  // Split content by code blocks
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = []
  let currentPos = 0
  let blockIndex = 0

  // Match code blocks with ```language
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > currentPos) {
      parts.push({ type: 'text', content: content.slice(currentPos, match.index) })
    }

    // Add code block
    parts.push({
      type: 'code',
      content: match[2],
      language: match[1] || 'text'
    })

    currentPos = match.index + match[0].length
  }

  // Add remaining text
  if (currentPos < content.length) {
    parts.push({ type: 'text', content: content.slice(currentPos) })
  }

  // Render inline code and formatting in text parts
  const renderText = (text: string) => {
    // Handle inline code `code`
    const inlineCodeRegex = /`([^`]+)`/g
    const segments: React.ReactNode[] = []
    let lastIndex = 0

    text.replace(inlineCodeRegex, (match, code, offset) => {
      // Add text before code
      if (offset > lastIndex) {
        const beforeText = text.slice(lastIndex, offset)
        segments.push(<span key={`text-${lastIndex}`}>{renderFormatting(beforeText)}</span>)
      }

      // Add inline code
      segments.push(
        <code
          key={`code-${offset}`}
          className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:text-sm gba:font-mono gba:text-primary"
        >
          {code}
        </code>
      )

      lastIndex = offset + match.length
      return match
    })

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push(<span key={`text-${lastIndex}`}>{renderFormatting(text.slice(lastIndex))}</span>)
    }

    return segments.length > 0 ? segments : renderFormatting(text)
  }

  // Render bold, italic, lists
  const renderFormatting = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      const trimmedLine = line.trim()
      const nextLine = lines[i + 1]?.trim()
      const isEmptyLine = trimmedLine === ''
      const nextIsListItem = nextLine?.startsWith('- ') || nextLine?.startsWith('* ') || /^\d+\.\s/.test(nextLine || '')

      // Skip empty lines before list items (they add unwanted spacing)
      if (isEmptyLine && nextIsListItem) {
        return null
      }

      return (
        <React.Fragment key={i}>
          {line.startsWith('- ') || line.startsWith('* ') ? (
            <div className="gba:flex gba:gap-2 gba:ml-4">
              <span className="gba:text-primary">•</span>
              <span>{renderInlineFormatting(line.slice(2))}</span>
            </div>
          ) : line.match(/^\d+\.\s/) ? (
            <div className="gba:flex gba:gap-2 gba:ml-4">
              <span className="gba:text-primary gba:font-semibold">{line.match(/^(\d+)\./)?.[1]}.</span>
              <span>{renderInlineFormatting(line.replace(/^\d+\.\s/, ''))}</span>
            </div>
          ) : line.startsWith('# ') ? (
            <h1 className="gba:text-2xl gba:font-bold gba:mt-4 gba:mb-2">{line.slice(2)}</h1>
          ) : line.startsWith('## ') ? (
            <h2 className="gba:text-xl gba:font-bold gba:mt-3 gba:mb-2">{line.slice(3)}</h2>
          ) : line.startsWith('### ') ? (
            <h3 className="gba:text-lg gba:font-semibold gba:mt-2 gba:mb-1">{line.slice(4)}</h3>
          ) : (
            <>{renderInlineFormatting(line)}</>
          )}
          {/* Only add <br /> if not an empty line and not followed by empty line before list */}
          {i < lines.length - 1 && !isEmptyLine && <br />}
        </React.Fragment>
      )
    })
  }

  // Render **bold** and *italic*
  const renderInlineFormatting = (text: string) => {
    // Handle **bold**
    const result: React.ReactNode[] = []
    let lastIndex = 0
    const boldRegex = /\*\*([^\*]+)\*\*/g

    text.replace(boldRegex, (match, content, offset) => {
      if (offset > lastIndex) {
        result.push(text.slice(lastIndex, offset))
      }
      result.push(
        <strong key={`bold-${offset}`} className="gba:font-semibold">
          {content}
        </strong>
      )
      lastIndex = offset + match.length
      return match
    })

    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex))
    }

    return result.length > 0 ? result : text
  }

  return (
    <div className="gba:space-y-3">
      {parts.map((part, i) => {
        if (part.type === 'code') {
          const isCopied = copiedBlocks.has(blockIndex)
          const currentBlockIndex = blockIndex++

          return (
            <div key={i} className="gba:relative gba:group">
              <div className="gba:absolute gba:right-2 gba:top-2 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity">
                <button
                  onClick={() => copyToClipboard(part.content, currentBlockIndex)}
                  className="gba:p-1.5 gba:rounded gba:bg-muted/50 hover:gba:bg-muted gba:transition-colors"
                  title={getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.copy_code', 'Copy code')}
                >
                  {isCopied ? (
                    <Check className="gba:w-3.5 gba:h-3.5 gba:text-success" />
                  ) : (
                    <Copy className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="gba:rounded-lg gba:bg-muted/50 gba:border gba:border-border gba:overflow-hidden">
                {part.language && (
                  <div className="gba:px-3 gba:py-1 gba:text-xs gba:text-muted-foreground gba:bg-muted/30 gba:border-b gba:border-border gba:font-mono">
                    {part.language}
                  </div>
                )}
                <pre className="gba:p-4 gba:overflow-x-auto gba:text-sm">
                  <code className="gba:font-mono gba:text-foreground">{part.content}</code>
                </pre>
              </div>
            </div>
          )
        }

        return (
          <div key={i} className="gba:text-sm gba:leading-relaxed">
            {renderText(part.content)}
          </div>
        )
      })}
    </div>
  )
}

const API_URL = ENV.AI_SERVICE_API_URL

// Fetch app config from admin endpoint (returns repositoryIds and config status)
interface AppConfig {
  repositoryId: string
  configured: boolean
  message?: string
}

async function fetchAppConfig(): Promise<AppConfig> {
  const response = await fetch(`${API_URL}/api/admin/auto-init-configs`)
  if (!response.ok) {
    throw new Error('Failed to fetch app configuration')
  }

  const configs = await response.json()
  const enabledConfigs = configs.filter((c: { enabled: boolean }) => c.enabled)

  if (enabledConfigs.length === 0) {
    return {
      repositoryId: '',
      configured: false,
      message: 'No auto-init configurations found. Please configure repositories in Settings.'
    }
  }

  // Extract repository IDs from configs that have been initialized
  const repositoryIds = enabledConfigs
    .filter((c: { repoId?: string | null }) => c.repoId)
    .map((c: { repoId: string }) => c.repoId)

  if (repositoryIds.length === 0) {
    return {
      repositoryId: '',
      configured: true,
      message: 'Repositories configured but not yet initialized. Please wait for initialization to complete.'
    }
  }

  return {
    repositoryId: repositoryIds[0],
    configured: true
  }
}

// Exact interfaces from the AI service
interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{
    tool: string
    args?: string
    result?: string
    status: 'running' | 'complete'
    id: string
  }>
  thinkingLog?: string
  thinkingCollapsed?: boolean
  cost?: {
    inputTokens: number
    outputTokens: number
    totalCost: number
  }
}

interface UniqueFileSummary {
  totalUniqueFiles: number
  created: number
  modified: number
  deleted: number
  files: Array<{
    path: string
    type: 'create' | 'modify' | 'delete'
  }>
}

// Exact API function from the AI service
async function queryCode(
  repoId: string,
  query: string,
  conversationHistory: Message[] = [],
  useAgenticMode: boolean = true,
  buildEnabled: boolean = true,
  sessionId?: string,
  llmProvider: 'claude' | 'openai' = 'claude'
): Promise<ReadableStream> {
  const endpoint = useAgenticMode ? '/api/analyze/query-agentic' : '/api/analyze/query'

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repoId,
      query,
      stream: true,
      conversationHistory,
      buildEnabled,
      sessionId,
      llmProvider,
      customSystemPrompt: SYSTEM_PROMPT // 🚨 CRITICAL: Use gravity-business-apps system prompt!
    })
  })

  if (!response.ok || !response.body) {
    throw new Error('Failed to query code')
  }

  return response.body
}

/**
 * Sanitizes a filename by removing potentially dangerous characters.
 * Only allows alphanumeric characters, hyphens, underscores, and dots.
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Validates and sanitizes a URL to prevent XSS attacks.
 * Only allows safe relative paths starting with '/'.
 * Rejects javascript:, data:, vbscript:, and other dangerous protocols.
 */
function getSafeHref(url: string | null): string {
  if (!url) return '#'

  // Remove any leading/trailing whitespace and control characters
  const trimmedUrl = url.trim().replace(/[\x00-\x1f\x7f]/g, '')

  // Block dangerous protocols (case-insensitive)
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i
  if (dangerousProtocols.test(trimmedUrl)) {
    return '#'
  }

  // Only allow relative paths that start with /
  // This prevents protocol-relative URLs like //evil.com
  if (!trimmedUrl.startsWith('/') || trimmedUrl.startsWith('//')) {
    return '#'
  }

  if (!trimmedUrl.startsWith('/platform')) {
    return '/platform' + trimmedUrl
  }

  return trimmedUrl
}

async function downloadPatch(repoId: string, sessionId: string) {
  const response = await fetch(`${API_URL}/api/git/patch?repoId=${repoId}&sessionId=${sessionId}`)

  if (!response.ok) {
    // Try to get error message from response
    let errorMessage = 'Failed to download patch'
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
    } catch {
      // Response wasn't JSON, use default message
    }
    throw new Error(errorMessage)
  }

  const blob = await response.blob()
  // Sanitize sessionId to prevent any injection in filename
  const safeSessionId = sanitizeFilename(sessionId)
  const safeFilename = `ai-builder-${safeSessionId}.patch`

  // Use the modern download approach without DOM manipulation
  // This creates a temporary anchor, triggers download, and cleans up
  const blobUrl = URL.createObjectURL(blob)
  try {
    const link = Object.assign(document.createElement('a'), {
      href: blobUrl,
      download: safeFilename
    })
    link.click()
  } finally {
    // Always revoke the blob URL to free memory
    URL.revokeObjectURL(blobUrl)
  }
}

async function getChanges(repoId: string, sessionId: string) {
  const response = await fetch(`${API_URL}/api/git/changes?repoId=${repoId}&sessionId=${sessionId}`)
  if (!response.ok) {
    throw new Error('Failed to get changes')
  }
  return response.json()
}

interface PublishRequest {
  repositoryId: string
  sessionId: string
  accessToken: string
}

// Type for file change from the API
interface FileChange {
  path: string
  type: string
  filePath?: string
  newContent?: string
  changeType?: string
}

// Type for changes summary from API
interface ChangesSummary {
  total: number
  files: FileChange[]
}

// Type for changes response from API
interface ChangesResponse {
  summary?: ChangesSummary
  changes?: FileChange[]
}

// Type for employee from GraphQL
interface EmployeeRecord {
  id: string
  firstName?: string
  lastName?: string
  displayName?: string
  pictureThumbnail?: string
}

async function publishScreen(request: PublishRequest) {
  // targetPath and resourceUrl are retrieved from the session on the server
  const response = await fetch(`${API_URL}/api/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.accessToken}`
    },
    body: JSON.stringify({
      repoId: request.repositoryId,
      sessionId: request.sessionId
    })
  })

  if (!response.ok) {
    // Try to get detailed error from response
    let errorDetails = 'Failed to publish screen'
    try {
      const errorData = await response.json()
      // Get the most detailed error message available
      errorDetails = errorData.error || errorData.message || errorData.details || errorDetails

      // If there's a build error with stack trace, include it
      if (errorData.buildError) {
        errorDetails = `Build Error:\n${errorData.buildError}`
      }

      // If there's stderr output, include it
      if (errorData.stderr) {
        errorDetails = `${errorDetails}\n\nError Output:\n${errorData.stderr}`
      }
    } catch {
      // If response is not JSON, try to get text
      try {
        errorDetails = await response.text()
      } catch {
        errorDetails = `HTTP ${response.status}: ${response.statusText}`
      }
    }

    throw new Error(errorDetails)
  }

  const result = await response.json()
  return result // { success: true, message: string, targetPath: string, resourceUrl?: string, ... }
}

export const AIBuilder: React.FC<BusinessAppContextProps> = context => {
  // Config state - fetched from service
  const [repositoryId, setRepositoryId] = useState<string>('')
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configMessage, setConfigMessage] = useState<string | null>(null)

  // Exact state from the AI service demo
  const [messages, setMessages] = useState<Message[]>([])
  // Debounced messages for auto-save (waits 1 second after last change)
  const debouncedMessages = useDebounce(messages, 1000)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [, setThinkingContent] = useState('') // Used for accumulating thinking via setThinkingContent
  const [usage, setUsage] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    lastCallCost: 0
  })
  const [buildEnabled] = useState(true)
  const [llmProvider] = useState<'claude' | 'openai'>('claude')
  const [sessionId, setSessionId] = useState<string>('')
  const [uniqueFileSummary, setUniqueFileSummary] = useState<UniqueFileSummary | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [targetPath, setTargetPath] = useState('')
  const [detectedTargetPath, setDetectedTargetPath] = useState<string | null>(null)
  const [resourceUrl, setResourceUrl] = useState('')
  const [publishError, setPublishError] = useState<string | null>(null)

  // File Explorer state (collapsed by default)
  const [showFileExplorer, setShowFileExplorer] = useState(() => {
    // Check localStorage for user preference
    const saved = localStorage.getItem('ai-builder-show-file-explorer')
    // Default to false (collapsed) if no preference is saved
    return saved === 'true'
  })
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  // File Explorer user permission control
  const [fileExplorerEnabled] = useState(() => {
    // Can be controlled per user via environment variable or config
    const enabledForUser = localStorage.getItem('ai-builder-file-explorer-enabled')
    // Default to true (enabled for all), can be set to false for specific users
    return enabledForUser !== 'false'
  })

  // Toggle file explorer and save preference
  const toggleFileExplorer = () => {
    const newValue = !showFileExplorer
    setShowFileExplorer(newValue)
    localStorage.setItem('ai-builder-show-file-explorer', String(newValue))
  }
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)

  // User avatar state
  const [userPictureThumbnail, setUserPictureThumbnail] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Session management state
  const [showSessionList, setShowSessionList] = useState(true)
  const [showAdminSettings, setShowAdminSettings] = useState(false)
  const [sessions, setSessions] = useState<SessionMetadata[]>([])
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toolIdCounter = useRef(0)

  // Fetch app configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true)
        setConfigError(null)
        setConfigMessage(null)
        const config = await fetchAppConfig()
        if (config.repositoryId) {
          setRepositoryId(config.repositoryId)
        }
        if (config.message) {
          setConfigMessage(config.message)
        }
      } catch (error) {
        console.error('Failed to load app config:', error)
        setConfigError('Failed to load configuration. Please refresh the page.')
      } finally {
        setConfigLoading(false)
      }
    }

    loadConfig()
  }, [])

  // Load all sessions from API (for team visibility)
  useEffect(() => {
    const loadSessionsFromAPI = async () => {
      try {
        // Pass empty string as userId to get all sessions
        const response = await listSessions('')
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

  // Fetch current user data from employee record
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const employeeId = context.userInfo?.employeeDetails?.employeeId
      if (!employeeId || !context.accessToken || currentUser) return

      try {
        const query = GET_EMPLOYEE_LIGHT_BY_ID(employeeId)
        const result = await graphqlClient.request<{ Employee: EmployeeRecord[] }>(query)
        const employee = result.Employee?.[0]

        if (employee) {
          const user: SessionUser = {
            id: employee.id,
            employeeId: employeeId,
            firstName: employee.firstName || context.userInfo?.givenName || '',
            lastName: employee.lastName || context.userInfo?.familyName || '',
            displayName: employee.displayName || `${context.userInfo?.givenName} ${context.userInfo?.familyName}`,
            email: context.userInfo?.userName,
            pictureThumbnail: employee.pictureThumbnail,
            consentToStorePii: true // Allow storing user info for session display
          }
          setCurrentUser(user)
          setUserPictureThumbnail(employee.pictureThumbnail || null)
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error)
      }
    }

    fetchCurrentUser()
  }, [context.accessToken, context.userInfo, currentUser, graphqlClient])

  // Session management functions
  // Save a single session to API and update local state
  const saveSessionToAPI = async (session: SessionMetadata) => {
    try {
      await saveSession({
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
      const response = await saveSession({
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
      setMessages([])
      setTargetPath('')
      setResourceUrl('')
      setDetectedTargetPath(null)
      setUniqueFileSummary(null)
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
    // Update last modified time
    const updatedSession = sessions.find(s => s.sessionId === sid)
    if (updatedSession) {
      const updated = sessions.map(s => (s.sessionId === sid ? { ...s, lastModified: new Date().toISOString() } : s))
      updateSessionsState(updated)
      // Only save the session that was selected, not all sessions
      saveSessionToAPI({ ...updatedSession, lastModified: new Date().toISOString() })
    }
    // Note: Files will be loaded automatically by useEffect watching sessionId
  }

  const deleteSession = async (sid: string) => {
    try {
      // Delete from API
      await deleteSessionAPI(sid)

      // Delete from local state
      const updated = sessions.filter(s => s.sessionId !== sid)
      localStorage.setItem('ai-builder-sessions', JSON.stringify(updated))
      setSessions(updated)

      // If deleting current session, go back to session list
      if (sessionId === sid) {
        setSessionId('')
        setShowSessionList(true)
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
  }

  // Update session metadata when screen path or files change
  useEffect(() => {
    if (!sessionId || !currentUser || showSessionList) return

    const currentSession = sessions.find(s => s.sessionId === sessionId)
    if (!currentSession) return

    const updatedSession: SessionMetadata = {
      ...currentSession,
      targetPath: detectedTargetPath || targetPath || currentSession.targetPath,
      resourceUrl: resourceUrl || currentSession.resourceUrl,
      lastModified: new Date().toISOString(),
      fileCount: uniqueFileSummary?.totalUniqueFiles || currentSession.fileCount
    }

    // Update local state
    const updated = sessions.map(s => (s.sessionId === sessionId ? updatedSession : s))
    updateSessionsState(updated)

    // Save the current session to API (not just the first one)
    saveSessionToAPI(updatedSession)
  }, [sessionId, detectedTargetPath, targetPath, resourceUrl, uniqueFileSummary, showSessionList])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-load files and chat history when session is selected
  useEffect(() => {
    if (sessionId && !showSessionList) {
      // Load files
      checkForChanges()

      // Load chat history
      loadChatHistory(repositoryId, sessionId)
        .then(history => {
          if (history && history.length > 0) {
            setMessages(history as Message[])
          } else {
            setMessages([])
          }
        })
        .catch(error => {
          console.error('Failed to load chat history:', error)
          setMessages([])
        })
    }
  }, [sessionId, showSessionList])

  // Auto-save chat history when debounced messages change
  // Uses useDebounce hook for proper debouncing (1 second delay)
  useEffect(() => {
    if (sessionId && !showSessionList && debouncedMessages.length > 0) {
      saveChatHistory(repositoryId, sessionId, debouncedMessages as Message[])
    }
  }, [debouncedMessages, sessionId, showSessionList, repositoryId])

  // Check for changes
  const checkForChanges = async () => {
    if (!sessionId) {
      return
    }

    // Use session's repoId if available, otherwise fall back to current repositoryId
    const currentSession = sessions.find(s => s.sessionId === sessionId)
    const repoIdToUse = currentSession?.repoId || repositoryId

    if (!repoIdToUse) {
      console.warn('No repository ID available for fetching changes')
      return
    }

    try {
      const data: ChangesResponse = await getChanges(repoIdToUse, sessionId)

      // Calculate unique files summary (not counting duplicates)
      if (data.summary && data.summary.files) {
        const fileMap = new Map<string, { path: string; type: 'create' | 'modify' | 'delete' }>()

        // Process files in order - later changes override earlier ones
        data.summary.files.forEach((file: FileChange) => {
          const normalizedType = file.type === 'create' ? 'create' : file.type === 'delete' ? 'delete' : 'modify'
          fileMap.set(file.path, { path: file.path, type: normalizedType })
        })

        const uniqueFiles = Array.from(fileMap.values())
        const created = uniqueFiles.filter(f => f.type === 'create').length
        const modified = uniqueFiles.filter(f => f.type === 'modify').length
        const deleted = uniqueFiles.filter(f => f.type === 'delete').length

        // Total for publishing excludes deleted files (they won't be published)
        const totalForPublish = uniqueFiles.filter(f => f.type !== 'delete').length

        setUniqueFileSummary({
          totalUniqueFiles: totalForPublish, // Only count files that will be published
          created,
          modified,
          deleted,
          files: uniqueFiles
        })
      }

      // Auto-detect screen path from created files
      // Support both /apps/ and /screens/ structures
      if (data.summary && data.summary.files) {
        const indexFiles = data.summary.files.filter((f: FileChange) => {
          // Must include /apps/, /screens/, or /forms/
          const hasAppStructure =
            f.path.includes('/apps/') || f.path.includes('/screens/') || f.path.includes('/forms/')
          // Must end with /index.ts
          const isIndexFile = f.path.endsWith('/index.ts')
          // Must start with src/business-apps/
          const isBusinessApp = f.path.startsWith('src/business-apps/')
          // Must NOT be inside a subdirectory (types/, hooks/, components/, etc.)
          // The pattern should be: src/business-apps/.../apps/screen-name/index.ts
          // NOT: src/business-apps/.../apps/screen-name/types/index.ts
          const isRootIndex = !f.path.match(
            /\/(types|hooks|components|utils|queries|api|config|styles|assets)\/index\.ts$/
          )

          return hasAppStructure && isIndexFile && isBusinessApp && isRootIndex
        })

        if (indexFiles.length > 0) {
          // Extract path like "platform/examples/apps/hello-world" from
          // "src/business-apps/platform/examples/apps/hello-world/index.ts"
          const match = indexFiles[0].path.match(/src\/business-apps\/(.+)\/index\.ts$/)
          if (match) {
            const detectedPath = match[1]
            setDetectedTargetPath(detectedPath)
            setTargetPath(detectedPath) // Auto-populate

            // Auto-generate resource URL from the last segment (target path name)
            const segments = detectedPath.split('/')
            const screenName = segments[segments.length - 1]
            const urlPath = '/platform/' + screenName // e.g., "/platform/hello-world"
            setResourceUrl(urlPath)
          }
        }
      }
    } catch (error) {
      console.error('Failed to get changes:', error)
    }
  }

  // Handle publish
  const handlePublish = async () => {
    if (!targetPath || !resourceUrl) {
      setPublishError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.missing_publish_fields',
          'Please enter both target path and resource URL'
        )
      )
      return
    }

    setIsPublishing(true)
    setPublishError(null)
    try {
      // Ensure session is saved with targetPath and resourceUrl before publishing
      // The publish endpoint retrieves these from the session
      const currentSession = sessions.find(s => s.sessionId === sessionId)
      if (currentSession) {
        await saveSessionToAPI({
          ...currentSession,
          targetPath,
          resourceUrl,
          lastModified: new Date().toISOString()
        })
      }

      // Publish to platform (targetPath and resourceUrl are retrieved from session)
      await publishScreen({
        repositoryId,
        sessionId,
        accessToken: context.accessToken
      })

      const fullUrl = `/${targetPath}`
      setPublishSuccess(fullUrl)
      setShowPublishDialog(false)
      setPublishError(null)

      // Add success message to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: getTranslationFromI18nKeyAndLabel(
            'lowcoder:ai_builder.publish_success_message',
            `✅ **Screen published successfully!**\n\nYou can now access your screen at:\n${fullUrl}\n\nClick the link in the success banner to open it in a new tab.`,
            { url: fullUrl }
          )
        }
      ])

      setTimeout(() => setPublishSuccess(null), 10000)
    } catch (error) {
      console.error('Publish failed:', error)

      // Extract the full error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Show error in dialog
      setPublishError(errorMessage)

      // Format error message for AI (insert into input, don't auto-send)
      const errorPrompt = `The screen publishing failed with the following error:

\`\`\`
${errorMessage}
\`\`\`

Please analyze the error, fix the issues, and let me know when it's ready to republish.`

      // Insert error into input field (don't auto-send)
      setInput(errorPrompt)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    const userInput = input

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setThinking(false)
    setThinkingContent('')

    try {
      setThinking(true)
      setThinkingContent('')

      // ✅ Backend now handles full conversation history via RAG
      // Frontend just sends recent messages for bandwidth optimization
      // Backend loads full history from database + uses semantic search for best context
      const optimizedHistory = messages.slice(-20) // Last 20 for redundancy

      // For new sessions (empty history), send empty array to enable Claude's native extended thinking
      // Extended thinking properly separates reasoning from response in the API
      const history = optimizedHistory

      // Exact same as AI service line 348 - pass messages state (before setState completes)
      const stream = await queryCode(repositoryId, userInput, history, true, buildEnabled, sessionId, llmProvider)
      const reader = stream.getReader()
      const decoder = new TextDecoder()

      let assistantMessage = ''
      let needsNewMessage = false
      let hasCreatedInitialMessage = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue

              const data = JSON.parse(jsonStr)

              // iteration_complete
              if (data.type === 'iteration_complete') {
                needsNewMessage = true
                continue
              }

              // usage
              if (data.type === 'usage' && data.content) {
                const usageData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content
                // Accumulate costs across all messages in the conversation
                setUsage(prev => ({
                  totalInputTokens: prev.totalInputTokens + (usageData.totalInputTokens || 0),
                  totalOutputTokens: prev.totalOutputTokens + (usageData.totalOutputTokens || 0),
                  totalCost: prev.totalCost + (usageData.totalCost || 0),
                  lastCallCost: usageData.callCost || 0
                }))
                setMessages(prev => {
                  const newMessages = [...prev]
                  for (let i = newMessages.length - 1; i >= 0; i--) {
                    if (newMessages[i].role === 'assistant') {
                      newMessages[i] = {
                        ...newMessages[i],
                        cost: {
                          // Show the cost for THIS message only (from usageData which is per-request)
                          inputTokens: usageData.totalInputTokens || 0,
                          outputTokens: usageData.totalOutputTokens || 0,
                          totalCost: usageData.totalCost || 0 // This is the cost for this request/message
                        }
                      }
                      break
                    }
                  }
                  return newMessages
                })
                continue
              }

              // thinking
              if (data.type === 'thinking' && data.content) {
                setThinking(true)
                setThinkingContent(prev => prev + data.content)
                setMessages(prev => {
                  const next = [...prev]
                  if (next.length === 0 || next[next.length - 1].role !== 'assistant') {
                    next.push({ role: 'assistant', content: '', thinkingLog: '', thinkingCollapsed: false })
                  }
                  const last = next[next.length - 1]
                  last.thinkingLog = (last.thinkingLog || '') + data.content
                  if (typeof last.thinkingCollapsed !== 'boolean') last.thinkingCollapsed = false
                  return next
                })
                continue
              }

              // token/response
              if ((data.type === 'token' || data.type === 'response') && data.content) {
                setThinking(false)
                setThinkingContent('')

                setMessages(prev => {
                  const next = [...prev]
                  if (
                    next.length > 0 &&
                    next[next.length - 1].role === 'assistant' &&
                    next[next.length - 1].thinkingLog
                  ) {
                    next[next.length - 1].thinkingCollapsed = true
                  }
                  return next
                })

                if (!hasCreatedInitialMessage || needsNewMessage) {
                  setMessages(prev => [...prev, { role: 'assistant', content: '' }])
                  hasCreatedInitialMessage = true
                  needsNewMessage = false
                  assistantMessage = ''
                }

                assistantMessage += data.content
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1].content = assistantMessage
                  return newMessages
                })
              } else if (data.type === 'tool_call' && data.toolName) {
                if (!hasCreatedInitialMessage) {
                  setMessages(prev => [...prev, { role: 'assistant', content: '' }])
                  hasCreatedInitialMessage = true
                  assistantMessage = ''
                }

                const toolArgs = data.content ? data.content.match(/\((.*)\)/)?.[1] : undefined

                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  if (!lastMsg.toolCalls) {
                    lastMsg.toolCalls = []
                  }

                  const alreadyExists = lastMsg.toolCalls.some(t => t.tool === data.toolName && t.args === toolArgs)

                  if (!alreadyExists) {
                    toolIdCounter.current += 1
                    lastMsg.toolCalls.push({
                      tool: data.toolName,
                      args: toolArgs,
                      status: 'running',
                      id: `tool-${toolIdCounter.current}`
                    })
                  }

                  return newMessages
                })
              } else if (data.type === 'tool_result' && data.toolName) {
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  if (lastMsg.toolCalls) {
                    const runningTools = lastMsg.toolCalls.filter(
                      t => t.tool === data.toolName && t.status === 'running'
                    )
                    if (runningTools.length > 0) {
                      const tool = runningTools[runningTools.length - 1]
                      tool.status = 'complete'
                      tool.result = data.content
                    }
                  }
                  return newMessages
                })
              }
            } catch {
              // Failed to parse chunk, skip
            }
          }
        }
      }
    } catch (error) {
      console.error('Query failed:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: getTranslationFromI18nKeyAndLabel(
            'lowcoder:ai_builder.error_message',
            `Sorry, there was an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          )
        }
      ])
    } finally {
      setLoading(false)

      // Check for changes after AI completes (allow time for database writes)
      // Database writes can take 1-2 seconds, especially with multiple files
      setTimeout(() => {
        checkForChanges()
      }, 2000)
    }
  }

  // Show loading state while fetching config
  if (configLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:bg-background">
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <Loader2 className="gba:h-8 gba:w-8 gba:animate-spin gba:text-primary" />
          <p className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.loading_configuration', 'Loading configuration...')}
          </p>
        </div>
      </div>
    )
  }

  // Show error state only if config API completely failed
  if (configError) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:bg-background">
        <Alert variant="destructive" className="gba:max-w-md">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <AlertDescription>{configError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show admin settings
  if (showAdminSettings) {
    return <AdminSettings onClose={() => setShowAdminSettings(false)} />
  }

  // Show session list if no active session OR if not configured (need to configure first)
  if (showSessionList || !repositoryId) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full">
        {/* Configuration warning banner */}
        {configMessage && (
          <div className="gba:bg-amber-50 dark:gba:bg-amber-950/30 gba:border-b gba:border-amber-200 dark:gba:border-amber-800 gba:px-6 gba:py-3">
            <div className="gba:flex gba:items-center gba:justify-between gba:max-w-6xl gba:mx-auto">
              <div className="gba:flex gba:items-center gba:gap-3">
                <AlertCircle className="gba:w-5 gba:h-5 gba:text-amber-600 dark:gba:text-amber-400" />
                <span className="gba:text-sm gba:text-amber-800 dark:gba:text-amber-200">{configMessage}</span>
              </div>
              <button
                onClick={() => setShowAdminSettings(true)}
                className="gba:text-sm gba:font-medium gba:text-amber-700 dark:gba:text-amber-300 hover:gba:underline"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.open_settings', 'Open Settings')}
              </button>
            </div>
          </div>
        )}
        <div className="gba:flex-1">
          <SessionList
            sessions={sessions}
            onSelectSession={repositoryId ? selectSession : () => {}}
            onCreateSession={repositoryId ? createNewSession : () => setShowAdminSettings(true)}
            onDeleteSession={deleteSession}
            onOpenSettings={() => setShowAdminSettings(true)}
            disabled={!repositoryId}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:h-full gba:relative gba:overflow-hidden">
      {/* AI-Themed Animated Background */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary/5 gba:via-background gba:to-accent/5">
        {/* Mesh Gradient Overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-30"
          style={{
            backgroundImage: `
            radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, hsl(var(--accent) / 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, hsl(var(--primary) / 0.1) 0%, transparent 50%)
          `
          }}
        />
        {/* Animated Grid */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="gba:relative gba:z-10 gba:flex gba:w-full gba:h-full">
        {/* File Explorer Sidebar */}
        {fileExplorerEnabled && showFileExplorer && sessionId && (
          <div className="gba:w-[320px] gba:border-r gba:border-border gba:flex-shrink-0 gba:bg-card/80 gba:backdrop-blur-sm">
            <FileExplorer repoId={repositoryId} sessionId={sessionId} onFileClick={path => setSelectedFile(path)} />
          </div>
        )}

        {/* Main Content */}
        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
          {/* Success Banner */}
          {publishSuccess && (
            <div className="gba:bg-success-secondary gba:border-b gba:border-success">
              <div className="gba:container gba:mx-auto gba:px-6 gba:py-3">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <CheckCircle className="gba:w-5 gba:h-5 gba:text-success" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-success-secondary-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.publish_success',
                          'Screen published successfully!'
                        )}
                      </p>
                      <a
                        href={getSafeHref(publishSuccess)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gba:text-xs gba:text-success hover:gba:underline gba:flex gba:items-center gba:gap-1"
                      >
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.open_screen', 'Open screen')}:{' '}
                        {publishSuccess}
                        <svg className="gba:w-3 gba:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => setPublishSuccess(null)}
                    className="gba:text-success-secondary-foreground hover:gba:opacity-80"
                  >
                    <X className="gba:w-4 gba:h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header with Glassmorphic Effect */}
          <div className="gba:border-b gba:border-border/50 gba:bg-card/60 gba:backdrop-blur-md gba:shadow-sm">
            <div className="gba:container gba:mx-auto gba:px-6 gba:py-4">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-gradient-to-br gba:from-primary gba:to-accent gba:flex gba:items-center gba:justify-center gba:shadow-lg">
                    <Sparkles className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
                  </div>
                  <div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <h1 className="gba:text-xl gba:font-bold gba:bg-gradient-to-r gba:from-primary gba:to-accent gba:bg-clip-text gba:text-transparent">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.title', 'NEWWORK AI Builder')}
                      </h1>
                      <Badge variant="aiGenerated" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.beta_badge', 'BETA')}
                      </Badge>
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.subtitle',
                        'Build screens with natural language • Powered by Claude 4.5 Sonnet'
                      )}
                      {sessionId && (
                        <span className="gba:ml-2 gba:px-2 gba:py-0.5 gba:bg-primary/10 gba:rounded gba:font-mono gba:text-[10px] gba:text-primary">
                          {sessionId.split('-').pop()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="gba:flex gba:items-center gba:gap-3">
                  {/* Back to Sessions Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={backToSessionList}
                    className="gba:gap-2"
                    title={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:ai_builder.back_to_sessions_title',
                      'Back to session list'
                    )}
                    data-testid="back-to-sessions-button"
                  >
                    <ArrowLeft className="gba:w-4 gba:h-4" />
                    <span className="gba:hidden md:gba:inline">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions_button', 'Sessions')}
                    </span>
                  </Button>

                  {/* File Explorer Toggle (always visible when session exists) */}
                  {fileExplorerEnabled && sessionId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleFileExplorer}
                      className="gba:gap-2"
                      title={
                        showFileExplorer
                          ? getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.hide_file_explorer',
                              'Hide file explorer'
                            )
                          : getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.show_file_explorer',
                              'Show file explorer'
                            )
                      }
                      data-testid="file-explorer-toggle-button"
                    >
                      {showFileExplorer ? (
                        <PanelLeftClose className="gba:w-4 gba:h-4" />
                      ) : (
                        <PanelLeft className="gba:w-4 gba:h-4" />
                      )}
                      <span className="gba:hidden md:gba:inline">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.files_button', 'Files')}
                      </span>
                    </Button>
                  )}

                  {usage.totalCost > 0 && (
                    <div className="gba:text-xs gba:text-muted-foreground">
                      <span>{(usage.totalInputTokens / 1000).toFixed(1)}K in / </span>
                      <span>{(usage.totalOutputTokens / 1000).toFixed(1)}K out • </span>
                      <span className="gba:font-semibold gba:text-success">${usage.totalCost.toFixed(4)}</span>
                    </div>
                  )}

                  {/* Refresh changes button */}
                  <Button size="sm" variant="outline" onClick={checkForChanges} className="gba:gap-2">
                    <Download className="gba:w-4 gba:h-4" />
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.refresh_files', 'Refresh Files')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Indexing Progress Banner */}
          <IndexingProgress />

          {/* Modern Changes Banner */}
          {uniqueFileSummary && uniqueFileSummary.totalUniqueFiles > 0 && (
            <div className="gba:bg-gradient-to-r gba:from-primary/10 gba:via-accent/5 gba:to-primary/10 gba:backdrop-blur-md gba:border-b gba:border-primary/20">
              <div className="gba:container gba:mx-auto gba:px-6 gba:py-4">
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                  {/* Left: File summary with expandable list */}
                  <div className="gba:flex gba:items-start gba:gap-4 gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div className="gba:relative gba:flex gba:items-center gba:justify-center">
                        <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                          <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-primary" />
                        </div>
                        <div className="gba:absolute gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/20 gba:animate-ping" />
                      </div>
                      <div className="gba:space-y-1">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <h3 className="gba:font-semibold gba:text-foreground gba:text-sm">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.ready_to_publish',
                              'Ready to Publish'
                            )}
                          </h3>
                          <span className="gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-xs gba:font-medium">
                            {uniqueFileSummary.totalUniqueFiles}{' '}
                            {uniqueFileSummary.totalUniqueFiles === 1
                              ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.file_singular', 'file')
                              : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.file_plural', 'files')}
                          </span>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                          {uniqueFileSummary.created > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success" />
                              {uniqueFileSummary.created}{' '}
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.created', 'created')}
                            </span>
                          )}
                          {uniqueFileSummary.modified > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-warning" />
                              {uniqueFileSummary.modified}{' '}
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.modified', 'modified')}
                            </span>
                          )}
                          {uniqueFileSummary.deleted > 0 && (
                            <span className="gba:flex gba:items-center gba:gap-1">
                              <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-destructive" />
                              {uniqueFileSummary.deleted}{' '}
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.deleted', 'deleted')}
                            </span>
                          )}
                        </div>
                        {/* File list */}
                        <details className="gba:mt-2 gba:text-xs">
                          <summary className="gba:cursor-pointer gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors">
                            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.view_files', 'View files')}
                          </summary>
                          <div className="gba:mt-2 gba:space-y-1 gba:pl-4 gba:max-h-40 gba:overflow-y-auto gba:pr-2">
                            {uniqueFileSummary.files.map((file, index) => (
                              <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:py-0.5">
                                <span
                                  className={`gba:w-1 gba:h-1 gba:rounded-full gba:flex-shrink-0 ${
                                    file.type === 'create'
                                      ? 'gba:bg-success'
                                      : file.type === 'delete'
                                        ? 'gba:bg-destructive'
                                        : 'gba:bg-warning'
                                  }`}
                                />
                                <span
                                  className="gba:font-mono gba:text-muted-foreground gba:truncate"
                                  title={file.path}
                                >
                                  {file.path}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="gba:flex gba:gap-2 gba:flex-shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        setPublishError(null)
                        setShowPublishDialog(true)
                      }}
                      className="gba:gap-2 gba:shadow-sm"
                    >
                      <Upload className="gba:w-4 gba:h-4" />
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_button', 'Publish')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await downloadPatch(repositoryId, sessionId)
                        } catch (error) {
                          alert(
                            error instanceof Error
                              ? error.message
                              : getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:ai_builder.download_patch_failed',
                                  'Failed to download patch'
                                )
                          )
                        }
                      }}
                      className="gba:gap-2"
                    >
                      <Download className="gba:w-4 gba:h-4" />
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.patch_button', 'Patch')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:space-y-4">
            {messages.length === 0 ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
                <div className="gba:text-center gba:space-y-6 gba:max-w-2xl">
                  <div className="gba:w-20 gba:h-20 gba:mx-auto gba:rounded-2xl gba:bg-primary gba:flex gba:items-center gba:justify-center">
                    <Sparkles className="gba:w-10 gba:h-10 gba:text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="gba:text-2xl gba:font-bold">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.welcome_title', 'Build Screens with AI')}
                    </h2>
                    <p className="gba:text-muted-foreground gba:mt-2">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.welcome_description',
                        "Describe what you want to build and I'll create it following NEWWORK patterns"
                      )}
                    </p>
                  </div>
                  <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-center">
                    {[
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.example_prompt_1',
                        'Create a lead list screen'
                      ),
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.example_prompt_2',
                        'Build a customer dashboard'
                      ),
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.example_prompt_3',
                        'Generate a contact form'
                      )
                    ].map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(s)}
                        className="gba:px-4 gba:py-2 gba:text-sm gba:rounded-lg gba:bg-muted hover:gba:bg-muted/80 gba:border"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {thinking && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:text-sm gba:py-2">
                    <Brain className="gba:w-4 gba:h-4 gba:animate-pulse gba:text-primary" />
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.thinking', 'Thinking...')}</span>
                  </div>
                )}

                {messages.map((message, i) => (
                  <div
                    key={i}
                    className={`gba:flex gba:gap-3 ${message.role === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                        <Bot className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
                      </div>
                    )}
                    <div className="gba:max-w-[85%]">
                      {message.role === 'user' ? (
                        <div className="gba:bg-primary gba:text-primary-foreground gba:rounded-2xl gba:px-4 gba:py-3 gba:shadow-sm">
                          <p className="gba:text-sm gba:leading-relaxed">{message.content}</p>
                        </div>
                      ) : (
                        <div className="gba:space-y-3 gba:bg-muted/30 gba:rounded-2xl gba:px-4 gba:py-3 gba:border gba:border-border/50">
                          {/* Only show thinking block if there's meaningful content (>50 chars) */}
                          {message.thinkingLog && message.thinkingLog.trim().length > 50 && (
                            <div className="gba:border gba:border-muted-foreground/20 gba:rounded-lg gba:overflow-hidden">
                              <button
                                className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-muted/50 gba:text-xs gba:text-muted-foreground hover:gba:bg-muted gba:transition-colors"
                                onClick={() => {
                                  setMessages(prev => {
                                    const next = [...prev]
                                    next[i].thinkingCollapsed = !next[i].thinkingCollapsed
                                    return next
                                  })
                                }}
                              >
                                {message.thinkingCollapsed ? (
                                  <ChevronRight className="gba:w-3 gba:h-3" />
                                ) : (
                                  <ChevronDown className="gba:w-3 gba:h-3" />
                                )}
                                <Brain className="gba:w-3 gba:h-3" />
                                <span className="gba:font-medium">
                                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.thinking_label', 'Thinking')}
                                </span>
                                <span className="gba:text-muted-foreground/60">
                                  ({Math.ceil(message.thinkingLog.length / 100)}{' '}
                                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.steps', 'steps')})
                                </span>
                              </button>
                              {!message.thinkingCollapsed && message.thinkingLog.trim() && (
                                <div className="gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:text-muted-foreground gba:whitespace-pre-wrap gba:max-h-64 gba:overflow-y-auto gba:border-t gba:border-muted-foreground/10">
                                  {message.thinkingLog}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="gba:bg-card gba:border gba:rounded-lg gba:px-3 gba:py-2">
                            {message.cost && (
                              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2 gba:pb-2 gba:border-b">
                                <span className="gba:text-xs gba:font-medium gba:text-primary">
                                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.ai_response', 'AI Response')}
                                </span>
                                <span className="gba:text-xs gba:text-muted-foreground">
                                  ${message.cost.totalCost.toFixed(4)} ({message.cost.inputTokens.toLocaleString()}in /{' '}
                                  {message.cost.outputTokens.toLocaleString()}out)
                                </span>
                              </div>
                            )}
                            <MarkdownRenderer content={message.content} />
                          </div>

                          {message.toolCalls && message.toolCalls.length > 0 && (
                            <div className="gba:bg-muted/50 gba:rounded-lg gba:p-2 gba:space-y-1">
                              <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.tools', 'Tools')} (
                                {message.toolCalls.length})
                              </span>
                              {message.toolCalls.map(tool => {
                                // Extract file path from tool args
                                let displayText = tool.tool
                                let filePath: string | null = null

                                if (tool.args) {
                                  // Try to extract file path from different tool types
                                  if (tool.tool === 'write_file' || tool.tool === 'read_file') {
                                    // Match patterns like: filePath: "src/..." or path: "src/..."
                                    const pathMatch = tool.args.match(/(?:filePath|path|target_file):\s*"([^"]+)"/)
                                    if (pathMatch) {
                                      filePath = pathMatch[1]
                                      displayText =
                                        tool.tool === 'write_file'
                                          ? getTranslationFromI18nKeyAndLabel(
                                              'lowcoder:ai_builder.tool_writing',
                                              '✍️ Writing'
                                            )
                                          : getTranslationFromI18nKeyAndLabel(
                                              'lowcoder:ai_builder.tool_reading',
                                              '📖 Reading'
                                            )
                                    }
                                  } else if (tool.tool === 'propose_change') {
                                    const fileMatch = tool.args.match(/file_path:\s*"([^"]+)"/)
                                    if (fileMatch) {
                                      filePath = fileMatch[1]
                                      displayText = getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:ai_builder.tool_editing',
                                        '🔧 Editing'
                                      )
                                    }
                                  }
                                }

                                return (
                                  <div key={tool.id} className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                                    <span
                                      className={`gba:w-2 gba:h-2 gba:rounded-full gba:flex-shrink-0 ${tool.status === 'complete' ? 'gba:bg-success' : 'gba:bg-warning gba:animate-pulse'}`}
                                    />
                                    <span className="gba:font-medium gba:text-muted-foreground">{displayText}</span>
                                    {filePath ? (
                                      <span
                                        className="gba:font-mono gba:text-xs gba:text-primary gba:truncate"
                                        title={filePath}
                                      >
                                        {filePath}
                                      </span>
                                    ) : (
                                      tool.args && (
                                        <span className="gba:text-muted-foreground gba:truncate gba:text-[10px]">
                                          {tool.args}
                                        </span>
                                      )
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <Avatar size="sm" className="gba:flex-shrink-0">
                        {userPictureThumbnail ? (
                          <AvatarImage
                            src={`data:image/jpeg;base64,${userPictureThumbnail}`}
                            alt={
                              context.userInfo
                                ? `${context.userInfo.givenName} ${context.userInfo.familyName}`
                                : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.you', 'You')
                            }
                          />
                        ) : null}
                        <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white gba:font-semibold gba:text-xs">
                          {context.userInfo
                            ? `${context.userInfo.givenName?.[0] || ''}${context.userInfo.familyName?.[0] || ''}`.toUpperCase()
                            : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="gba:border-t gba:bg-card gba:p-6">
            <form onSubmit={handleSubmit} className="gba:space-y-3">
              <div className="gba:relative">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e as any)
                    }
                  }}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.input_placeholder',
                    'Describe the screen you want to build... (Press Enter to send, Shift+Enter for new line)'
                  )}
                  disabled={loading}
                  rows={3}
                  className="gba:resize-none gba:text-base gba:leading-relaxed gba:pr-32"
                  data-testid="ai-builder-input"
                />
                <div className="gba:absolute gba:bottom-3 gba:right-3">
                  <AiButton
                    type="submit"
                    disabled={loading || !input.trim()}
                    size="lg"
                    className="gba:gap-2 gba:shadow-lg"
                    data-testid="ai-builder-send-button"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="gba:w-5 gba:h-5 gba:animate-spin" />
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.building', 'Building...')}
                      </>
                    ) : (
                      <>
                        <Bot className="gba:w-5 gba:h-5" />
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.generate', 'Generate')}
                      </>
                    )}
                  </AiButton>
                </div>
              </div>
              {loading && (
                <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:justify-center gba:gap-2">
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                  <span>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:ai_builder.analyzing_request',
                      'AI is analyzing your request and exploring the codebase...'
                    )}
                  </span>
                </div>
              )}
              {!loading && input.trim() && (
                <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.tip_message',
                    '💡 Tip: Be specific! Example: "Build a lead list screen with search, table, and pagination"'
                  )}
                </p>
              )}
            </form>
          </div>

          {/* Publish Dialog */}
          {showPublishDialog && (
            <div className="gba:fixed gba:inset-0 gba:bg-background/80 gba:backdrop-blur-sm gba:flex gba:items-center gba:justify-center gba:z-50 gba:p-4">
              <Card className="gba:w-full gba:max-w-2xl">
                <CardHeader>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <CardTitle className="gba:flex gba:items-center gba:gap-2">
                      <Upload className="gba:w-5 gba:h-5" />
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.publish_dialog_title',
                        'Publish to NEWWORK Platform'
                      )}
                    </CardTitle>
                    <button
                      onClick={() => setShowPublishDialog(false)}
                      className="gba:text-muted-foreground hover:gba:text-foreground"
                    >
                      <X className="gba:w-5 gba:h-5" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="gba:space-y-6">
                  {/* Files Summary */}
                  <div>
                    <h4 className="gba:text-sm gba:font-medium gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.files_to_publish', 'Files to Publish')} (
                      {uniqueFileSummary?.totalUniqueFiles || 0})
                    </h4>
                    <div className="gba:bg-muted gba:rounded-lg gba:p-3 gba:space-y-2">
                      <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                        {uniqueFileSummary && uniqueFileSummary.created > 0 && (
                          <span className="gba:flex gba:items-center gba:gap-1">
                            <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success" />
                            {uniqueFileSummary.created}{' '}
                            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.created', 'created')}
                          </span>
                        )}
                        {uniqueFileSummary && uniqueFileSummary.modified > 0 && (
                          <span className="gba:flex gba:items-center gba:gap-1">
                            <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-warning" />
                            {uniqueFileSummary.modified}{' '}
                            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.modified', 'modified')}
                          </span>
                        )}
                        {uniqueFileSummary && uniqueFileSummary.deleted > 0 && (
                          <span className="gba:flex gba:items-center gba:gap-1">
                            <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-destructive" />
                            {uniqueFileSummary.deleted}{' '}
                            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.deleted', 'deleted')}
                          </span>
                        )}
                      </div>
                      {/* File list */}
                      {uniqueFileSummary && uniqueFileSummary.files.length > 0 && (
                        <div className="gba:mt-2 gba:space-y-1 gba:max-h-32 gba:overflow-y-auto gba:text-xs">
                          {uniqueFileSummary.files.map((file, index) => (
                            <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:py-0.5">
                              <span
                                className={`gba:w-1 gba:h-1 gba:rounded-full gba:flex-shrink-0 ${
                                  file.type === 'create'
                                    ? 'gba:bg-success'
                                    : file.type === 'delete'
                                      ? 'gba:bg-destructive'
                                      : 'gba:bg-warning'
                                }`}
                              />
                              <span className="gba:font-mono gba:text-muted-foreground gba:truncate" title={file.path}>
                                {file.path}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auto-Detected Target Path */}
                  {detectedTargetPath ? (
                    <Alert className="gba:bg-success-secondary gba:border-success">
                      <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-success" />
                      <AlertDescription>
                        <div className="gba:text-sm gba:space-y-2">
                          <div>
                            <strong className="gba:text-success">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:ai_builder.ready_to_publish_status',
                                '✅ Ready to publish!'
                              )}
                            </strong>
                            <p className="gba:text-xs gba:mt-1 gba:text-muted-foreground">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:ai_builder.auto_configured_message',
                                'Everything is configured automatically. Just click "Publish" below!'
                              )}
                            </p>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                            <span className="gba:text-muted-foreground">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:ai_builder.target_path_label',
                                'Target path:'
                              )}
                            </span>
                            <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">
                              {detectedTargetPath}
                            </code>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                            <span className="gba:text-muted-foreground">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:ai_builder.resource_url_label',
                                'Resource URL:'
                              )}
                            </span>
                            <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">{resourceUrl}</code>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertCircle className="gba:w-4 gba:h-4" />
                      <AlertDescription className="gba:text-sm">
                        <strong>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.waiting_for_files',
                            'Waiting for files...'
                          )}
                        </strong>
                        <p className="gba:text-xs gba:mt-1">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.waiting_for_files_description',
                            'Ask the AI to create a screen and paths will be detected automatically.'
                          )}
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Manual inputs - only show if auto-detection failed */}
                  {!detectedTargetPath && (
                    <>
                      {/* Target Path */}
                      <div className="gba:space-y-2">
                        <Label htmlFor="target-path">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.target_path_field', 'Target Path *')}
                        </Label>
                        <Input
                          id="target-path"
                          value={targetPath}
                          onChange={e => setTargetPath(e.target.value)}
                          placeholder="platform/examples/apps/my-screen"
                        />
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.target_path_format',
                            'The path relative to the configured publish base path'
                          )}
                        </p>
                      </div>

                      {/* Resource URL */}
                      <div className="gba:space-y-2">
                        <Label htmlFor="resource-url">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.resource_url_field',
                            'Resource URL *'
                          )}
                        </Label>
                        <Input
                          id="resource-url"
                          value={resourceUrl}
                          onChange={e =>
                            setResourceUrl(
                              !e.target.value && e.target.value.startsWith('/platform')
                                ? `/platform${e.target.value}`
                                : e.target.value
                            )
                          }
                          placeholder="/platform/my-screen"
                        />
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.resource_url_help',
                            'The URL path where the screen will be accessible (e.g., /lead-list)'
                          )}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Info */}
                  <Alert>
                    <AlertCircle className="gba:w-4 gba:h-4" />
                    <AlertDescription className="gba:text-xs">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.publish_info',
                        'This will build the screen, upload to Azure, and automatically register it in the platform with the resource URL.'
                      )}
                    </AlertDescription>
                  </Alert>

                  {/* Error */}
                  {publishError && (
                    <Alert variant="destructive">
                      <AlertCircle className="gba:w-4 gba:h-4" />
                      <AlertDescription className="gba:text-xs gba:max-h-40 gba:overflow-y-auto gba:whitespace-pre-wrap">
                        {publishError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Actions */}
                  <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t">
                    <Button variant="outline" onClick={() => setShowPublishDialog(false)} disabled={isPublishing}>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.cancel', 'Cancel')}
                    </Button>
                    <Button
                      onClick={handlePublish}
                      disabled={isPublishing || !targetPath || !resourceUrl}
                      className="gba:gap-2"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publishing', 'Publishing...')}
                        </>
                      ) : (
                        <>
                          <Upload className="gba:w-4 gba:h-4" />
                          {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_screen', 'Publish Screen')}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* File Preview Modal */}
          {selectedFile && (
            <FilePreview
              filePath={selectedFile}
              repoId={repositoryId}
              sessionId={sessionId}
              onClose={() => setSelectedFile(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
