/**
 * Builds an optimized AI summary prompt for different entity types.
 * Provides entity-specific guidance to help the AI generate more relevant and actionable insights.
 *
 * @param entityType - The entity type (e.g., "opportunity", "account", "contact", "lead", "investment", "investment-account", etc.)
 * @returns A comprehensive prompt string optimized for the entity type
 */
export function buildAiSummaryPrompt(entityType: string): string {
  const entityTypeNormalized = entityType.toLowerCase()
  const isInvestmentContext = entityTypeNormalized.startsWith('investment-')
  const baseEntityType = isInvestmentContext ? entityTypeNormalized.replace('investment-', '') : entityTypeNormalized

  // Determine display name
  let displayName: string
  if (entityTypeNormalized === 'investment') {
    displayName = 'Investment'
  } else if (isInvestmentContext) {
    displayName = `Investment ${baseEntityType.charAt(0).toUpperCase() + baseEntityType.slice(1)}`
  } else {
    displayName = entityType.charAt(0).toUpperCase() + entityType.slice(1)
  }

  // Entity-specific prompt enhancements for CRM
  const crmGuidance: Record<string, string> = {
    opportunity: `Analyze the sales stage, probability, expected close date, and deal value. Review related activities, competitor information, and decision-making factors.`,
    account: `Examine company details, industry, size, and relationship history. Review associated contacts, opportunities, and account health indicators.`,
    contact: `Review contact role, communication history, influence level, and relationship strength. Analyze engagement patterns and preferred communication methods.`,
    lead: `Assess lead quality, source, conversion potential, and engagement level. Review qualification status, interests, and next steps in the sales process.`
  }

  // Entity-specific prompt enhancements for IRM (Investment Relationship Management)
  const irmGuidance: Record<string, string> = {
    opportunity: `Analyze this investment deal's stage, deal type (acquisition/divestment), valuation, and expected close date. Review investment thesis, due diligence progress, risk factors, and key decision points. Consider market conditions and strategic fit.`,
    account: `Examine this investment portfolio company's financial performance, governance structure, ownership stake, and relationship history. Review investment returns, strategic initiatives, and stakeholder relationships. Assess portfolio company health and value creation opportunities.`,
    contact: `Review this investment stakeholder's role (e.g., founder, board member, investor), influence level, and engagement history. Analyze their impact on investment decisions, communication patterns, and relationship strength with the investment team.`,
    lead: `Assess this investment opportunity lead's potential, deal source, sector fit, and initial interest level. Review preliminary financials, strategic rationale, and qualification status. Identify key evaluation criteria and next steps in the investment pipeline.`
  }

  // Standalone investment entity guidance
  const investmentGuidance = `Evaluate investment performance, asset allocation, risk profile, and market positioning. Review portfolio composition, historical returns, and future outlook. Assess alignment with investment strategy and rebalancing needs.`

  // Select appropriate guidance
  let specificGuidance: string
  if (entityTypeNormalized === 'investment') {
    specificGuidance = investmentGuidance
  } else if (isInvestmentContext) {
    specificGuidance =
      irmGuidance[baseEntityType] ||
      `Review key investment-related attributes, status, and important details specific to this ${displayName}.`
  } else {
    specificGuidance =
      crmGuidance[baseEntityType] ||
      `Review key attributes, status, and important details specific to this ${displayName}.`
  }

  return `Provide a comprehensive analysis of this ${displayName}. 

${specificGuidance}

Include in your analysis:
- Current status and key details
- Recent activities and important updates
- Relationships and connections to other entities
- Potential risks or opportunities
- Recommended next steps or actions

Focus on actionable insights that help understand the ${displayName}'s current state and what should be prioritized.`
}
