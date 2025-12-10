import React from 'react'
import type { Message } from '../types'
import type { OutputItem, ConversationTurn } from '../../every-ai/types/models'
import { FormSubmissionProvider } from '../../every-ai/components/FormSubmissionContext'
import OutputItemRenderer from '../../every-ai/components/OutputRenderers'
import { MeetingCard } from './MeetingCard'
import type { ScheduledMeeting } from '../hooks/useEveryAIChat'

interface EveryAIMessageRendererProps {
  message: Message
  accessToken: string
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>
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
  onSendMessage
}) => {
  // Extract outputs from message metadata (don't mutate original array!)
  const outputs: OutputItem[] = React.useMemo(() => {
    const originalOutputs = message.metadata?.outputs || []

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

    return originalOutputs
  }, [message.metadata?.outputs, message.content])

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
        // This is a form submission - send it to the backend
        await onSendMessage(text, {
          isFormSubmission: true,
          flowName: parsed.flow_name,
          moduleName: parsed.module_name,
          uuid: parsed.uuid
        })
        return
      }
    } catch {
      // Not a JSON payload, send as regular message
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
        {filteredOutputs.map((output, index) => (
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
  // Only re-render if message content, outputs, or metadata actually changes
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.accessToken === nextProps.accessToken &&
    JSON.stringify(prevProps.message.metadata?.outputs) === JSON.stringify(nextProps.message.metadata?.outputs) &&
    JSON.stringify(prevProps.message.metadata?.scheduledMeeting) ===
      JSON.stringify(nextProps.message.metadata?.scheduledMeeting)
  )
})
