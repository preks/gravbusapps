/**
 * Utility functions for formatting plan data
 */

interface PlanTitleInput {
  userSummary?: { title?: string }
  originalPrompt?: string
}

/**
 * Generates a display title for a plan
 * Uses userSummary.title if available, falls back to truncated originalPrompt
 */
export function planTitle(plan: PlanTitleInput): string {
  const title = plan.userSummary?.title?.trim()
  if (title) return title
  const prompt = plan.originalPrompt?.trim() ?? ''
  return prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt || 'Untitled plan'
}
