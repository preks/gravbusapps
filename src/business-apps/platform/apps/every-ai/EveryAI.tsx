import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowBot } from './hooks/useFlowBot'
import { useVoiceInput } from './hooks/useVoiceInput'
import { useVoiceSynthesis } from './hooks/useVoiceSynthesis'
import { ChatInput } from './components/ChatInput'
import { FormSubmissionProvider } from './components/FormSubmissionContext'
import { ConversationRenderer } from './components/ConversationRenderer'
import { useCurrentUserPicture } from './hooks/useCurrentUserPicture'
import { RemindersPanel } from './components/RemindersPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { VoiceOverlay } from './components/voice/VoiceOverlay'
import { Button } from '@newwork/nw-design-system'
import { Bell, Sparkle, ArrowsOut } from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { OutputItem, AnswerOutput } from './types/models'

export interface EveryAIProps extends BusinessAppContextProps {
  className?: string
}

/**
 * EveryAI - Premium AI Assistant with Voice Mode
 * The most advanced AI-powered assistant for NEWWORK ERP
 * Now with full voice conversation support!
 */
export const EveryAI: React.FC<EveryAIProps> = props => {
  const { accessToken, className, userInfo } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showRemindersPanel, setShowRemindersPanel] = useState(false)
  const [isSpeechMode, setIsSpeechMode] = useState(false)
  const isSpeechModeRef = useRef(false) // Ref for use in callbacks
  const lastSpokenTurnIndexRef = useRef<number>(-1)

  // Detect if we're in sidepanel mode (not the fullscreen every-ai view)
  const isInSidepanel = useMemo(() => {
    if (typeof window === 'undefined') return false
    // In dev mode, check if app param is exactly every-ai
    const urlParams = new URLSearchParams(window.location.search)
    const appParam = urlParams.get('app')
    if (appParam === 'platform/apps/every-ai') return false
    // In prod mode, check if we're on /platform/every-ai
    if (window.location.pathname === '/platform/every-ai') return false
    // Otherwise we're likely in a sidepanel or embedded
    return true
  }, [])

  // Navigate to fullscreen mode
  const openFullscreen = useCallback(() => {
    navigateTo('/platform/every-ai')
  }, [])

  const { conversation, isLoading, sendMessage, clearConversation, nextStepProposals, isPrechatLoading } =
    useFlowBot(accessToken)

  // Fetch current user's picture
  const { pictureThumbnail } = useCurrentUserPicture(userInfo?.employeeDetails?.employeeId, accessToken)

  // Handle sending voice transcript (defined before voiceInput hook)
  const handleVoiceSendRef = useRef<(text: string) => void>(() => {})

  // Voice input hook with onEnd callback to auto-send
  const voiceInput = useVoiceInput({
    language: 'en-US',
    continuous: false,
    interimResults: true,
    onEnd: (finalTranscript: string) => {
      if (finalTranscript.trim() && isSpeechModeRef.current) {
        handleVoiceSendRef.current(finalTranscript)
      }
    }
  })

  // Voice synthesis hook with auto-restart listening on end
  const voiceSynthesis = useVoiceSynthesis({
    voice: 'nova',
    speed: 1.0,
    accessToken,
    onEnd: () => {
      // Auto-restart listening after AI finishes speaking
      if (isSpeechModeRef.current && !voiceInput.isListening) {
        console.log('🎤 [Voice] Auto-restarting listening after AI speech')
        setTimeout(() => {
          if (isSpeechModeRef.current) {
            voiceInput.startListening()
          }
        }, 300) // Small delay for natural conversation flow
      }
    }
  })

  // Toggle speech mode
  const toggleSpeechMode = useCallback(() => {
    if (isSpeechMode) {
      // Exiting speech mode
      setIsSpeechMode(false)
      isSpeechModeRef.current = false
      voiceInput.cancelListening()
      voiceSynthesis.stop()
    } else {
      // Entering speech mode - auto-start listening
      setIsSpeechMode(true)
      isSpeechModeRef.current = true
      lastSpokenTurnIndexRef.current = conversation.length - 1
      // Auto-start listening after a brief delay for UI to render
      setTimeout(() => {
        if (isSpeechModeRef.current) {
          console.log('🎤 [Voice] Auto-starting listening on speech mode entry')
          voiceInput.startListening()
        }
      }, 200)
    }
  }, [isSpeechMode, voiceInput, voiceSynthesis, conversation.length])

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
    if (!isSpeechMode) return

    // Find the latest agent turn with an answer (don't wait for isLoading to finish)
    for (let i = conversation.length - 1; i > lastSpokenTurnIndexRef.current; i--) {
      const turn = conversation[i]

      if (turn.side === 'agent') {
        // Find the answer output
        const answerOutput = turn.outputs?.find((o: OutputItem): o is AnswerOutput => o.type === 'answer')

        if (answerOutput?.displayData) {
          // Extract text from display data
          const textParts: string[] = []
          for (const data of answerOutput.displayData) {
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

          if (textParts.length > 0) {
            const textToSpeak = textParts.join('. ')
            // Limit to first ~500 characters to avoid very long speeches
            const truncatedText = textToSpeak.length > 500 ? textToSpeak.substring(0, 500) + '...' : textToSpeak
            console.log('🔊 [TTS] Speaking:', truncatedText.substring(0, 80) + '...')
            voiceSynthesis.speak(truncatedText)
            lastSpokenTurnIndexRef.current = i
          }
        }
      }
    }
  }, [conversation, isSpeechMode, voiceSynthesis])

  // Handle sending voice transcript
  const handleVoiceSend = useCallback(
    (text: string) => {
      if (text && typeof text === 'string' && text.trim()) {
        const cleanText = text.trim()
        console.log('🎤 [Voice] Sending:', cleanText)
        // Clear old AI response text before sending new message
        voiceSynthesis.stop()
        sendMessage(cleanText, [], false, false, undefined)
        voiceInput.resetTranscript()
      }
    },
    [sendMessage, voiceInput, voiceSynthesis]
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

  const handleSend = (
    text: string,
    files: File[],
    isThinking: boolean,
    isSearching: boolean,
    mentions?: Array<{ id: string; typeKey: string; display: string; raw?: any; start?: number; end?: number }>
  ) => {
    sendMessage(text, files, isThinking, isSearching, mentions)
  }

  return (
    <div
      className={`gba:h-full gba:flex gba:flex-col gba:bg-background gba:relative gba:overflow-hidden ${className || ''}`}
      data-testid="every-ai-app"
    >
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
        onClose={toggleSpeechMode}
        onStartListening={voiceInput.startListening}
        onStopListening={voiceInput.stopListening}
        onStopSpeaking={voiceSynthesis.stop}
        onSendTranscript={handleVoiceSend}
      />

      {/* Top Right Actions - Fullscreen & Reminders (hidden in speech mode) */}
      {!isSpeechMode && (
        <div className="gba:absolute gba:top-4 gba:right-4 gba:z-50 gba:flex gba:gap-2">
          {/* Fullscreen button - only visible in sidepanel mode */}
          {isInSidepanel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={openFullscreen}
              className="gba:relative gba:p-2 gba:rounded-full gba:bg-card/80 gba:backdrop-blur-sm gba:border gba:border-border hover:gba:bg-accent gba:transition-all hover:gba:shadow-lg gba:group"
              data-testid="every-ai-fullscreen-button"
              title="Open in Fullscreen"
            >
              <ArrowsOut
                className="gba:h-5 gba:w-5 gba:text-muted-foreground group-hover:gba:text-primary gba:transition-colors"
                weight="regular"
                aria-hidden="true"
              />
            </Button>
          )}
          {/* Reminders button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRemindersPanel(!showRemindersPanel)}
            className="gba:relative gba:p-2 gba:rounded-full gba:bg-card/80 gba:backdrop-blur-sm gba:border gba:border-border hover:gba:bg-accent gba:transition-all hover:gba:shadow-lg gba:group"
            data-testid="reminders-bell-button"
            title={showRemindersPanel ? 'Back to Chat' : 'My Reminders'}
          >
            {showRemindersPanel ? (
              <Sparkle
                className="gba:h-5 gba:w-5 gba:text-muted-foreground group-hover:gba:text-primary gba:transition-colors"
                weight="regular"
                aria-hidden="true"
              />
            ) : (
              <Bell
                className="gba:h-5 gba:w-5 gba:text-muted-foreground group-hover:gba:text-primary gba:transition-colors"
                weight="regular"
                aria-hidden="true"
              />
            )}
          </Button>
        </div>
      )}

      {/* Reminders Panel - Always mounted to check for due reminders */}
      <div
        className={`gba:absolute gba:inset-0 gba:z-40 gba:bg-background gba:flex gba:flex-col ${showRemindersPanel ? '' : 'gba:hidden'}`}
        data-testid="reminders-panel-overlay"
      >
        <ErrorBoundary
          fallback={
            <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:shadow-lg gba:border gba:border-border gba:m-4">
              <p className="gba:text-destructive gba:font-semibold">Failed to load reminders</p>
              <button
                onClick={() => setShowRemindersPanel(false)}
                className="gba:mt-2 gba:text-sm gba:text-muted-foreground hover:gba:text-foreground"
              >
                Close
              </button>
            </div>
          }
        >
          <RemindersPanel
            accessToken={accessToken}
            userInfo={userInfo}
            onClose={() => setShowRemindersPanel(false)}
            onReminderDue={() => setShowRemindersPanel(true)}
          />
        </ErrorBoundary>
      </div>

      <FormSubmissionProvider>
        {/* Conversation Area with subtle gradient */}
        <div
          ref={scrollRef}
          className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:relative gba:z-10"
          data-testid="conversation-area"
        >
          {conversation.length === 0 && !isLoading ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center">
              {/* Premium welcome screen */}
              <div className="gba:relative gba:mb-6">
                <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-full gba:blur-2xl gba:opacity-40 gba:animate-pulse" />
                <div className="gba:h-24 gba:w-24 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-full gba:flex gba:items-center gba:justify-center gba:relative gba:shadow-2xl">
                  <svg
                    className="gba:h-12 gba:w-12 gba:text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>

              <h2 className="gba:text-3xl gba:font-bold gba:bg-gradient-to-r gba:from-primary gba:via-info gba:to-success gba:bg-clip-text gba:text-transparent gba:mb-3">
                Welcome to EveryAI
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-md gba:text-lg gba:mb-8">
                Your intelligent companion for managing tasks, analyzing data, and automating workflows across the
                entire platform.
              </p>

              {/* Feature highlights with icons - now including Voice */}
              <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:max-w-3xl gba:mb-8">
                {[
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    ),
                    label: 'Instant Answers'
                  },
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    ),
                    label: 'Data Insights'
                  },
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    ),
                    label: 'Voice Mode'
                  },
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ),
                    label: 'Automation'
                  }
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:p-5 gba:rounded-xl gba:bg-card gba:border gba:border-border hover:gba:border-primary gba:transition-all gba:shadow-sm hover:gba:shadow-md gba:group"
                  >
                    <div className="gba:h-12 gba:w-12 gba:rounded-xl gba:bg-gradient-to-br gba:from-primary/10 gba:to-info/10 gba:flex gba:items-center gba:justify-center gba:text-primary group-hover:gba:scale-110 gba:transition-transform">
                      {feature.icon}
                    </div>
                    <span className="gba:text-sm gba:font-semibold gba:text-foreground">{feature.label}</span>
                  </div>
                ))}
              </div>

              <p className="gba:text-xs gba:text-muted-foreground gba:opacity-75">
                Type a message, click a suggestion, or use{' '}
                <span className="gba:font-semibold gba:text-primary">Voice Mode</span> to speak
              </p>
            </div>
          ) : (
            <ConversationRenderer
              turns={extendedConversation}
              accessToken={accessToken}
              sendMessage={sendMessage}
              userInfo={userInfo}
              pictureThumbnail={pictureThumbnail}
            />
          )}
        </div>

        {/* Input Area with premium styling */}
        <div className="gba:flex-shrink-0 gba:border-t gba:border-border gba:bg-card/50 gba:backdrop-blur-md gba:p-6 gba:relative gba:z-10">
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
          />
        </div>
      </FormSubmissionProvider>
    </div>
  )
}

export default EveryAI
