/**
 * Builds an optimized AI summary prompt for different entity types.
 * Provides entity-specific guidance to help the AI generate more relevant and actionable insights.
 *
 * @param entityType - The entity type (e.g., "opportunity", "account", "contact", "lead", "investment")
 * @returns A comprehensive prompt string optimized for the entity type
 */
export function buildAiSummaryPrompt(entityType: string): string {
  const entityTypeCapitalized = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  // Entity-specific prompt enhancements
  const entitySpecificGuidance: Record<string, string> = {
    opportunity: `Analyze the sales stage, probability, expected close date, and deal value. Review related activities, competitor information, and decision-making factors.`,
    account: `Examine company details, industry, size, and relationship history. Review associated contacts, opportunities, and account health indicators.`,
    contact: `Review contact role, communication history, influence level, and relationship strength. Analyze engagement patterns and preferred communication methods.`,
    lead: `Assess lead quality, source, conversion potential, and engagement level. Review qualification status, interests, and next steps in the sales process.`,
    investment: `Evaluate investment performance, portfolio allocation, risk factors, and market conditions. Review historical trends and future outlook.`
  }

  const specificGuidance =
    entitySpecificGuidance[entityType.toLowerCase()] ||
    `Review key attributes, status, and important details specific to this ${entityTypeCapitalized}.`

  return `Provide a comprehensive analysis of this ${entityTypeCapitalized}. 

${specificGuidance}

Include in your analysis:
- Current status and key details
- Recent activities and important updates
- Relationships and connections to other entities
- Potential risks or opportunities
- Recommended next steps or actions

Focus on actionable insights that help understand the ${entityTypeCapitalized}'s current state and what should be prioritized.`
}
