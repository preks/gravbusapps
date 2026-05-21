import React, { useState } from 'react'
import type { ConversationTurn, AgentTurn } from '../types/models'
import { UnifiedAIMessageRenderer } from './UnifiedAIMessageRenderer'
import { UnifiedUserMessage } from './UnifiedUserMessage'
import { UserInfoProps } from '@/common/BusinessAppContext'

interface ConversationRendererProps {
  turns: ConversationTurn[]
  accessToken: string
  sendMessage?: (userInputText: string, files: File[], isThinking?: boolean, isSearching?: boolean) => Promise<void>
  editMessage?: (turnIndex: number, newText: string) => Promise<void>
  userInfo?: UserInfoProps
  pictureThumbnail: string | null
  isVoiceMode?: boolean
  sessionId?: string
  onCancelGeneration?: () => void
  isAgentGenerating?: boolean
  hideInlinePlan?: boolean
}

export const ConversationRenderer: React.FC<ConversationRendererProps> = ({
  turns,
  accessToken,
  sendMessage,
  editMessage,
  userInfo,
  pictureThumbnail,
  isVoiceMode = false,
  sessionId,
  onCancelGeneration,
  isAgentGenerating = false,
  hideInlinePlan = false
}) => {
  const [editingTurnIndex, setEditingTurnIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  const handleEditStart = (index: number, text: string) => {
    setEditingTurnIndex(index)
    setEditText(text)
  }

  const handleEditCancel = () => {
    setEditingTurnIndex(null)
    setEditText('')
  }

  const handleEditSave = async (newText: string) => {
    if (editingTurnIndex === null || !newText.trim()) return

    // Close edit mode immediately before async operation
    const savedIndex = editingTurnIndex
    setEditingTurnIndex(null)
    setEditText('')

    try {
      if (editMessage) {
        await editMessage(savedIndex, newText)
      } else if (sendMessage) {
        // Fallback to sending new message if editMessage is not available
        await sendMessage(newText, [], false, false)
      }
    } catch (error) {
      console.error('Failed to save edit:', error)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-6">
      {turns.map((turn, idx) => {
        const turnKey = `turn-${idx}-${turn.side}`

        if (turn.side === 'user') {
          return (
            <UnifiedUserMessage
              key={turnKey}
              turn={turn}
              accessToken={accessToken}
              userInfo={userInfo}
              pictureThumbnail={pictureThumbnail}
              isEditing={editingTurnIndex === idx}
              editText={editText}
              onEditStart={text => handleEditStart(idx, text)}
              onEditCancel={handleEditCancel}
              onEditSave={newText => handleEditSave(newText)}
              onEditTextChange={setEditText}
              turns={turns}
              turnIndex={idx}
            />
          )
        }

        // Agent turn
        const agentTurn = turn as AgentTurn
        return (
          <UnifiedAIMessageRenderer
            key={turnKey}
            outputs={agentTurn.outputs || []}
            accessToken={accessToken}
            sendMessage={sendMessage}
            conversation={turns}
            isVoiceMode={isVoiceMode}
            sessionId={sessionId}
            onCancelGeneration={onCancelGeneration}
            isAgentGenerating={isAgentGenerating}
            wrapInBubble={false}
            hideInlinePlan={hideInlinePlan}
            userInfo={userInfo}
            data-testid="chat-agent-turn"
          />
        )
      })}
    </div>
  )
}

export default ConversationRenderer
