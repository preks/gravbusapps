/**
 * Expert Mention Detection & Routing Utilities
 *
 * Detects mentions of Every Experts in messages and routes to the correct expert
 */

import type { ActiveExpert } from '../hooks/useConversationExperts'
import type { MessageEntityReference } from '../types'

export interface ExpertMentionResult {
  isExpertMention: boolean
  isEveryMention: boolean
  expertId?: string
  expertName?: string
  prompt: string // Message without the mention
}

/**
 * Detect if message contains a mention of an expert or generic Every
 *
 * Patterns:
 * - @ExpertName ... → Routes to specific expert
 * - @Every ... → Routes to generic Every AI
 */
export function detectExpertMention(
  content: string,
  entityReferences: MessageEntityReference[] | undefined,
  activeExperts: ActiveExpert[]
): ExpertMentionResult {
  // Check entity references for ai_assistant type
  const hasEveryReference = entityReferences?.some(
    ref => ref.type === 'ai_assistant' && ref.id === 'every-ai-assistant'
  )

  // Also check for expert references
  const expertReference = entityReferences?.find(ref => ref.type === 'every_expert')

  if (expertReference) {
    // Specific expert mentioned
    const expert = activeExperts.find(e => e.expertId === expertReference.id)

    return {
      isExpertMention: true,
      isEveryMention: false,
      expertId: expertReference.id,
      expertName: expert?.expertName || expertReference.name || '',
      prompt: content.replace(new RegExp(`@${expertReference.name}\\s*`, 'gi'), '').trim()
    }
  }

  if (hasEveryReference) {
    // Generic Every AI mentioned
    return {
      isExpertMention: false,
      isEveryMention: true,
      prompt: content.replace(/@Every\s*/gi, '').trim()
    }
  }

  // Fallback: Check text patterns for @ExpertName
  for (const expert of activeExperts) {
    const mentionPattern = new RegExp(`@${expert.expertName.replace(/\s+/g, '\\s*')}\\s*`, 'gi')
    if (mentionPattern.test(content)) {
      return {
        isExpertMention: true,
        isEveryMention: false,
        expertId: expert.expertId,
        expertName: expert.expertName,
        prompt: content.replace(mentionPattern, '').trim()
      }
    }
  }

  return {
    isExpertMention: false,
    isEveryMention: false,
    prompt: content
  }
}

/**
 * Get expert-specific entity reference for mentions
 */
export function createExpertEntityReference(expert: ActiveExpert): MessageEntityReference {
  return {
    id: expert.expertId,
    type: 'every_expert',
    name: expert.expertName,
    subtitle: expert.specialty
  }
}

/**
 * Build enhanced prompt with expert context
 * Includes expert's specialty and role to guide responses
 */
export function buildExpertPrompt(userMessage: string, expert: ActiveExpert): string {
  const contextParts = [
    `[You are ${expert.expertName}, a specialized AI expert]`,
    `[Your expertise: ${expert.specialty}]`,
    `[Your role: Provide expert advice and answer questions within your domain]`,
    `[User question: ${userMessage}]`
  ]

  return contextParts.join('\n')
}
