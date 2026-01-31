import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useFlowBot } from './hooks/useFlowBot'
import { useVoiceInput } from './hooks/useVoiceInput'
import { useVoiceSynthesis } from './hooks/useVoiceSynthesis'
import { ChatInput } from './components/ChatInput'
import { FormSubmissionProvider } from './components/FormSubmissionContext'
import { ConversationRenderer } from './components/ConversationRenderer'
import { useCurrentUserPicture } from './hooks/useCurrentUserPicture'
import { VoiceOverlay } from './components/voice/VoiceOverlay'
import type { OutputItem, AnswerOutput, NavigationData } from './types/models'
import { VoiceFormProvider, useVoiceForm } from './context/VoiceFormContext'
import { HeroSection, DeepBlueNeuralBackground } from './components/HeroSection'

export interface EveryAIProps extends BusinessAppContextProps {
  className?: string
  isActive?: boolean
}

/**
 * EveryAI - Premium AI Assistant with Voice Mode
 * The most advanced AI-powered assistant for NEWWORK ERP
 * Now with full voice conversation support including voice-driven form interactions!
 */
export const EveryAI: React.FC<EveryAIProps> = props => {
  return (
    <VoiceFormProvider>
      <EveryAIInner {...props} />
    </VoiceFormProvider>
  )
}

/**
 * Inner component that uses the VoiceFormContext
 */
const EveryAIInner: React.FC<EveryAIProps> = props => {
  const { accessToken, className, userInfo, isActive = true } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isSpeechMode, setIsSpeechMode] = useState(false)
  const isSpeechModeRef = useRef(false) // Ref for use in callbacks
  const lastSpokenTurnIndexRef = useRef<number>(-1)
  const lastNavigatedTurnIndexRef = useRef<number>(-1)

  // Voice form context for form interactions in voice mode
  const voiceForm = useVoiceForm()

  const {
    conversation,
    isLoading,
    sendMessage,
    editMessage,
    clearConversation,
    nextStepProposals,
    isPrechatLoading,
    sessionId,
    attachFiles,
    cancelGeneration,
    cancelledMessageText,
    clearCancelledMessage
  } = useFlowBot(accessToken, { isActive })

  // Fetch current user's picture
  const { pictureThumbnail } = useCurrentUserPicture(userInfo?.employeeDetails?.employeeId, accessToken)

  // Handle sending voice transcript (defined before voiceInput hook)
  const handleVoiceSendRef = useRef<(text: string) => void>(() => {})

  // Voice input hook with onEnd callback to auto-send
  // Using continuous: true with silenceDelay for natural conversation pauses
  const voiceInput = useVoiceInput({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    silenceDelay: 1000, // Wait 1 second of silence before sending
    onEnd: (finalTranscript: string) => {
      if (finalTranscript.trim() && isSpeechModeRef.current) {
        handleVoiceSendRef.current(finalTranscript)
      }
    }
  })

  // Track when AI stopped speaking to ignore echo
  const aiStoppedSpeakingAtRef = useRef<number>(0)
  // Track which form summary we've already spoken (prevent loops)
  const spokenFormSummaryRef = useRef<string | null>(null)

  // Voice synthesis hook with auto-restart listening on end
  const voiceSynthesis = useVoiceSynthesis({
    voice: 'nova',
    speed: 1.0,
    accessToken,
    onStart: () => {
      // STOP listening when AI starts speaking to prevent feedback loop
      console.log('🔇 [Voice] AI speaking started - stopping mic')
      voiceInput.cancelListening()
    },
    onEnd: () => {
      // Record when AI stopped speaking (for echo filtering)
      aiStoppedSpeakingAtRef.current = Date.now()
      // Auto-restart listening IMMEDIATELY
      if (isSpeechModeRef.current) {
        console.log('🎤 [Voice] AI finished speaking - restarting listening immediately')
        voiceInput.startListening()
      }
    }
  })

  // Stop AI speech when user starts talking (detected by interim transcript or volume)
  useEffect(() => {
    if (isSpeechMode && voiceSynthesis.isSpeaking) {
      // User is speaking - stop the AI
      if (voiceInput.interimTranscript || voiceInput.volume > 0.15) {
        console.log('🔇 [Voice] User speaking - stopping AI speech')
        voiceSynthesis.stop()
      }
    }
  }, [isSpeechMode, voiceSynthesis, voiceInput.interimTranscript, voiceInput.volume])

  // Toggle speech mode
  const toggleSpeechMode = useCallback(() => {
    if (isSpeechMode) {
      // Exiting speech mode - IMMEDIATELY stop everything
      console.log('🎤 [Voice] Exiting speech mode - stopping all audio')
      isSpeechModeRef.current = false // Set ref FIRST to prevent any queued operations
      setIsSpeechMode(false)
      voiceInput.cancelListening()
      voiceSynthesis.stop()
      // Force stop again after a small delay in case streaming is in progress
      setTimeout(() => {
        voiceSynthesis.stop()
      }, 100)
      voiceForm.setIsVoiceMode(false)
      voiceForm.clearPendingFormSummary()
      voiceForm.setActiveForm(null) // Clear any active form registration
    } else {
      // Entering speech mode - auto-start listening
      setIsSpeechMode(true)
      isSpeechModeRef.current = true
      lastSpokenTurnIndexRef.current = conversation.length - 1
      voiceForm.setIsVoiceMode(true)
      // Auto-start listening after a brief delay for UI to render
      setTimeout(() => {
        if (isSpeechModeRef.current) {
          console.log('🎤 [Voice] Auto-starting listening on speech mode entry')
          voiceInput.startListening()
        }
      }, 200)
    }
  }, [isSpeechMode, voiceInput, voiceSynthesis, conversation.length, voiceForm])

  // Speak pending form summaries when a form appears in voice mode
  useEffect(() => {
    // Skip if no pending summary or not in speech mode
    if (!voiceForm.pendingFormSummary || !isSpeechModeRef.current || !isSpeechMode) {
      return
    }

    // DON'T speak if already speaking (prevents queue buildup and loops)
    if (voiceSynthesis.isSpeaking || voiceSynthesis.isLoading) {
      console.log('🔊 [Voice Form] Skipping - already speaking')
      return
    }

    // CRITICAL: Check if we already spoke this exact summary (prevent loops)
    if (spokenFormSummaryRef.current === voiceForm.pendingFormSummary) {
      console.log('🔊 [Voice Form] Already spoke this summary, skipping')
      voiceForm.clearPendingFormSummary()
      return
    }

    console.log('🔊 [Voice Form] Speaking form summary:', voiceForm.pendingFormSummary.substring(0, 60) + '...')
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
    // Double-check both state and ref to prevent speaking after mode exit
    if (!isSpeechMode || !isSpeechModeRef.current) {
      console.log('🔊 [TTS] Not in speech mode, skipping')
      return
    }

    // DON'T speak if AI is already speaking (prevents overlap/loops)
    if (voiceSynthesis.isSpeaking || voiceSynthesis.isLoading) {
      console.log('🔊 [TTS] Already speaking/loading, skipping')
      return
    }

    // DON'T speak if there's an active form (the form summary effect handles that)
    if (voiceForm.activeForm) {
      console.log('🔊 [TTS] Active form present, skipping')
      lastSpokenTurnIndexRef.current = conversation.length - 1
      return
    }

    console.log(
      '🔊 [TTS] Checking conversation for new responses. Length:',
      conversation.length,
      'lastSpoken:',
      lastSpokenTurnIndexRef.current
    )

    // Find the latest agent turn with an answer (don't wait for isLoading to finish)
    for (let i = conversation.length - 1; i > lastSpokenTurnIndexRef.current; i--) {
      const turn = conversation[i]
      console.log('🔊 [TTS] Checking turn', i, 'side:', turn.side)

      if (turn.side === 'agent') {
        // Skip if this turn has a flow_proposal (form) - let form summary handle it
        const hasFlowProposal = turn.outputs?.some((o: OutputItem) => o.type === 'flow_proposal')
        if (hasFlowProposal) {
          console.log('🔊 [TTS] Turn has flow_proposal, skipping')
          lastSpokenTurnIndexRef.current = i
          continue
        }

        // Find the answer output
        const answerOutput = turn.outputs?.find((o: OutputItem): o is AnswerOutput => o.type === 'answer')
        console.log(
          '🔊 [TTS] Answer output:',
          answerOutput ? 'FOUND' : 'NOT FOUND',
          'outputs:',
          turn.outputs?.map(o => o.type)
        )

        if (answerOutput?.displayData) {
          // Extract text from display data
          const textParts: string[] = []
          for (const data of answerOutput.displayData) {
            console.log('🔊 [TTS] Display data type:', data.type)
            if (data.type === 'textBlock' && data.text) {
              // Clean markdown for speech
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

          console.log('🔊 [TTS] Text parts:', textParts.length, textParts)

          if (textParts.length > 0 && isSpeechModeRef.current) {
            const textToSpeak = textParts.join('. ')
            // Limit to first ~500 characters to avoid very long speeches
            const truncatedText = textToSpeak.length > 500 ? textToSpeak.substring(0, 500) + '...' : textToSpeak
            console.log('🔊 [TTS] Speaking:', truncatedText.substring(0, 80) + '...')
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
    // Double-check both state and ref to prevent navigation after mode exit
    if (!isSpeechMode || !isSpeechModeRef.current) return

    // Find the latest agent turn with a navigation (don't wait for isLoading to finish)
    for (let i = conversation.length - 1; i > lastNavigatedTurnIndexRef.current; i--) {
      const turn = conversation[i]

      if (turn.side === 'agent') {
        // Find the answer output with navigation data
        const answerOutput = turn.outputs?.find((o: OutputItem): o is AnswerOutput => o.type === 'answer')

        if (answerOutput?.displayData) {
          // Look for navigation data
          const navigationData = answerOutput.displayData.find(
            (data): data is NavigationData => data.type === 'navigation'
          )

          if (navigationData?.url) {
            console.log('🧭 [Voice] Auto-navigating to:', navigationData.url)
            lastNavigatedTurnIndexRef.current = i

            // Small delay to let the user hear the AI's response first
            setTimeout(() => {
              navigateTo(navigationData.url)
            }, 1500) // Wait 1.5 seconds so they can hear the explanation
            break
          }
        }
      }
    }
  }, [conversation, isSpeechMode])

  // Handle sending voice transcript with form command detection
  const handleVoiceSend = useCallback(
    (text: string) => {
      if (text && typeof text === 'string' && text.trim()) {
        const cleanText = text.trim()
        console.log('🎤 [Voice] Received:', cleanText)

        // IMPORTANT: Ignore very short inputs (likely noise/echo)
        if (cleanText.length < 2) {
          console.log('🎤 [Voice] Ignoring too short input:', cleanText)
          voiceInput.resetTranscript()
          return
        }

        // ECHO FILTER: Ignore transcripts that arrive within 800ms of AI stopping
        // This prevents the microphone from picking up the AI's voice
        const timeSinceAIStopped = Date.now() - aiStoppedSpeakingAtRef.current
        if (timeSinceAIStopped < 800) {
          console.log('🎤 [Voice] Ignoring echo (too soon after AI stopped):', cleanText, `(${timeSinceAIStopped}ms)`)
          voiceInput.resetTranscript()
          return
        }

        // Stop AI speech immediately when user speaks
        voiceSynthesis.stop()

        // Check if there's an active form and if this is a form command
        console.log('🎤 [Voice] activeForm check:', voiceForm.activeForm ? 'HAS ACTIVE FORM' : 'NO ACTIVE FORM')
        if (voiceForm.activeForm) {
          const command = voiceForm.parseVoiceCommand(cleanText)
          console.log('🎤 [Voice Form] Parsed command:', command, 'from text:', cleanText)

          if (command.type === 'confirm') {
            console.log('🎤 [Voice Form] Confirming and submitting form')
            // Clear active form IMMEDIATELY to prevent re-announcing
            const submitHandler = voiceForm.activeForm.submitHandler
            voiceForm.setActiveForm(null)
            voiceForm.clearPendingFormSummary()
            voiceSynthesis.speak('Submitting the form now.')
            submitHandler()
            voiceInput.resetTranscript()
            return
          }

          if (command.type === 'cancel') {
            console.log('🎤 [Voice Form] Cancelling form')
            // Clear active form IMMEDIATELY to prevent re-announcing
            const cancelHandler = voiceForm.activeForm.cancelHandler
            voiceForm.setActiveForm(null)
            voiceForm.clearPendingFormSummary()
            voiceSynthesis.speak('Cancelling the form.')
            cancelHandler()
            voiceInput.resetTranscript()
            return
          }

          if (command.type === 'modify') {
            console.log('🎤 [Voice Form] Modifying field:', command.field, 'to:', command.value)
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
              sendMessage(cleanText, [], false, false, undefined)
              voiceInput.resetTranscript()
              return
            }

            // NOT a new request and NOT a valid form command
            // SILENTLY ignore to prevent feedback loop - just keep listening
            console.log('🎤 [Voice Form] Unknown input, ignoring silently:', cleanText)
            voiceInput.resetTranscript()
            return
          }
        }

        // No active form - send as regular chat message
        sendMessage(cleanText, [], false, false, undefined)
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

    if (isLoading && !hasLoadingOutput) {
      return [...conversation, { side: 'agent' as const, outputs: [{ type: 'loading' as const }] }]
    }
    return conversation
  }, [conversation, isLoading])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [extendedConversation.length])

  // Track if we've already processed a prompt from sessionStorage to avoid duplicates
  const promptProcessedRef = useRef<string | null>(null)
  const lastCheckTimeRef = useRef<number>(0)

  // Check for initial prompt when Every AI component is ready
  // This handles: component mount, conversation becomes empty, or sidebar opens
  const checkAndSendInitialPrompt = useCallback(() => {
    // Throttle checks to avoid excessive sessionStorage reads
    const now = Date.now()
    if (now - lastCheckTimeRef.current < 200) {
      return
    }
    lastCheckTimeRef.current = now

    if (isLoading) {
      return // Don't check while loading
    }

    try {
      const initialPrompt = sessionStorage.getItem('everyAIInitialPrompt')
      if (initialPrompt && initialPrompt !== promptProcessedRef.current) {
        console.log('[EveryAI] Found initial prompt in sessionStorage:', initialPrompt)
        // Mark this prompt as processed
        promptProcessedRef.current = initialPrompt
        // Clear the prompt from storage immediately to prevent duplicate sends
        sessionStorage.removeItem('everyAIInitialPrompt')
        // Send the prompt after a short delay to ensure component is fully ready
        setTimeout(() => {
          console.log('[EveryAI] Sending initial prompt:', initialPrompt)
          sendMessage(initialPrompt, [], false, false, undefined)
        }, 300)
      }
    } catch (error) {
      console.warn('Failed to read Every AI initial prompt:', error)
    }
  }, [isLoading, sendMessage])

  // Check for prompt when component is ready and conversation is empty
  useEffect(() => {
    if (!isLoading && conversation.length === 0) {
      checkAndSendInitialPrompt()
    }
  }, [isLoading, conversation.length, checkAndSendInitialPrompt])

  // Listen for custom event when sidebar opens (handles case when component is already mounted)
  useEffect(() => {
    const handleSidebarOpen = () => {
      console.log('[EveryAI] Sidebar opened event received')
      // Reset processed prompt when sidebar opens fresh
      promptProcessedRef.current = null
      // Check for prompt after a short delay to ensure component is ready
      setTimeout(() => {
        checkAndSendInitialPrompt()
      }, 500)
    }

    // Listen for when Every AI sidebar becomes active
    window.addEventListener('everyAISidebarOpened', handleSidebarOpen)
    return () => {
      window.removeEventListener('everyAISidebarOpened', handleSidebarOpen)
    }
  }, [checkAndSendInitialPrompt])

  const handleSend = (
    text: string,
    files: File[],
    isThinking: boolean,
    isSearching: boolean,
    mentions?: Array<{ id: string; typeKey: string; display: string; raw?: any; start?: number; end?: number }>
  ) => {
    // Keep passing files for backwards compatibility.
    // useFlowBot.sendMessage will decide whether to use /add_files or direct upload.
    sendMessage(text, files, isThinking, isSearching, mentions)
  }

  const isEmptyState = conversation.length === 0 && !isLoading

  return (
    <div
      className={`gba:h-full gba:flex gba:flex-col gba:relative gba:overflow-hidden ${className || ''}`}
      style={
        {
          backgroundColor: isEmptyState ? 'var(--nw-ai-hero-background)' : 'var(--nw-background)',
          // Override AI colors to match decorative theme (blue)
          '--nw-ai': 'var(--nw-decorative)',
          '--nw-ai-secondary': 'var(--nw-decorative-secondary)'
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

      {/* Voice Mode Overlay */}
      <VoiceOverlay
        isVisible={isSpeechMode}
        isListening={voiceInput.isListening}
        isSpeaking={voiceSynthesis.isSpeaking}
        isLoading={voiceSynthesis.isLoading || isLoading}
        volume={voiceInput.volume}
        transcript={voiceInput.transcript}
        interimTranscript={voiceInput.interimTranscript}
        currentSpeechText={voiceSynthesis.currentText}
        activeForm={
          voiceForm.activeForm
            ? {
                flowName: voiceForm.activeForm.flowName,
                fields: Object.entries(voiceForm.activeForm.formData || {})
                  .filter(([key, value]) => {
                    if (value === undefined || value === null || value === '') return false
                    if (key.toLowerCase().includes('version')) return false
                    if (key === 'changeMode') return false
                    // Skip UUID values (e.g., owner employee IDs)
                    if (
                      typeof value === 'string' &&
                      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
                    )
                      return false
                    // Skip fields that end with Id or Ref (like ownerEmployeeId)
                    if (key.toLowerCase().endsWith('id') || key.toLowerCase().endsWith('ref')) return false
                    return true
                  })
                  .map(([key, value]) => ({
                    name: key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/_/g, ' ')
                      .trim()
                      .replace(/\b\w/g, c => c.toUpperCase()),
                    value: typeof value === 'object' ? JSON.stringify(value) : String(value)
                  }))
              }
            : null
        }
        onClose={toggleSpeechMode}
        onStartListening={voiceInput.startListening}
        onStopListening={voiceInput.stopListening}
        onStopSpeaking={voiceSynthesis.stop}
        onSendTranscript={handleVoiceSend}
      />

      <FormSubmissionProvider>
        {/* Conversation Area with subtle gradient */}
        <div
          ref={scrollRef}
          className="gba:flex-1 gba:overflow-y-auto gba:relative gba:z-10 gba:flex gba:flex-col"
          data-testid="conversation-area"
        >
          {conversation.length === 0 && !isLoading ? (
            <div className="gba:flex-1 gba:flex gba:flex-col gba:relative gba:min-h-full">
              <HeroSection data-testid="every-ai-hero" />
            </div>
          ) : (
            <div className="gba:p-6">
              <ConversationRenderer
                turns={extendedConversation}
                accessToken={accessToken}
                sendMessage={sendMessage}
                editMessage={editMessage}
                userInfo={userInfo}
                pictureThumbnail={pictureThumbnail}
                isVoiceMode={isSpeechMode}
                sessionId={sessionId ?? undefined}
                onCancelGeneration={cancelGeneration}
                isAgentGenerating={isLoading}
              />
            </div>
          )}
        </div>

        {/* Input Area - translucent glassmorphism style for empty state */}
        <div
          className={`gba:flex-shrink-0 gba:relative gba:z-20 ${
            isEmptyState
              ? 'gba:absolute gba:bottom-6 gba:left-1/2 gba:-translate-x-1/2 gba:w-full gba:max-w-2xl gba:px-4'
              : 'gba:bg-background gba:pt-2 gba:px-6 gba:pb-6'
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
            {/* Inner container - translucent */}
            <div
              className={isEmptyState ? 'gba:relative gba:rounded-[14px] gba:backdrop-blur-md' : ''}
              style={isEmptyState ? { backgroundColor: 'rgba(255, 255, 255, 0.08)' } : undefined}
            >
              <ChatInput
                onSend={handleSend}
                onClear={clearConversation}
                disabled={isLoading}
                suggestions={nextStepProposals}
                isPrechatLoading={isPrechatLoading}
                placeholder="Ask EveryAI anything..."
                // Voice mode props
                isSpeechMode={isSpeechMode}
                isListening={voiceInput.isListening}
                isSpeaking={voiceSynthesis.isSpeaking}
                isVoiceLoading={voiceSynthesis.isLoading}
                voiceVolume={voiceInput.volume}
                onToggleVoiceMode={toggleSpeechMode}
                onStopSpeaking={voiceSynthesis.stop}
                // Pre-upload files as soon as they are attached for faster first answers.
                onFilesAttached={files => attachFiles(files)}
                // Cancel restoration props
                cancelledMessageText={cancelledMessageText}
                onClearCancelledMessage={clearCancelledMessage}
                darkMode={isEmptyState}
              />
            </div>
          </div>
        </div>
      </FormSubmissionProvider>
    </div>
  )
}

export default EveryAI
