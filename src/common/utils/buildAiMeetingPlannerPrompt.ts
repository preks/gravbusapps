import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Builds an AI meeting planner prompt for different entity types.
 * Helps AI suggest optimal meeting times, agendas, and participants.
 *
 * @param entityType - The entity type (e.g., "opportunity", "account", "contact", "lead")
 * @returns A comprehensive prompt string optimized for meeting planning
 */
export function buildAiMeetingPlannerPrompt(entityType: string): string {
  const entityTypeCapitalized = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  // Entity-specific prompt enhancements
  const entitySpecificGuidance: Record<string, string> = {
    opportunity: getTranslationFromI18nKeyAndLabel(
      'ai.meetingPlanner.opportunity.guidance',
      'Consider the opportunity pipeline, pipeline stage, status, estimated amount, close date, recent activities, tasks, notes, and other relevant data. Focus on meetings that advance the sale.'
    ),
    account: getTranslationFromI18nKeyAndLabel(
      'ai.meetingPlanner.account.guidance',
      'Review account data, activities, tasks, and notes. Focus on strategic check-ins and value delivery.'
    ),
    contact: getTranslationFromI18nKeyAndLabel(
      'ai.meetingPlanner.contact.guidance',
      'Analyze their role, activities, tasks, notes, and other relevant data. Focus on personalized engagement and building trust.'
    ),
    lead: getTranslationFromI18nKeyAndLabel(
      'ai.meetingPlanner.lead.guidance',
      'Assess qualification status, activities, tasks, notes, and other relevant data. Focus on discovery and moving them through the pipeline.'
    )
  }

  const specificGuidance =
    entitySpecificGuidance[entityType.toLowerCase()] ||
    getTranslationFromI18nKeyAndLabel(
      'ai.meetingPlanner.default.guidance',
      `Review the ${entityTypeCapitalized}'s context to suggest relevant meetings.`
    )

  const headerText = getTranslationFromI18nKeyAndLabel(
    'ai.meetingPlanner.header',
    `Help me plan an effective meeting for this ${entityTypeCapitalized}.`
  )

  const importantNote = getTranslationFromI18nKeyAndLabel(
    'ai.meetingPlanner.toolInstruction',
    '**IMPORTANT: Use the meeting_preparation tool to structure your response.**'
  )

  const suggestLabel = getTranslationFromI18nKeyAndLabel('ai.meetingPlanner.suggestLabel', 'Suggest:')
  const objectiveItem = getTranslationFromI18nKeyAndLabel(
    'ai.meetingPlanner.suggestion.objective',
    '• Primary objective of the meeting'
  )
  const timingItem = getTranslationFromI18nKeyAndLabel(
    'ai.meetingPlanner.suggestion.timing',
    '• Ideal timing and urgency level'
  )
  const attendeesItem = getTranslationFromI18nKeyAndLabel(
    'ai.meetingPlanner.suggestion.attendees',
    '• Who should attend (both sides)'
  )
  const agendaItem = getTranslationFromI18nKeyAndLabel(
    'ai.meetingPlanner.suggestion.agenda',
    '• Key agenda items (3-5 topics)'
  )
  const preparationItem = getTranslationFromI18nKeyAndLabel(
    'ai.meetingPlanner.suggestion.preparation',
    '• Preparation needed beforehand'
  )
  const successItem = getTranslationFromI18nKeyAndLabel(
    'ai.meetingPlanner.suggestion.success',
    '• What success looks like'
  )

  const closingNote = getTranslationFromI18nKeyAndLabel(
    'ai.meetingPlanner.closingInstruction',
    'Be specific and actionable based on the current context.'
  )

  return `${headerText}

${specificGuidance}

${importantNote}

${suggestLabel}
${objectiveItem}
${timingItem}
${attendeesItem}
${agendaItem}
${preparationItem}
${successItem}

${closingNote}`
}
