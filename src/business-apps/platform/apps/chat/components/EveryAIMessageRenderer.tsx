import React from 'react'
import type { Message } from '../types'
import type { OutputItem, ConversationTurn } from '../../every-ai/types/models'
import { FormSubmissionProvider } from '../../every-ai/components/FormSubmissionContext'
import OutputItemRenderer from '../../every-ai/components/OutputRenderers'
import { MeetingCard } from './MeetingCard'
import type { ScheduledMeeting } from '../hooks/useEveryAIChat'
import { debugLog } from '../utils/debugLog'

interface EveryAIMessageRendererProps {
  message: Message
  accessToken: string
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>
  isInitiatedByCurrentUser?: boolean
  onHasHiddenCards?: (hasHidden: boolean) => void
}

/**
 * EveryAIMessageRenderer - Bridges chat messages to EveryAI's rich rendering
 *
 * This component takes a chat message with AI metadata and renders it using
 * EveryAI's output renderers, enabling inline forms, entities, and rich content
 * directly in the chat message flow.
 *
 * Also handles scheduled meetings from chat AI interactions.
 *
 * Memoized to prevent unnecessary re-renders and repeated data fetching.
 */
const EveryAIMessageRendererComponent: React.FC<EveryAIMessageRendererProps> = ({
  message,
  accessToken,
  onSendMessage,
  isInitiatedByCurrentUser,
  onHasHiddenCards
}) => {
  // Check if this message is a result from a form submission
  const isFormResult = message.metadata?.isFormResult === true

  // Track if we filtered any entity cards (to show a message)
  const [hasHiddenCards, setHasHiddenCards] = React.useState(false)

  // Notify parent when hasHiddenCards changes
  React.useEffect(() => {
    if (onHasHiddenCards) {
      onHasHiddenCards(hasHiddenCards)
    }
  }, [hasHiddenCards, onHasHiddenCards])

  // Extract outputs from message metadata (don't mutate original array!)
  const outputs: OutputItem[] = React.useMemo(() => {
    const originalOutputs = message.metadata?.outputs || []
    let hiddenCardCount = 0

    // If no outputs but we have text content, create a simple text output
    if (originalOutputs.length === 0 && message.content) {
      const textOutput: OutputItem = {
        type: 'answer',
        displayData: [
          {
            type: 'textBlock',
            text: message.content
          }
        ],
        nextStepProposals: []
      }
      return [textOutput]
    }

    // If this is a form result and current user is NOT the initiator,
    // filter out entity cards (absence, expense, etc.)
    if (isFormResult && !isInitiatedByCurrentUser) {
      const filtered = originalOutputs.map((output: any) => {
        // Only filter 'answer' type outputs
        if (output.type === 'answer' && output.displayData) {
          const filteredDisplayData = output.displayData.filter((data: any) => {
            // Hide entity cards for absence/expense/employee_absence
            if (data.type === 'entity') {
              const entityType = data.entity as string
              const isPrivateEntity = [
                'absence',
                'employee_absence',
                'expense_request',
                'expense_plan',
                'expense_item'
              ].includes(entityType)

              if (isPrivateEntity) {
                hiddenCardCount++
                debugLog(`🔒 [EveryAIMessageRenderer] Hiding ${entityType} card from non-initiator`)
                return false // Hide this entity card
              }
            }
            return true // Keep everything else
          })

          return {
            ...output,
            displayData: filteredDisplayData
          }
        }
        return output
      })

      // Update state if we hid any cards
      if (hiddenCardCount > 0 && !hasHiddenCards) {
        setHasHiddenCards(true)
      }

      return filtered
    }

    return originalOutputs
  }, [message.metadata?.outputs, message.content, isFormResult, isInitiatedByCurrentUser, hasHiddenCards])

  // Extract scheduled meeting if present
  const scheduledMeeting: ScheduledMeeting | undefined = message.metadata?.scheduledMeeting

  // Create a send message handler for form submissions
  const handleSendMessage = async (text: string, files: File[]) => {
    if (!onSendMessage) {
      console.warn('[EveryAIMessageRenderer] No send message handler provided')
      return
    }

    // TODO: Handle file attachments when integrating with chat backend
    if (files && files.length > 0) {
      console.warn('[EveryAIMessageRenderer] File attachments not yet supported in chat context:', files)
    }

    // Try to parse form submission
    try {
      const parsed = JSON.parse(text)
      if (parsed.action === 'form_submission') {
        debugLog('📤 [EveryAIMessageRenderer] Form submission detected:', {
          flow_name: parsed.flow_name,
          module_name: parsed.module_name,
          uuid: parsed.uuid
        })

        // This is a form submission - send it to the backend
        await onSendMessage(text, {
          isFormSubmission: true,
          flowName: parsed.flow_name,
          moduleName: parsed.module_name,
          uuid: parsed.uuid
        })

        debugLog('✅ [EveryAIMessageRenderer] Form submission sent successfully')
        return
      }
    } catch (error) {
      // Not a JSON payload, send as regular message
      debugLog('[EveryAIMessageRenderer] Not a JSON message:', error)
    }

    await onSendMessage(text)
  }

  // Build a conversation structure for the renderer
  // We don't pass conversation or voice mode since we're in chat context
  const conversation: ConversationTurn[] = []

  // Filter out meeting-related table outputs - we use our custom MeetingCard instead
  // This maintains backward compatibility with the original chat behavior
  const filteredOutputs = React.useMemo(() => {
    if (!scheduledMeeting) {
      // No meeting scheduled, show all outputs
      return outputs
    }

    // If we have a scheduled meeting, filter out any table displays about meetings
    // (FlowBot might send meeting tables, but we prefer our custom MeetingCard UI)
    return outputs.filter(output => {
      if (output.type === 'answer' && output.displayData) {
        // Check if this is a meeting-related table
        const hasMeetingTable = output.displayData.some(data => {
          if (data.type === 'table') {
            const tableData = data as any
            const title = tableData.title?.toLowerCase() || ''
            const description = tableData.description?.toLowerCase() || ''
            return title.includes('meeting') || description.includes('meeting')
          }
          return false
        })
        // Filter out outputs that contain meeting tables
        return !hasMeetingTable
      }
      return true
    })
  }, [outputs, scheduledMeeting])

  return (
    <FormSubmissionProvider>
      <div className="gba:space-y-3" data-testid="everyai-message-renderer">
        {/* If we hid cards from non-initiator, don't show any outputs (message handled by MessageItem) */}
        {!hasHiddenCards &&
          // Show normal outputs if user is initiator or no cards were hidden
          filteredOutputs.map((output, index) => (
            <OutputItemRenderer
              key={`output-${index}`}
              item={output}
              accessToken={accessToken}
              sendMessage={handleSendMessage}
              conversation={conversation}
              isVoiceMode={false}
            />
          ))}

        {/* Always render MeetingCard if we have scheduled meeting (original chat behavior) */}
        {scheduledMeeting && <MeetingCard meeting={scheduledMeeting} />}
      </div>
    </FormSubmissionProvider>
  )
}

// Memoize to prevent unnecessary re-renders (which trigger GraphQL queries in entity displays)
export const EveryAIMessageRenderer = React.memo(EveryAIMessageRendererComponent, (prevProps, nextProps) => {
  // Only re-render if message content, outputs, metadata, or initiator status changes
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.accessToken === nextProps.accessToken &&
    prevProps.isInitiatedByCurrentUser === nextProps.isInitiatedByCurrentUser &&
    JSON.stringify(prevProps.message.metadata?.outputs) === JSON.stringify(nextProps.message.metadata?.outputs) &&
    JSON.stringify(prevProps.message.metadata?.scheduledMeeting) ===
      JSON.stringify(nextProps.message.metadata?.scheduledMeeting)
  )
})
