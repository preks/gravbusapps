import React, { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useFlowBot, type WebSearchMode } from './hooks/useFlowBot'
import { useVoiceInput } from './hooks/useVoiceInput'
import { useVoiceInputHybrid } from './hooks/useVoiceInputHybrid'
import { useVoiceSynthesis } from './hooks/useVoiceSynthesis'
import { useAudioMode } from './hooks/useAudioMode'
import { ChatInput } from './components/ChatInput'
import { FormSubmissionProvider } from './components/FormSubmissionContext'
import { ConversationRenderer } from './components/ConversationRenderer'
import { AgentPlanPanel } from './components/AgentPlanPanel'
import { selectLatestAgentPlan } from './components/agentPlanUtils'
import { useCurrentUserPicture } from './hooks/useCurrentUserPicture'
import { ChatHistory } from './components/ChatHistory'
import type { OutputItem, AnswerOutput, NavigationData, DisplayData } from './types/models'
import { VoiceFormProvider, useVoiceForm } from './context/VoiceFormContext'
import { FlowProposalFileUploadProvider } from './context/FlowProposalFileUploadContext'
import { HeroSection, DeepBlueNeuralBackground } from './components/HeroSection'
import { ChatsCircle } from '@phosphor-icons/react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { UserPreferencesProvider, useUserPreferencesContext } from './context/UserPreferencesContext'
import { UserPreferences } from './components/UserPreferences'
import { printSessionAsPdf } from './utils/printSession'
import { StreamBootstrapProvider } from './streaming/StreamBootstrapProvider'

export interface EveryAIProps extends BusinessAppContextProps {
  className?: string
  isActive?: boolean
  /** When true (e.g. in sidebar), show fewer suggestions so they fit in one row */
  compactSuggestions?: boolean
}

/**
 * EveryAI - Premium AI Assistant with Voice Mode
 * The most advanced AI-powered assistant for NEWWORK ERP
 * Now with full voice conversation support including voice-driven form interactions!
 */
export const EveryAI: React.FC<EveryAIProps> = props => {
  return (
    <UserPreferencesProvider accessToken={props.accessToken}>
      <VoiceFormProvider>
        {/* StreamBootstrapProvider is idempotent: on mount it calls
            flowbotStreamManager.bootstrap(accessToken) once per session
            so any background runs from a prior tab/refresh are picked
            up immediately, before useFlowBot's per-session attach runs. */}
        <StreamBootstrapProvider accessToken={props.accessToken}>
          <EveryAIInner {...props} />
        </StreamBootstrapProvider>
      </VoiceFormProvider>
    </UserPreferencesProvider>
  )
}

/** Minimum EveryAI container width before the plan moves to a right column. */
const DESKTOP_PLAN_LAYOUT_MIN_WIDTH_PX = 1024

const HANDS_FREE_HEAVY_DISPLAY_TYPES: Set<DisplayData['type']> = new Set([
  'table',
  'scatter',
  'bar',
  'lineChart',
  'areaChart',
  'stackedBarChart',
  'pieChart',
  'heatmap',
  'gantt',
  'treemap',
  'kanbanBoard',
  'crmFunnel',
  'workflowAnalytics',
  'assetSummary',
  'teamAvailability'
])

/**
 * Inner component that uses the VoiceFormContext
 */
const EveryAIInner: React.FC<EveryAIProps> = props => {
  const { accessToken, className, userInfo, isActive = true, compactSuggestions = false, additionalData } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSpeechMode, setIsSpeechMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isDesktopPlanLayout, setIsDesktopPlanLayout] = useState(false)
  const isSpeechModeRef = useRef(false) // Ref for use in callbacks
  const lastSpokenTurnIndexRef = useRef<number>(-1)
  const lastNavigatedTurnIndexRef = useRef<number>(-1)
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Audio sovereignty detection (server vs browser TTS/STT)
  const { mode: audioMode, markSovereigntyBlocked, markServerAvailable } = useAudioMode()
  const [sovereigntyToast, setSovereigntyToast] = useState(false)
  const sovereigntyToastShownRef = useRef(false)

  // Voice form context for form interactions in voice mode
  const voiceForm = useVoiceForm()

  // User preferences context for personalization
  const userPreferences = useUserPreferencesContext()

  const {
    conversation,
    isLoading,
    isGenerating,
    sendMessage,
    editMessage,
    clearConversation,
    nextStepProposals,
    isPrechatLoading,
    sessionId,
    attachFiles,
    attachFilesForFlowProposalField,
    cancelGeneration,
    cancelledMessageText,
    clearCancelledMessage,
    loadSession,
    loadMoreHistory,
    hasMoreHistory,
    isLoadingMoreHistory,
    pageSkillsEnabled,
    togglePageSkills,
    activePageSkills
  } = useFlowBot(accessToken, { isActive })

  // Fetch current user's picture
  const { pictureThumbnail } = useCurrentUserPicture(userInfo?.employeeDetails?.employeeId, accessToken)

  // Handle sending voice transcript (defined before voiceInput hook)
  const handleVoiceSendRef = useRef<(text: string) => void>(() => {})
  const clearVoiceTranscriptRef = useRef<() => void>(() => {})

  const voiceEndHandler = useCallback((finalTranscript: string) => {
    const normalizedTranscript = finalTranscript.trim()
    if (!normalizedTranscript) {
      return
    }

    if (!isSpeechModeRef.current) {
      clearVoiceTranscriptRef.current()
      return
    }

    handleVoiceSendRef.current(normalizedTranscript)
  }, [])

  // Hybrid STT hook (browser STT for interim + Flowbot POST for final transcription)
  const voiceInputHybrid = useVoiceInputHybrid({
    accessToken,
    language: 'en-US',
    silenceDelay: 1500,
    enabled: audioMode.stt === 'server',
    onEnd: voiceEndHandler,
    onSovereigntyBlocked: () => {
      markSovereigntyBlocked('stt')
      if (!sovereigntyToastShownRef.current) {
        sovereigntyToastShownRef.current = true
        setSovereigntyToast(true)
        setTimeout(() => setSovereigntyToast(false), 5000)
      }
      setTimeout(() => {
        if (isSpeechModeRef.current) {
          voiceInputBrowser.startListening()
        }
      }, 200)
    }
  })

  // Browser STT hook (Web Speech API fallback)
  const voiceInputBrowser = useVoiceInput({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    silenceDelay: 1000,
    onEnd: voiceEndHandler
  })

  // Route to hybrid or browser STT based on sovereignty state
  const voiceInput = audioMode.stt === 'server' ? voiceInputHybrid : voiceInputBrowser
  const voiceInputRef = useRef(voiceInput)
  useEffect(() => {
    voiceInputRef.current = voiceInput
  })

  useEffect(() => {
    clearVoiceTranscriptRef.current = () => {
      voiceInputHybrid.resetTranscript()
      voiceInputBrowser.resetTranscript()
    }
  }, [voiceInputHybrid.resetTranscript, voiceInputBrowser.resetTranscript])

  // Track when AI stopped speaking to ignore echo
  const aiStoppedSpeakingAtRef = useRef<number>(0)
  // Track which form summary we've already spoken (prevent loops)
  const spokenFormSummaryRef = useRef<string | null>(null)

  // Voice synthesis hook with auto-restart listening on end
  const voiceSynthesis = useVoiceSynthesis({
    voice: 'nova',
    speed: 1.0,
    accessToken,
    forceBrowserTTS: audioMode.tts === 'browser',
    onStart: () => {
      voiceInputRef.current.cancelListening()
    },
    onEnd: () => {
      aiStoppedSpeakingAtRef.current = Date.now()
      if (isSpeechModeRef.current) {
        voiceInputRef.current.startListening()
      }
    },
    onError: () => {
      if (isSpeechModeRef.current) {
        voiceInputRef.current.startListening()
      }
    },
    onSovereigntyBlocked: () => {
      markSovereigntyBlocked('tts')
      if (!sovereigntyToastShownRef.current) {
        sovereigntyToastShownRef.current = true
        setSovereigntyToast(true)
        setTimeout(() => setSovereigntyToast(false), 5000)
      }
    }
  })

  // Stop AI speech when user starts talking (detected by interim transcript or volume)
  useEffect(() => {
    if (isSpeechMode && voiceSynthesis.isSpeaking) {
      if (voiceInput.interimTranscript || voiceInput.volume > 0.15) {
        voiceSynthesis.stop()
      }
    }
  }, [isSpeechMode, voiceSynthesis, voiceInput.interimTranscript, voiceInput.volume])

  // Safety net: restart listening when hands-free mode is idle
  // (not listening, not speaking, not loading) to recover from missed restart
  useEffect(() => {
    if (!isSpeechMode) return
    if (voiceInput.isListening || voiceSynthesis.isSpeaking || voiceSynthesis.isLoading || isLoading) return

    const restartTimer = setTimeout(() => {
      if (isSpeechModeRef.current && !voiceSynthesis.isSpeaking && !voiceSynthesis.isLoading) {
        voiceInputRef.current.startListening()
      }
    }, 1200)

    return () => clearTimeout(restartTimer)
  }, [isSpeechMode, voiceInput.isListening, voiceSynthesis.isSpeaking, voiceSynthesis.isLoading, isLoading])

  // Toggle speech mode
  const toggleSpeechMode = useCallback(() => {
    if (isSpeechMode) {
      isSpeechModeRef.current = false // Set ref FIRST to prevent any queued operations
      setIsSpeechMode(false)
      voiceInputRef.current.cancelListening()
      voiceSynthesis.stop()
      // Force stop again after a small delay in case streaming is in progress
      setTimeout(() => {
        voiceSynthesis.stop()
      }, 100)
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current)
        navigateTimeoutRef.current = null
      }
      voiceForm.setIsVoiceMode(false)
      voiceForm.clearPendingFormSummary()
      voiceForm.setActiveForm(null) // Clear any active form registration
    } else {
      // Re-enable server STT + TTS on manual hands-free start.
      // If server is actually blocked, hooks will switch back to browser mode.
      markServerAvailable('stt')
      markServerAvailable('tts')
      setIsSpeechMode(true)
      isSpeechModeRef.current = true
      lastSpokenTurnIndexRef.current = conversation.length - 1
      voiceForm.setIsVoiceMode(true)
      setTimeout(() => {
        if (isSpeechModeRef.current) {
          voiceInputRef.current.startListening()
        }
      }, 200)
    }
  }, [isSpeechMode, voiceSynthesis, conversation.length, voiceForm, markServerAvailable])

  // Speak pending form summaries when a form appears in voice mode
  useEffect(() => {
    // Skip if no pending summary or not in speech mode
    if (!voiceForm.pendingFormSummary || !isSpeechModeRef.current || !isSpeechMode) {
      return
    }

    if (voiceSynthesis.isSpeaking || voiceSynthesis.isLoading) {
      return
    }

    if (spokenFormSummaryRef.current === voiceForm.pendingFormSummary) {
      voiceForm.clearPendingFormSummary()
      return
    }

    spokenFormSummaryRef.current = voiceForm.pendingFormSummary
    voiceSynthesis.speak(voiceForm.pendingFormSummary)
    voiceForm.clearPendingFormSummary()
  }, [voiceForm.pendingFormSummary, isSpeechMode, voiceSynthesis, voiceForm])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSpeechMode) {
        toggleSpeechMode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSpeechMode, toggleSpeechMode])

  // Auto-speak new AI responses in speech mode - trigger as soon as answer appears
  useEffect(() => {
    if (!isSpeechMode || !isSpeechModeRef.current) {
      return
    }

    if (voiceSynthesis.isSpeaking || voiceSynthesis.isLoading) {
      return
    }

    if (voiceForm.activeForm) {
      lastSpokenTurnIndexRef.current = conversation.length - 1
      return
    }

    // Find the latest agent turn with an answer.
    //
    // IMPORTANT: We deliberately skip the in-progress streaming bubble
    // (`__streaming === true`). During streaming, `applyTextDelta` accumulates
    // the model's raw output tokens into a synthetic `textBlock`. For models
    // that emit structured JSON (e.g. `{"payload": {"text": "..."}}`), those
    // raw tokens are NOT the final user-facing text — the backend reshapes
    // them into a canonical `answer`/`textBlock` only after the full response
    // arrives (see `commitFinalAnswer`). Speaking the streaming bubble would
    // therefore feed raw JSON fragments to TTS. Wait for the canonical answer.
    for (let i = conversation.length - 1; i > lastSpokenTurnIndexRef.current; i--) {
      const turn = conversation[i]
      if (turn.side === 'agent') {
        const hasFlowProposal = turn.outputs?.some((o: OutputItem) => o.type === 'flow_proposal')
        if (hasFlowProposal) {
          lastSpokenTurnIndexRef.current = i
          continue
        }

        const answerOutput = turn.outputs?.find(
          (o: OutputItem): o is AnswerOutput =>
            o.type === 'answer' && (o as AnswerOutput & { __streaming?: boolean }).__streaming !== true
        )
        if (answerOutput?.displayData) {
          const textParts: string[] = []
          for (const data of answerOutput.displayData) {
            if (data.type === 'textBlock' && data.text) {
              const cleanText = data.text
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/#{1,6}\s/g, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/`[^`]+`/g, '')
                .trim()
              if (cleanText) {
                textParts.push(cleanText)
              }
            }
          }

          if (textParts.length > 0 && isSpeechModeRef.current) {
            const textToSpeak = textParts.join('. ')
            let truncatedText = textToSpeak
            if (textToSpeak.length > 500) {
              const sentenceEnd = textToSpeak.substring(0, 500).lastIndexOf('. ')
              truncatedText =
                sentenceEnd > 100 ? textToSpeak.substring(0, sentenceEnd + 1) : textToSpeak.substring(0, 500)
            }
            voiceSynthesis.speak(truncatedText)
            lastSpokenTurnIndexRef.current = i
            break // Only speak one response at a time
          }
        }
      }
    }
  }, [conversation, isSpeechMode, voiceSynthesis.isSpeaking, voiceSynthesis.isLoading, voiceForm.activeForm])

  // Auto-navigate in speech mode when AI returns a navigation action
  useEffect(() => {
    if (!isSpeechMode || !isSpeechModeRef.current) return

    for (let i = conversation.length - 1; i > lastNavigatedTurnIndexRef.current; i--) {
      const turn = conversation[i]

      if (turn.side === 'agent') {
        const answerOutput = turn.outputs?.find((o: OutputItem): o is AnswerOutput => o.type === 'answer')

        if (answerOutput?.displayData) {
          const navigationData = answerOutput.displayData.find(
            (data): data is NavigationData => data.type === 'navigation'
          )

          if (navigationData?.url) {
            lastNavigatedTurnIndexRef.current = i

            if (navigateTimeoutRef.current) {
              clearTimeout(navigateTimeoutRef.current)
            }
            navigateTimeoutRef.current = setTimeout(() => {
              navigateTimeoutRef.current = null
              if (isSpeechModeRef.current) {
                navigateTo(navigationData.url)
              }
            }, 1500)
            break
          }
        }
      }
    }

    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current)
        navigateTimeoutRef.current = null
      }
    }
  }, [conversation, isSpeechMode])

  // Reset spoken/navigated indices when session changes to prevent desync
  useEffect(() => {
    lastSpokenTurnIndexRef.current = -1
    lastNavigatedTurnIndexRef.current = -1
  }, [sessionId])

  // Handle sending voice transcript with form command detection
  const handleVoiceSend = useCallback(
    (text: string) => {
      if (text && typeof text === 'string' && text.trim()) {
        const cleanText = text.trim()
        if (cleanText.length < 2) {
          voiceInput.resetTranscript()
          return
        }

        const timeSinceAIStopped = Date.now() - aiStoppedSpeakingAtRef.current
        if (timeSinceAIStopped < 800) {
          voiceInput.resetTranscript()
          return
        }

        // Stop AI speech immediately when user speaks
        voiceSynthesis.stop()

        if (voiceForm.activeForm) {
          const command = voiceForm.parseVoiceCommand(cleanText)

          if (command.type === 'confirm') {
            const submitHandler = voiceForm.activeForm.submitHandler
            voiceForm.setActiveForm(null)
            voiceForm.clearPendingFormSummary()
            if (!isSpeechModeRef.current) {
              voiceSynthesis.speak('Submitting the form now.')
            }
            submitHandler()
            voiceInput.resetTranscript()
            return
          }

          if (command.type === 'cancel') {
            const cancelHandler = voiceForm.activeForm.cancelHandler
            voiceForm.setActiveForm(null)
            voiceForm.clearPendingFormSummary()
            voiceSynthesis.speak('Cancelling the form.')
            cancelHandler()
            voiceInput.resetTranscript()
            return
          }

          if (command.type === 'modify') {
            voiceForm.activeForm.updateField(command.field, command.value)
            voiceSynthesis.speak(`Updated ${command.field} to ${command.value}. Say "submit" when ready.`)
            voiceInput.resetTranscript()
            return
          }

          // Unknown command with active form
          if (command.type === 'unknown') {
            const lowerText = cleanText.toLowerCase()
            // Check if it's clearly a new request
            const isNewRequest =
              lowerText.includes('?') ||
              lowerText.startsWith('what') ||
              lowerText.startsWith('how') ||
              lowerText.startsWith('who') ||
              lowerText.startsWith('when') ||
              lowerText.startsWith('where') ||
              lowerText.startsWith('can you') ||
              lowerText.startsWith('please') ||
              lowerText.startsWith('i want') ||
              lowerText.startsWith('i need') ||
              lowerText.startsWith('show me') ||
              lowerText.startsWith('find') ||
              lowerText.startsWith('create') ||
              lowerText.startsWith('make')

            if (isNewRequest) {
              // Treat as a new request - send to chat
              // Exit form mode so TTS is allowed to speak the response
              voiceForm.setActiveForm(null)
              voiceForm.clearPendingFormSummary()
              sendMessage(cleanText, [], false, 'off', undefined, undefined, undefined, true)
              voiceInput.resetTranscript()
              return
            }

            voiceInput.resetTranscript()
            return
          }
        }

        // No active form - send as regular chat message
        sendMessage(cleanText, [], false, 'off', undefined, undefined, undefined, true)
        voiceInput.resetTranscript()
      }
    },
    [sendMessage, voiceInput, voiceSynthesis, voiceForm]
  )

  // Update ref for use in useVoiceInput callback
  useEffect(() => {
    handleVoiceSendRef.current = handleVoiceSend
  }, [handleVoiceSend])

  const extendedConversation = useMemo(() => {
    // Don't add loading if conversation already has it
    const lastTurn = conversation[conversation.length - 1]
    const hasLoadingOutput = lastTurn?.side === 'agent' && lastTurn.outputs?.some(o => o.type === 'loading')

    if (isGenerating && !hasLoadingOutput) {
      return [...conversation, { side: 'agent' as const, outputs: [{ type: 'loading' as const }] }]
    }
    return conversation
  }, [conversation, isGenerating])

  const renderConversation = useMemo(() => {
    if (!isSpeechMode) {
      return extendedConversation
    }

    return extendedConversation.map(turn => {
      if (turn.side !== 'agent') {
        return turn
      }

      const normalizedOutputs = turn.outputs?.map(output => {
        if (output.type !== 'answer') {
          return output
        }

        const safeDisplayData = output.displayData.filter(item => !HANDS_FREE_HEAVY_DISPLAY_TYPES.has(item.type))
        if (safeDisplayData.length > 0) {
          return {
            ...output,
            displayData: safeDisplayData
          }
        }

        const fallbackDisplayData: DisplayData[] = [
          { type: 'textBlock', text: 'Done. I can continue with your next voice instruction.' }
        ]

        return {
          ...output,
          displayData: fallbackDisplayData
        }
      })

      return {
        ...turn,
        outputs: normalizedOutputs ?? turn.outputs
      }
    })
  }, [extendedConversation, isSpeechMode])

  // When the user loads older messages via "Load more", we need to keep the
  // viewport anchored at the same visual position instead of letting the
  // usual auto-scroll-to-bottom effect jump them back down. We capture the
  // distance-from-bottom before prepending and restore it in a layout effect
  // (pre-paint) so there is no visible flash of content jumping.
  const preservedDistanceFromBottomRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    if (preservedDistanceFromBottomRef.current !== null) {
      const distanceFromBottom = preservedDistanceFromBottomRef.current
      preservedDistanceFromBottomRef.current = null
      el.scrollTop = Math.max(0, el.scrollHeight - distanceFromBottom)
      return
    }

    el.scrollTop = el.scrollHeight
  }, [extendedConversation.length])

  const handleLoadMoreHistory = useCallback(async () => {
    const el = scrollRef.current
    if (el) {
      preservedDistanceFromBottomRef.current = el.scrollHeight - el.scrollTop
    }
    const prependedCount = await loadMoreHistory()
    if (prependedCount === 0) {
      preservedDistanceFromBottomRef.current = null
    }
  }, [loadMoreHistory])

  // Track if we've already processed a prompt from sessionStorage to avoid duplicates
  const promptProcessedRef = useRef<string | null>(null)
  const lastInitialPayloadAtRef = useRef<number>(0)
  const pendingInitialPromptRef = useRef<{
    prompt: string
    additionInfo?: string
    skills?: string[]
    requiresNewSession: boolean
  } | null>(null)

  const clearStoredInitialPrompt = useCallback(() => {
    window.__everyAIInitialPayload = undefined
    sessionStorage.removeItem('everyAIInitialPrompt')
    sessionStorage.removeItem('everyAIInitialAdditionInfo')
    sessionStorage.removeItem('everyAIInitialSkills')
    sessionStorage.removeItem('everyAINewSession')
  }, [])

  const readInitialPromptPayload = useCallback(() => {
    const memoryPayload = window.__everyAIInitialPayload
    const prompt = memoryPayload?.prompt ?? sessionStorage.getItem('everyAIInitialPrompt')
    if (!prompt) {
      return null
    }

    const payloadCreatedAt = memoryPayload?.createdAt ?? Date.now()
    if (payloadCreatedAt <= lastInitialPayloadAtRef.current) {
      return null
    }

    const additionInfo =
      memoryPayload?.additionInfo ?? sessionStorage.getItem('everyAIInitialAdditionInfo') ?? undefined
    const skills =
      memoryPayload?.skills ??
      (() => {
        try {
          const rawSkills = sessionStorage.getItem('everyAIInitialSkills')
          if (!rawSkills) return undefined
          const parsedSkills = JSON.parse(rawSkills)
          return Array.isArray(parsedSkills) ? parsedSkills : undefined
        } catch {
          return undefined
        }
      })()
    const requiresNewSession =
      memoryPayload?.newSession === true || sessionStorage.getItem('everyAINewSession') === 'true'

    return {
      prompt,
      additionInfo: additionInfo ?? undefined,
      skills,
      requiresNewSession,
      payloadCreatedAt
    }
  }, [])

  const flushPendingInitialPrompt = useCallback(() => {
    if (isLoading || conversation.length > 0) {
      return
    }

    const pending = pendingInitialPromptRef.current
    if (!pending || pending.prompt === promptProcessedRef.current) {
      return
    }

    pendingInitialPromptRef.current = null
    promptProcessedRef.current = pending.prompt
    clearStoredInitialPrompt()

    setTimeout(() => {
      sendMessage(pending.prompt, [], false, 'off', pending.additionInfo, pending.skills, undefined, false)
    }, 100)
  }, [clearStoredInitialPrompt, conversation.length, isLoading, sendMessage])

  const ingestOpenEveryAIPayload = useCallback(() => {
    try {
      const payload = readInitialPromptPayload()
      if (!payload) {
        return false
      }

      lastInitialPayloadAtRef.current = payload.payloadCreatedAt
      pendingInitialPromptRef.current = {
        prompt: payload.prompt,
        additionInfo: payload.additionInfo,
        skills: payload.skills,
        requiresNewSession: payload.requiresNewSession
      }
      promptProcessedRef.current = null

      if (payload.requiresNewSession) {
        clearConversation()
        return true
      }

      flushPendingInitialPrompt()
      return true
    } catch (error) {
      console.warn('[EveryAI] Failed to ingest initial prompt payload:', error)
      return false
    }
  }, [clearConversation, flushPendingInitialPrompt, readInitialPromptPayload])

  useEffect(() => {
    if (!isLoading && conversation.length === 0) {
      flushPendingInitialPrompt()
    }
  }, [conversation.length, flushPendingInitialPrompt, isLoading])

  useEffect(() => {
    const handleOpenEveryAIRequest = () => {
      ingestOpenEveryAIPayload()
    }

    const handleNewSessionRequest = () => {
      promptProcessedRef.current = null
      clearConversation()
    }

    const handleMessageEvent = (event: Event) => {
      const messageEvent = event as MessageEvent
      if (messageEvent.data?.type === 'OPEN_EVERY_AI') {
        handleOpenEveryAIRequest()
      }
    }

    window.addEventListener('openEveryAI', handleOpenEveryAIRequest)
    window.addEventListener('everyAISidebarOpened', handleOpenEveryAIRequest)
    window.addEventListener('everyAIStartNewSession', handleNewSessionRequest)
    window.addEventListener('message', handleMessageEvent)

    if (!isLoading && conversation.length === 0) {
      ingestOpenEveryAIPayload()
    }

    return () => {
      window.removeEventListener('openEveryAI', handleOpenEveryAIRequest)
      window.removeEventListener('everyAISidebarOpened', handleOpenEveryAIRequest)
      window.removeEventListener('everyAIStartNewSession', handleNewSessionRequest)
      window.removeEventListener('message', handleMessageEvent)
    }
  }, [clearConversation, conversation.length, ingestOpenEveryAIPayload, isLoading])

  useEffect(() => {
    const handleNativeSpeechToText = (event: Event) => {
      const customEvent = event as CustomEvent<{ text?: string; isFinal?: boolean } | string>
      const detail = customEvent.detail
      const text = typeof detail === 'string' ? detail : detail?.text
      const isFinal = typeof detail === 'string' ? true : detail?.isFinal !== false
      if (!text || typeof text !== 'string') {
        return
      }
      const normalizedText = text.trim()
      if (!normalizedText || !isFinal) {
        return
      }
      // Route through handleVoiceSend for echo filtering and form command detection
      handleVoiceSendRef.current(normalizedText)
    }

    window.addEventListener('com.newwork.nativeSpeechToText', handleNativeSpeechToText)
    return () => {
      window.removeEventListener('com.newwork.nativeSpeechToText', handleNativeSpeechToText)
    }
  }, [])

  // Plan layout must follow the EveryAI container width (e.g. the global
  // sidepanel column), not the main window viewport — otherwise a wide
  // desktop viewport would mount the right plan rail inside a ~450px panel.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    const applyLayoutMode = () => {
      setIsDesktopPlanLayout(container.offsetWidth >= DESKTOP_PLAN_LAYOUT_MIN_WIDTH_PX)
    }

    applyLayoutMode()
    const resizeObserver = new ResizeObserver(applyLayoutMode)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  const handleSessionSelect = useCallback(
    async (sessionIdToLoad: string) => {
      // Persistence is handled inside ``loadSession`` (which calls
      // ``saveState`` with the authenticated user's ``sub``). The previous
      // direct ``localStorage.setItem`` here wrote a payload without
      // ``realm`` / ``sub``, which short-circuited the user-binding
      // check on next mount and let a different user inherit this
      // pointer — see useFlowBot's ``getInitialSessionId``.
      setShowHistory(false)
      await loadSession(sessionIdToLoad)
    },
    [loadSession]
  )

  const handleNewChat = useCallback(() => {
    clearConversation()
    setShowHistory(false)
    window.dispatchEvent(new CustomEvent('chat-history-refresh'))
  }, [clearConversation])

  const handlePrintSession = useCallback(() => {
    // Close the preferences modal first so its fixed overlay isn't part
    // of the printed layout, then defer to the next frame so React has
    // unmounted it before window.print() takes a snapshot.
    userPreferences.closeModal()
    requestAnimationFrame(() => {
      printSessionAsPdf({
        element: scrollRef.current,
        sessionId,
        userDisplayName: userInfo?.employeeDetails?.displayName
      })
    })
  }, [sessionId, userInfo, userPreferences])

  const handleSend = (
    text: string,
    files: File[],
    isThinking: boolean,
    webSearchMode: WebSearchMode,
    mentions?: Array<{ id: string; type: string; display: string }>
  ) => {
    sendMessage(text, files, isThinking, webSearchMode, undefined, undefined, mentions)
  }

  const handleConversationSend = useCallback(
    (userInputText: string, files: File[], isThinking: boolean = false, webSearchMode: WebSearchMode = 'off') => {
      return sendMessage(
        userInputText,
        files,
        isThinking,
        webSearchMode,
        undefined,
        undefined,
        undefined,
        isSpeechModeRef.current
      )
    },
    [sendMessage]
  )

  const isEmptyState = conversation.length === 0 && !isLoading

  // Single, conversation-wide plan panel pinned to the right of the chat.
  // Scans the whole conversation so the panel persists across follow-up
  // turns that don't re-emit a plan event.
  const latestAgentPlan = useMemo(() => selectLatestAgentPlan(extendedConversation), [extendedConversation])

  // Mobile webview fix: the webview viewport can be wider than the device
  // screen (e.g. 671px vs 430px), causing content to be clipped on the right.
  // Constrain this component to the screen width when a mismatch is detected.
  //
  // IMPORTANT: gate this behind the explicit `__mobile` flag (set by
  // MobileWebviewsClient). On desktop, browser zoom-out (Cmd+-) inflates
  // `window.innerWidth` while `screen.width` stays constant, so the ratio
  // check would falsely fire on a re-mount (e.g. closing + reopening the
  // global sidepanel) and pin the component to `screen.width` (~1440px)
  // inside a ~450px sidebar, clipping the chat off-screen.
  const isEmbeddedMobile = additionalData?.__mobile === true
  const [webviewMaxWidth, setWebviewMaxWidth] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (!isEmbeddedMobile) return
    if (typeof screen !== 'undefined' && window.innerWidth > screen.width * 1.1) {
      setWebviewMaxWidth(screen.width)
    }
  }, [isEmbeddedMobile])

  return (
    <div
      ref={containerRef}
      className={`gba:h-full gba:flex gba:flex-col gba:relative gba:overflow-hidden ${className || ''}`}
      style={
        {
          backgroundColor: isEmptyState ? 'var(--nw-ai-hero-background)' : 'var(--nw-background)',
          '--nw-ai': 'var(--nw-decorative)',
          '--nw-ai-secondary': 'var(--nw-decorative-secondary)',
          ...(webviewMaxWidth ? { maxWidth: webviewMaxWidth, width: webviewMaxWidth } : {})
        } as React.CSSProperties
      }
      data-testid="every-ai-app"
    >
      {/* Full-page animated background for empty state */}
      {isEmptyState && (
        <div className="gba:absolute gba:inset-0 gba:z-0">
          <DeepBlueNeuralBackground />
        </div>
      )}

      {/* History toggle button - visible when panel is closed */}
      {!showHistory && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHistory(true)}
          className="gba:absolute gba:top-4 gba:left-4 gba:z-20 gba:h-10 gba:w-10 gba:rounded-full gba:bg-background/80 gba:backdrop-blur-sm gba:shadow-md hover:gba:bg-muted gba:border gba:border-border/50"
          aria-label="Open chat history"
          title="Chat history"
          data-testid="every-ai-open-history"
        >
          <ChatsCircle className="gba:w-5 gba:h-5" weight="fill" />
        </Button>
      )}

      {/* History Sidebar */}
      <div
        className={`
          gba:absolute gba:inset-y-0 gba:left-0 gba:z-30 gba:transform gba:transition-transform gba:duration-300
          gba:w-80 gba:bg-white gba:shadow-lg gba:border-r gba:border-gray-200
          ${showHistory ? 'gba:translate-x-0' : 'gba:-translate-x-full'}
        `}
      >
        <ChatHistory
          accessToken={accessToken}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
          currentSessionId={sessionId}
        />
      </div>

      <FormSubmissionProvider>
        <FlowProposalFileUploadProvider upload={attachFilesForFlowProposalField}>
          {/* Conversation + side panel band */}
          <div className="gba:flex-1 gba:flex gba:overflow-hidden gba:relative gba:z-10 gba:min-h-0">
            {/* Conversation Area with subtle gradient */}
            <div
              ref={scrollRef}
              className="gba:flex-1 gba:overflow-y-auto gba:flex gba:flex-col gba:min-w-0"
              data-testid="conversation-area"
            >
              {conversation.length === 0 && !isLoading ? (
                <div className="gba:flex-1 gba:flex gba:flex-col gba:relative gba:min-h-0">
                  <HeroSection data-testid="every-ai-hero" />
                </div>
              ) : (
                <div className="gba:p-6">
                  {hasMoreHistory && (
                    <div className="gba:flex gba:justify-center gba:pb-4">
                      <Button
                        onClick={handleLoadMoreHistory}
                        variant="ghost"
                        size="sm"
                        disabled={isLoadingMoreHistory}
                        className="gba:text-sm gba:text-muted-foreground hover:gba:text-foreground"
                        data-testid="every-ai-load-more-history"
                      >
                        {isLoadingMoreHistory ? <Spinner size="sm" /> : 'Load older messages'}
                      </Button>
                    </div>
                  )}
                  <ConversationRenderer
                    turns={renderConversation}
                    accessToken={accessToken}
                    sendMessage={handleConversationSend}
                    editMessage={editMessage}
                    userInfo={userInfo}
                    pictureThumbnail={pictureThumbnail}
                    isVoiceMode={isSpeechMode}
                    sessionId={sessionId ?? undefined}
                    onCancelGeneration={cancelGeneration}
                    isAgentGenerating={isGenerating}
                    hideInlinePlan={isDesktopPlanLayout && Boolean(latestAgentPlan)}
                  />
                </div>
              )}
            </div>

            {/*
              Right-side plan panel. Only mounted when the agent has emitted
              at least one plan event during the session, and never in the
              empty state (the hero owns the visual real estate then).
            */}
            {latestAgentPlan && isDesktopPlanLayout && !isEmptyState ? (
              <aside
                className="gba:flex gba:flex-col gba:w-80 gba:flex-shrink-0 gba:border-l gba:border-border gba:bg-background/60 gba:backdrop-blur-sm gba:overflow-y-auto gba:p-4"
                data-testid="every-ai-plan-side-panel"
                aria-label="Agent plan"
              >
                <AgentPlanPanel planId={latestAgentPlan.planId} items={latestAgentPlan.items} defaultExpanded />
              </aside>
            ) : null}
          </div>

          {/* Input Area - fully transparent, content behind shows through */}
          <div
            className={`gba:flex-shrink-0 gba:relative gba:z-20 ${
              isEmptyState
                ? 'gba:absolute gba:bottom-6 gba:left-1/2 gba:-translate-x-1/2 gba:w-full gba:max-w-2xl gba:px-4'
                : 'gba:pt-2 gba:px-6 gba:pb-6'
            }`}
          >
            {/* Animated circling border for empty state */}
            {isEmptyState && (
              <style>{`
                @keyframes rotateBorder {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            )}
            <div className={isEmptyState ? 'gba:relative gba:rounded-2xl gba:p-[1.5px]' : ''}>
              {/* Rotating border gradient - masked to only show on border */}
              {isEmptyState && (
                <>
                  <div className="gba:absolute gba:inset-0 gba:rounded-2xl gba:overflow-hidden gba:pointer-events-none">
                    <div
                      className="gba:absolute"
                      style={{
                        width: '150%',
                        height: '150%',
                        top: '-25%',
                        left: '-25%',
                        background:
                          'conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--nw-ai-secondary) 90%, transparent) 45deg, color-mix(in srgb, var(--nw-ai) 70%, transparent) 90deg, transparent 135deg, transparent 360deg)',
                        animation: 'rotateBorder 3s linear infinite'
                      }}
                    />
                  </div>
                  {/* Inner mask to cut out the center, leaving only the border visible */}
                  <div
                    className="gba:absolute gba:rounded-[14px] gba:pointer-events-none"
                    style={{
                      inset: '1.5px',
                      backgroundColor: 'var(--nw-ai-hero-background)'
                    }}
                  />
                </>
              )}
              {sovereigntyToast && (
                <div className="gba:mx-4 gba:mb-2 gba:rounded-lg gba:bg-info/10 gba:px-3 gba:py-2 gba:text-xs gba:text-info">
                  Voice runs in local mode for your region policy.
                </div>
              )}
              {/* Inner container - fully transparent, no blur so content behind shows through */}
              <div
                className={isEmptyState ? 'gba:relative gba:rounded-[14px]' : ''}
                style={isEmptyState ? { backgroundColor: 'transparent' } : undefined}
              >
                <ChatInput
                  onSend={handleSend}
                  onClear={clearConversation}
                  disabled={isLoading}
                  suggestions={nextStepProposals}
                  isPrechatLoading={isPrechatLoading}
                  // Voice mode props
                  isSpeechMode={isSpeechMode}
                  isListening={voiceInput.isListening}
                  isSpeaking={voiceSynthesis.isSpeaking}
                  isVoiceLoading={voiceSynthesis.isLoading}
                  voiceVolume={voiceInput.volume}
                  voiceTranscript={voiceInput.transcript}
                  voiceInterimTranscript={voiceInput.interimTranscript}
                  currentSpeechText={voiceSynthesis.currentText}
                  voiceError={voiceSynthesis.error || voiceInput.error}
                  onToggleVoiceMode={toggleSpeechMode}
                  onStartListening={voiceInput.startListening}
                  onStopSpeaking={voiceSynthesis.stop}
                  // Pre-upload files as soon as they are attached for faster first answers.
                  onFilesAttached={files => attachFiles(files)}
                  // Cancel restoration props
                  cancelledMessageText={cancelledMessageText}
                  onClearCancelledMessage={clearCancelledMessage}
                  darkMode={isEmptyState}
                  compactSuggestions={compactSuggestions}
                  // Access token for entity mentions
                  accessToken={accessToken}
                  // User preferences
                  onOpenPreferences={userPreferences.openModal}
                  // Page-context skill toggle
                  pageSkillsEnabled={pageSkillsEnabled}
                  onTogglePageSkills={togglePageSkills}
                  activePageSkills={activePageSkills}
                />
              </div>
            </div>
          </div>
        </FlowProposalFileUploadProvider>
      </FormSubmissionProvider>

      {/* Overlay for sidebar - click to close */}
      {showHistory && (
        <div
          className="gba:absolute gba:inset-0 gba:bg-black/20 gba:z-20 gba:cursor-pointer"
          onClick={() => setShowHistory(false)}
          onKeyDown={e => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setShowHistory(false)
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close chat history sidebar"
          data-testid="every-ai-history-overlay"
        />
      )}
      {/* User Preferences Modal */}
      <UserPreferences
        darkMode={isEmptyState}
        onPrintSession={handlePrintSession}
        canPrintSession={conversation.length > 0}
        sessionId={sessionId}
      />
    </div>
  )
}

export default EveryAI
