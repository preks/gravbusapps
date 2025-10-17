import React, { useState, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { Input } from '@newwork/nw-design-system'
import { Textarea } from '@newwork/nw-design-system'
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Upload,
  Download,
  CheckCircle,
  CheckCircle2,
  X,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Label } from '@newwork/nw-design-system'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { SYSTEM_PROMPT } from './config/systemPrompt'

// Simple markdown renderer for code blocks and inline code
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
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
    return lines.map((line, i) => (
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
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    ))
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
                  title="Copy code"
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

// API Configuration - EXACT same as FORGE demo
const API_URL = 'https://forge-api-production-db58.up.railway.app'
const REPO_ID = '168cd931-0e04-4f64-a496-fcb4af916612'

// EXACT interfaces from FORGE
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

// EXACT API function from FORGE
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

async function downloadPatch(repoId: string, sessionId: string) {
  const response = await fetch(`${API_URL}/api/git/patch?repoId=${repoId}&sessionId=${sessionId}`)

  if (!response.ok) {
    throw new Error('Failed to download patch')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-builder-${sessionId}.patch`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function getChanges(repoId: string, sessionId: string) {
  const response = await fetch(`${API_URL}/api/git/changes?repoId=${repoId}&sessionId=${sessionId}`)
  if (!response.ok) {
    throw new Error('Failed to get changes')
  }
  return response.json()
}

// Use FORGE API (on Railway) for publishing - accessible from anywhere!
const PUBLISH_API_URL = API_URL // Same as FORGE API - publishes via /api/newwork/publish

interface PublishRequest {
  files: Array<{ path: string; content: string; changeType: string }>
  screenPath: string
  resourceUrl: string
  sessionId: string
}

async function publishScreen(request: PublishRequest) {
  // Call NEWWORK-specific publish endpoint on FORGE (Railway)
  const response = await fetch(`${PUBLISH_API_URL}/api/newwork/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repoId: REPO_ID,
      sessionId: request.sessionId,
      screenPath: request.screenPath,
      resourceUrl: request.resourceUrl,
      // Azure credentials - FORGE API has these in its environment variables
      azureStorageAccount: '', // FORGE will use its own env vars
      azureSasToken: '', // FORGE will use its own env vars
      azureContainerName: 'screens' // Standard container name
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to publish' }))
    throw new Error(error.message || 'Failed to publish')
  }

  const result = await response.json()
  return result // { success: true, message: string, resourceUrl: string, ... }
}

export const AIBuilder: React.FC<BusinessAppContextProps> = () => {
  // EXACT state from FORGE demo
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [thinkingContent, setThinkingContent] = useState('')
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
  const [screenPath, setScreenPath] = useState('')
  const [detectedScreenPath, setDetectedScreenPath] = useState<string | null>(null)
  const [resourceUrl, setResourceUrl] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toolIdCounter = useRef(0)

  // Generate or restore session ID from localStorage (persistent across refreshes)
  useEffect(() => {
    const stored = localStorage.getItem('ai-builder-session-id')
    if (stored) {
      console.log('Restored session ID:', stored)
      setSessionId(stored)
    } else {
      const sid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      console.log('Created new session ID:', sid)
      localStorage.setItem('ai-builder-session-id', sid)
      setSessionId(sid)
    }
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start a new session
  const startNewSession = () => {
    const sid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('ai-builder-session-id', sid)
    setSessionId(sid)
    setMessages([])
    setUniqueFileSummary(null)
    setUsage({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      lastCallCost: 0
    })
    console.log('Started new session:', sid)
  }

  // Check for changes
  const checkForChanges = async () => {
    if (!sessionId) {
      console.log('No sessionId yet, skipping change check')
      return
    }

    console.log('Fetching changes from FORGE...', { sessionId, repoId: REPO_ID })

    try {
      const data = await getChanges(REPO_ID, sessionId)
      console.log('Changes received:', data)

      // Calculate unique files summary (not counting duplicates)
      if (data.summary && data.summary.files) {
        const fileMap = new Map<string, { path: string; type: 'create' | 'modify' | 'delete' }>()

        // Process files in order - later changes override earlier ones
        data.summary.files.forEach((file: { path: string; type: string }) => {
          const normalizedType = file.type === 'create' ? 'create' : file.type === 'delete' ? 'delete' : 'modify'
          fileMap.set(file.path, { path: file.path, type: normalizedType })
        })

        const uniqueFiles = Array.from(fileMap.values())
        const created = uniqueFiles.filter(f => f.type === 'create').length
        const modified = uniqueFiles.filter(f => f.type === 'modify').length
        const deleted = uniqueFiles.filter(f => f.type === 'delete').length

        setUniqueFileSummary({
          totalUniqueFiles: uniqueFiles.length,
          created,
          modified,
          deleted,
          files: uniqueFiles
        })

        console.log('✨ Unique files summary:', { total: uniqueFiles.length, created, modified, deleted })
      }

      // Auto-detect screen path from created files
      // Support both /apps/ and /screens/ structures
      if (data.summary && data.summary.files) {
        console.log(
          '🔍 All files from API:',
          data.summary.files.map((f: any) => f.path)
        )

        const indexFiles = data.summary.files.filter((f: any) => {
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

        console.log(
          '🎯 Filtered index.ts files:',
          indexFiles.map((f: any) => f.path)
        )

        if (indexFiles.length > 0) {
          // Extract path like "platform/examples/apps/hello-world" from
          // "src/business-apps/platform/examples/apps/hello-world/index.ts"
          const match = indexFiles[0].path.match(/src\/business-apps\/(.+)\/index\.ts$/)
          if (match) {
            const detectedPath = match[1]
            setDetectedScreenPath(detectedPath)
            setScreenPath(detectedPath) // Auto-populate

            // Auto-generate resource URL from the last segment (screen name)
            const segments = detectedPath.split('/')
            const screenName = segments[segments.length - 1]
            const urlPath = '/' + screenName // e.g., "/hello-world"
            setResourceUrl(urlPath)

            console.log(`🎯 Auto-detected screen path: ${detectedPath}`)
            console.log(`🔗 Auto-generated resource URL: ${urlPath}`)
          }
        }
      }

      if (data.summary && data.summary.total > 0) {
        console.log(`✅ ${data.summary.total} files changed - Publish button should appear!`)
      }
    } catch (error) {
      console.error('Failed to get changes:', error)
    }
  }

  // Fix build issues by tracking corrected index.html
  const fixBuildIssues = async () => {
    try {
      // Corrected index.html content
      const correctedIndexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gravity Business App IDE</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
`

      // Track the fix in database
      const response = await fetch(`${API_URL}/api/newwork/track-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: REPO_ID,
          sessionId: sessionId,
          filePath: 'index.html',
          newContent: correctedIndexHtml,
          changeType: 'modify'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to track fix')
      }

      // Refresh changes
      await checkForChanges()
      alert('✅ Build issues fixed! The corrected index.html will be used when publishing.')
    } catch (error) {
      alert(`Failed to fix build issues: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle publish
  const handlePublish = async () => {
    if (!screenPath || !resourceUrl) {
      alert('Please enter both screen path and resource URL')
      return
    }

    setIsPublishing(true)
    try {
      // Get all changes from FORGE
      const data = await getChanges(REPO_ID, sessionId)
      const files = (data.changes || []).map((change: any) => ({
        path: change.filePath,
        content: change.newContent || '',
        changeType: change.changeType
      }))

      // Publish to platform
      const result = await publishScreen({
        files,
        screenPath,
        resourceUrl,
        sessionId
      })

      // Success! Store the full URL from API response
      // API returns resourceUrl like "/platform/employee-absences-accounts"
      const fullUrl = `https://newwork-dev.newwork.com${result.resourceUrl}`
      setPublishSuccess(fullUrl)
      setShowPublishDialog(false)
      setTimeout(() => setPublishSuccess(null), 10000)
    } catch (error) {
      console.error('Publish failed:', error)

      // Extract friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Check for common errors and provide friendly, actionable messages
      let friendlyMessage = errorMessage

      if (errorMessage.includes('is not exported by')) {
        // Extract the bad import
        const match = errorMessage.match(/"([^"]+)" is not exported by/)
        if (match) {
          const badImport = match[1]
          friendlyMessage = `❌ Import Error

The AI tried to import "${badImport}" but it doesn't exist.

✅ What to do:
Tell the AI: "The import ${badImport} doesn't exist. Please fix the imports and rebuild."

The AI will automatically correct it.`
        }
      } else if (errorMessage.includes('is not exported by') && errorMessage.includes('index.ts')) {
        // Missing default export in index.ts
        const match = errorMessage.match(/"([^"]+)" is not exported by "([^"]+index\.ts)"/)
        if (match) {
          friendlyMessage = `❌ Missing Default Export

The index.ts file is missing a default export.

✅ What to do:
Tell the AI: "The index.ts file needs to export the component as default. Please fix it."

Expected format:
export { default } from './ComponentName'
export { default as ComponentName } from './ComponentName'`
        }
      } else if (errorMessage.includes('Cannot find module')) {
        const match = errorMessage.match(/Cannot find module '([^']+)'/)
        const moduleName = match ? match[1] : 'unknown module'
        friendlyMessage = `❌ Module Not Found

Cannot find: ${moduleName}

✅ What to do:
Tell the AI: "Cannot find module ${moduleName}. Please use correct imports."

Common fixes:
- Use @newwork/nw-design-system for UI components
- Use @phosphor-icons/react for icons
- Use @/common/... for internal imports`
      } else if (errorMessage.includes('Build failed')) {
        friendlyMessage = `❌ Build Failed

The screen has compilation errors.

✅ What to do:
1. Copy the error details from the console
2. Tell the AI: "The build failed with these errors: [paste errors]"
3. The AI will fix them automatically`
      }

      alert(friendlyMessage)
    } finally {
      setIsPublishing(false)
    }
  }

  // EXACT handleSubmit from FORGE demo (line 333-778)
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

      // DEBUG: Log what we're sending
      console.log('=== AI BUILDER REQUEST ===')
      console.log('Query:', userInput)
      console.log('Total messages:', messages.length)
      console.log('Session ID:', sessionId)

      // 🚨 SMART COST OPTIMIZATION (Same as FORGE):
      // Keep: First message (context) + Last 6 messages (recent) + Important middle messages
      let optimizedHistory = messages
      if (messages.length > 6) {
        const firstMessage = messages[0]
        const recentMessages = messages.slice(-6)
        const middleMessages = messages.slice(1, -6)

        // Filter middle for important messages (code blocks, file mentions)
        const importantMiddle = middleMessages.filter(msg => {
          const content = msg.content.toLowerCase()
          return (
            msg.content.includes('```') || // Code blocks
            /\w+\.(tsx?|jsx?|css|md)/.test(msg.content) || // File mentions
            content.includes('error') ||
            content.includes('bug') ||
            content.includes('create') ||
            content.includes('fix')
          )
        })

        optimizedHistory = [firstMessage, ...importantMiddle, ...recentMessages]
      }

      console.log(
        'Optimized:',
        optimizedHistory.length,
        'messages (saved',
        messages.length - optimizedHistory.length,
        'messages)'
      )
      console.log('========================')

      // Compatibility shim: if no history yet, add a dummy assistant thinking header
      // This mirrors the state after FORGE streams the first thinking chunk,
      // ensuring Claude disables strict thinking validation for the first turn
      const history =
        messages.length === 0 ? [{ role: 'assistant' as const, content: 'Preparing...' }] : optimizedHistory

      // EXACT same as FORGE line 348 - pass messages state (before setState completes)
      const stream = await queryCode(REPO_ID, userInput, history, true, buildEnabled, sessionId, llmProvider)
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
                setUsage({
                  totalInputTokens: usageData.totalInputTokens || 0,
                  totalOutputTokens: usageData.totalOutputTokens || 0,
                  totalCost: usageData.totalCost || 0,
                  lastCallCost: usageData.callCost || 0
                })
                setMessages(prev => {
                  const newMessages = [...prev]
                  for (let i = newMessages.length - 1; i >= 0; i--) {
                    if (newMessages[i].role === 'assistant') {
                      newMessages[i] = {
                        ...newMessages[i],
                        cost: {
                          inputTokens: usageData.totalInputTokens || 0,
                          outputTokens: usageData.totalOutputTokens || 0,
                          totalCost: usageData.totalCost || 0
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
            } catch (e) {
              console.warn('Failed to parse chunk:', e)
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
          content: `Sorry, there was an error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ])
    } finally {
      setLoading(false)
      // Check for changes after AI completes (allow time for database writes)
      // Database writes can take 1-2 seconds, especially with multiple files
      setTimeout(() => {
        console.log('🔍 Checking for changes after AI response (2s delay)...')
        checkForChanges()
      }, 2000) // Increased from 500ms to 2000ms
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-screen gba:bg-background">
      {/* Success Banner */}
      {publishSuccess && (
        <div className="gba:bg-success-secondary gba:border-b gba:border-success">
          <div className="gba:container gba:mx-auto gba:px-6 gba:py-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                <CheckCircle className="gba:w-5 gba:h-5 gba:text-success" />
                <div>
                  <p className="gba:text-sm gba:font-medium gba:text-success-secondary-foreground">
                    Screen published successfully!
                  </p>
                  <a
                    href={publishSuccess}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:text-xs gba:text-success hover:gba:underline gba:flex gba:items-center gba:gap-1"
                  >
                    Open screen: {publishSuccess}
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

      {/* Header */}
      <div className="gba:border-b gba:bg-card">
        <div className="gba:container gba:mx-auto gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary gba:flex gba:items-center gba:justify-center">
                <Sparkles className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
              </div>
              <div>
                <h1 className="gba:text-xl gba:font-bold">NEWWORK AI Builder</h1>
                <p className="gba:text-xs gba:text-muted-foreground">
                  Build screens with natural language • Powered by Claude 4 Sonnet
                  {sessionId && (
                    <span className="gba:ml-2 gba:px-2 gba:py-0.5 gba:bg-muted gba:rounded gba:font-mono gba:text-[10px]">
                      {sessionId.split('-').pop()}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:gap-3">
              {usage.totalCost > 0 && (
                <div className="gba:text-xs gba:text-muted-foreground">
                  <span>{(usage.totalInputTokens / 1000).toFixed(1)}K in / </span>
                  <span>{(usage.totalOutputTokens / 1000).toFixed(1)}K out • </span>
                  <span className="gba:font-semibold gba:text-success">${usage.totalCost.toFixed(4)}</span>
                </div>
              )}

              {/* Manual refresh button for debugging */}
              <Button variant="outline" size="sm" onClick={checkForChanges} className="gba:text-xs">
                Check Files
              </Button>

              {/* New Session button */}
              <Button
                variant="outline"
                size="sm"
                onClick={startNewSession}
                className="gba:text-xs"
                title="Start a fresh session with new ID"
              >
                New Session
              </Button>

              {/* Refresh changes button */}
              <Button size="sm" variant="outline" onClick={checkForChanges} className="gba:gap-2">
                <Download className="gba:w-4 gba:h-4" />
                Refresh Files
              </Button>

              {/* Show publish button if we have changes */}
              {uniqueFileSummary && uniqueFileSummary.totalUniqueFiles > 0 && (
                <Button size="sm" onClick={() => setShowPublishDialog(true)} className="gba:gap-2">
                  <Upload className="gba:w-4 gba:h-4" />
                  Publish ({uniqueFileSummary.totalUniqueFiles}{' '}
                  {uniqueFileSummary.totalUniqueFiles === 1 ? 'file' : 'files'})
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Changes Banner */}
      {uniqueFileSummary && uniqueFileSummary.totalUniqueFiles > 0 && (
        <div className="gba:bg-gradient-to-r gba:from-primary/5 gba:to-accent/5 gba:backdrop-blur-sm gba:border-b gba:border-primary/10">
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
                      <h3 className="gba:font-semibold gba:text-foreground gba:text-sm">Ready to Publish</h3>
                      <span className="gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-xs gba:font-medium">
                        {uniqueFileSummary.totalUniqueFiles}{' '}
                        {uniqueFileSummary.totalUniqueFiles === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                      {uniqueFileSummary.created > 0 && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success" />
                          {uniqueFileSummary.created} created
                        </span>
                      )}
                      {uniqueFileSummary.modified > 0 && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-warning" />
                          {uniqueFileSummary.modified} modified
                        </span>
                      )}
                      {uniqueFileSummary.deleted > 0 && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-destructive" />
                          {uniqueFileSummary.deleted} deleted
                        </span>
                      )}
                    </div>
                    {/* File list */}
                    <details className="gba:mt-2 gba:text-xs">
                      <summary className="gba:cursor-pointer gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors">
                        View files
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
                            <span className="gba:font-mono gba:text-muted-foreground gba:truncate" title={file.path}>
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
                  onClick={() => setShowPublishDialog(true)}
                  className="gba:gap-2 gba:shadow-sm"
                >
                  <Upload className="gba:w-4 gba:h-4" />
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadPatch(REPO_ID, sessionId)}
                  className="gba:gap-2"
                >
                  <Download className="gba:w-4 gba:h-4" />
                  Patch
                </Button>
                <Button variant="outline" size="sm" onClick={fixBuildIssues} className="gba:gap-2">
                  <CheckCircle className="gba:w-4 gba:h-4" />
                  Fix
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
                <h2 className="gba:text-2xl gba:font-bold">Build Screens with AI</h2>
                <p className="gba:text-muted-foreground gba:mt-2">
                  Describe what you want to build and I'll create it following NEWWORK patterns
                </p>
              </div>
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-center">
                {['Create a lead list screen', 'Build a customer dashboard', 'Generate a contact form'].map((s, i) => (
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
            {thinking && thinkingContent && (
              <div className="gba:flex gba:gap-3">
                <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:flex gba:items-center gba:justify-center">
                  <Loader2 className="gba:w-4 gba:h-4 gba:text-primary-foreground gba:animate-spin" />
                </div>
                <div className="gba:flex-1 gba:bg-primary/10 gba:border gba:rounded-lg gba:px-3 gba:py-2">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                    <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-pulse" />
                    <span className="gba:text-xs gba:font-medium gba:text-primary">Claude is thinking...</span>
                  </div>
                  <p className="gba:text-xs gba:text-muted-foreground">{thinkingContent.slice(-150)}...</p>
                </div>
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
                      {message.thinkingLog && (
                        <div>
                          <button
                            className="gba:text-xs gba:text-primary hover:gba:underline"
                            onClick={() => {
                              setMessages(prev => {
                                const next = [...prev]
                                next[i].thinkingCollapsed = !next[i].thinkingCollapsed
                                return next
                              })
                            }}
                          >
                            {message.thinkingCollapsed ? 'Show thinking' : 'Hide thinking'}
                          </button>
                          {!message.thinkingCollapsed && (
                            <div className="gba:mt-1 gba:px-3 gba:py-2 gba:bg-muted gba:rounded gba:text-xs gba:text-muted-foreground gba:whitespace-pre-wrap">
                              {message.thinkingLog}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="gba:bg-card gba:border gba:rounded-lg gba:px-3 gba:py-2">
                        {message.cost && (
                          <div className="gba:flex gba:items-center gba:justify-between gba:mb-2 gba:pb-2 gba:border-b">
                            <span className="gba:text-xs gba:font-medium gba:text-primary">AI Response</span>
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
                            Tools ({message.toolCalls.length})
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
                                  displayText = tool.tool === 'write_file' ? '✍️ Writing' : '📖 Reading'
                                }
                              } else if (tool.tool === 'propose_change') {
                                const fileMatch = tool.args.match(/file_path:\s*"([^"]+)"/)
                                if (fileMatch) {
                                  filePath = fileMatch[1]
                                  displayText = '🔧 Editing'
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
                  <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                    <User className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  </div>
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
              placeholder="Describe the screen you want to build... (Press Enter to send, Shift+Enter for new line)"
              disabled={loading}
              rows={3}
              className="gba:resize-none gba:text-base gba:leading-relaxed gba:pr-24"
              data-testid="ai-builder-input"
            />
            <div className="gba:absolute gba:bottom-3 gba:right-3">
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                size="lg"
                className="gba:gap-2 gba:shadow-lg"
                data-testid="ai-builder-send-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="gba:w-5 gba:h-5 gba:animate-spin" />
                    Building...
                  </>
                ) : (
                  <>
                    <Send className="gba:w-5 gba:h-5" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
          {loading && (
            <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:justify-center gba:gap-2">
              <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              <span>AI is analyzing your request and exploring the codebase...</span>
            </div>
          )}
          {!loading && input.trim() && (
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
              💡 Tip: Be specific! Example: "Build a lead list screen with search, table, and pagination"
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
                  Publish to NEWWORK Platform
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
                  Files to Publish ({uniqueFileSummary?.totalUniqueFiles || 0})
                </h4>
                <div className="gba:bg-muted gba:rounded-lg gba:p-3 gba:space-y-2">
                  <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                    {uniqueFileSummary && uniqueFileSummary.created > 0 && (
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success" />
                        {uniqueFileSummary.created} created
                      </span>
                    )}
                    {uniqueFileSummary && uniqueFileSummary.modified > 0 && (
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-warning" />
                        {uniqueFileSummary.modified} modified
                      </span>
                    )}
                    {uniqueFileSummary && uniqueFileSummary.deleted > 0 && (
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-destructive" />
                        {uniqueFileSummary.deleted} deleted
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

              {/* Auto-Detected Screen Path */}
              {detectedScreenPath ? (
                <Alert className="gba:bg-success-secondary gba:border-success">
                  <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-success" />
                  <AlertDescription>
                    <div className="gba:text-sm gba:space-y-2">
                      <div>
                        <strong className="gba:text-success">✅ Ready to publish!</strong>
                        <p className="gba:text-xs gba:mt-1 gba:text-muted-foreground">
                          Everything is configured automatically. Just click "Publish Screen" below!
                        </p>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                        <span className="gba:text-muted-foreground">Screen path:</span>
                        <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">{detectedScreenPath}</code>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                        <span className="gba:text-muted-foreground">Resource URL:</span>
                        <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">{resourceUrl}</code>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="gba:w-4 gba:h-4" />
                  <AlertDescription className="gba:text-sm">
                    <strong>Waiting for files...</strong>
                    <p className="gba:text-xs gba:mt-1">
                      Ask the AI to create a screen and paths will be detected automatically.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Manual inputs - only show if auto-detection failed */}
              {!detectedScreenPath && (
                <>
                  {/* Screen Path */}
                  <div className="gba:space-y-2">
                    <Label htmlFor="screen-path">Screen Path *</Label>
                    <Input
                      id="screen-path"
                      value={screenPath}
                      onChange={e => setScreenPath(e.target.value)}
                      placeholder="platform/examples/apps/my-screen"
                    />
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Format: module/sub-module/apps/screen-name (e.g., crm/customers/apps/lead-list)
                    </p>
                  </div>

                  {/* Resource URL */}
                  <div className="gba:space-y-2">
                    <Label htmlFor="resource-url">Resource URL *</Label>
                    <Input
                      id="resource-url"
                      value={resourceUrl}
                      onChange={e => setResourceUrl(e.target.value)}
                      placeholder="/my-screen"
                    />
                    <p className="gba:text-xs gba:text-muted-foreground">
                      The URL path where the screen will be accessible (e.g., /lead-list)
                    </p>
                  </div>
                </>
              )}

              {/* Info */}
              <Alert>
                <AlertCircle className="gba:w-4 gba:h-4" />
                <AlertDescription className="gba:text-xs">
                  This will build the screen, upload to Azure, and automatically register it in the platform with the
                  resource URL.
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t">
                <Button variant="outline" onClick={() => setShowPublishDialog(false)} disabled={isPublishing}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || !screenPath || !resourceUrl}
                  className="gba:gap-2"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="gba:w-4 gba:h-4" />
                      Publish Screen
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
