/**
 * Builds an optimized AI prompt for workflow/flow generation.
 * Provides guidance to help the AI generate relevant and actionable workflow designs.
 *
 * @param userDescription - The user's description of the workflow they want to create
 * @returns A prompt string optimized for workflow template generation
 */
export function buildFlowGenerationPrompt(userDescription: string): string {
  return `Create a workflow template for: ${userDescription}

Required elements:
1. Process steps with clear sequence
2. Approval gates and decision points
3. Participant roles and responsibilities
4. Conditional logic and branching rules
5. Data fields and form inputs

Generate a complete workflow template definition for Flow Creator.`
}
