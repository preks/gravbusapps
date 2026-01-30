/**
 * Hook for AI-assisted task expert generation
 *
 * Uses the prompt-manager to generate task expert configurations
 * from natural language descriptions.
 */

import { useCallback, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { AgentType, ResponseStyle, CitationMode } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface GeneratedTaskExpert {
  name: string
  description: string
  systemContent: string
  userContent: string
  responseSchema: string | null
  // EveryAI specific
  specialty: string
  responseStyle: ResponseStyle
  citationMode: CitationMode
  tags: string[]
  // Tool recommendations
  recommendedTools: string[]
}

export interface UseTaskExpertAiGenerateState {
  isGenerating: boolean
  error: string | null
  result: GeneratedTaskExpert | null
}

const GENERATION_SYSTEM_PROMPT = `You are an expert AI prompt engineer. Your task is to create comprehensive task expert configurations based on user descriptions.

When given a description of what kind of AI expert the user wants to create, generate the following:

1. **name**: A concise, descriptive name for the expert (PascalCase, no spaces)
2. **description**: A brief description of what this expert does (1-2 sentences)
3. **systemContent**: A detailed system prompt that defines the expert's behavior, personality, and capabilities. Include:
   - Clear role definition
   - Expertise areas
   - Response guidelines
   - Constraints and limitations
   - Tone and style instructions
   - If tools are recommended, include instructions on when and how to use them
4. **userContent**: A user prompt template with curly-brace variable placeholders for dynamic input (e.g. use curly braces around variable names like "input" or "query"). The template should be flexible enough to handle various use cases.
5. **responseSchema**: If the expert should return structured JSON data, provide a JSON Schema definition. Set to null if text/conversational responses are preferred.
6. **specialty**: A short phrase describing the expert's specialty (for display in UI)
7. **responseStyle**: One of "formal", "conversational", or "technical"
8. **citationMode**: One of "always", "when_needed", or "never" based on whether the expert should cite sources
9. **tags**: An array of relevant tags for categorization (3-5 tags)
10. **recommendedTools**: An array of tool IDs that this expert should use (can be empty if no tools needed)

Consider the agent type when generating:
- **flow**: Focus on structured outputs, clear steps, process automation. Often uses tools.
- **everyai**: Focus on conversational ability, personality, engaging responses
- **general**: Balance between structured and conversational, versatile

For template variables in userContent and systemContent, use curly braces around variable names.
Common variable names to use: input, context, query, data, user_request, topic, language

## AVAILABLE INTERNAL TOOLS

The platform has internal tools that can create and update CRM entities. When the user's description involves CRM, sales, leads, contacts, accounts, or opportunities, recommend the appropriate tools:

### Lead Tools
- **create_lead**: Creates a new sales lead. Fields: firstName (required), lastName (required), email, phoneNumber, companyName, companyEmail, companyPhone, companyWebsite, jobPosition, leadStatusRef, leadSourceRef, leadRatingRef, description
- **update_lead**: Updates an existing lead. Requires id and version.

### Opportunity Tools  
- **create_opportunity**: Creates a new sales opportunity. Fields: name (required), opportunityPipelineRef (required), opportunityPipelineStageRef (required), accountId, estimatedAmount, currencyRef, closeDate, description
- **update_opportunity**: Updates an existing opportunity. Requires id and version.

### Contact Tools
- **create_contact**: Creates a new contact. Fields: firstName (required), lastName (required), email, jobPosition, department, description
- **update_contact**: Updates an existing contact. Requires id and version.

### Account Tools
- **create_account**: Creates a new account/company. Fields: name (required), website, description, industryClassRef
- **update_account**: Updates an existing account. Requires id and version.

### When to recommend tools:
- Lead capture/creation expert → recommend: create_lead
- Sales pipeline management → recommend: create_opportunity, update_opportunity
- Contact management → recommend: create_contact, update_contact
- Account management → recommend: create_account, update_account
- CRM data entry assistant → recommend: create_lead, create_contact, create_account, create_opportunity
- Lead qualification expert → recommend: update_lead (to update status/rating)

If recommending tools, include clear instructions in the systemContent about when to use each tool and what information to gather from the user before calling the tool.

Return your response as a valid JSON object with all the fields listed above.`

const GENERATION_USER_PROMPT = `Create a task expert configuration for the following request:

**Agent Type**: {agent_type}
**Description**: {user_description}

Generate a complete expert configuration as JSON.`

export const useTaskExpertAiGenerate = (context: BusinessAppContextProps) => {
  const client = usePromptManagerClient(context.accessToken)
  const [state, setState] = useState<UseTaskExpertAiGenerateState>({
    isGenerating: false,
    error: null,
    result: null
  })

  const generate = useCallback(
    async (userDescription: string, agentType: AgentType = 'flow'): Promise<GeneratedTaskExpert | null> => {
      if (!userDescription.trim()) {
        setState(prev => ({ ...prev, error: 'Please provide a description' }))
        return null
      }

      setState({ isGenerating: true, error: null, result: null })

      try {
        // Fetch available models to get a model_id
        const modelsResponse = await client.getAiModels({ limit: 10, offset: 0, returnTotalRecords: false })
        if (!modelsResponse.data || modelsResponse.data.length === 0) {
          throw new Error('No AI models available. Please configure AI models first.')
        }

        // Prefer a GPT-4 model if available, otherwise use the first model
        const preferredModel =
          modelsResponse.data.find(m => m.name.toLowerCase().includes('gpt-4')) || modelsResponse.data[0]
        const modelId = preferredModel._id

        if (!modelId) {
          throw new Error('No valid model ID found')
        }

        // Build the prompts
        const systemPrompt = GENERATION_SYSTEM_PROMPT
        const userPrompt = GENERATION_USER_PROMPT

        // User params for template variables
        const userParams = {
          agent_type: agentType,
          user_description: userDescription
        }

        // Create form data for execution
        const formData = new FormData()
        formData.append('model_id', modelId)
        formData.append('system_content', systemPrompt)
        formData.append('user_content', userPrompt)
        formData.append('user_params', JSON.stringify(userParams))
        formData.append('response_format', JSON.stringify({ type: 'json_object' }))

        const response = await client.executePrompt(formData)

        if (!response.content) {
          throw new Error('No content returned from AI')
        }

        // Parse the JSON response
        let parsed: GeneratedTaskExpert
        if (typeof response.content === 'string') {
          try {
            // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
            let jsonString = response.content.trim()
            if (jsonString.startsWith('```')) {
              // Remove opening ```json or ```
              jsonString = jsonString.replace(/^```(?:json)?\s*\n?/, '')
              // Remove closing ```
              jsonString = jsonString.replace(/\n?```\s*$/, '')
            }
            parsed = JSON.parse(jsonString)
          } catch {
            throw new Error('Failed to parse AI response as JSON')
          }
        } else {
          parsed = response.content as GeneratedTaskExpert
        }

        // Validate and normalize the response
        const result: GeneratedTaskExpert = {
          name: parsed.name || 'NewTaskExpert',
          description: parsed.description || '',
          systemContent: parsed.systemContent || '',
          userContent: parsed.userContent || '{input}',
          responseSchema:
            parsed.responseSchema && typeof parsed.responseSchema === 'object'
              ? JSON.stringify(parsed.responseSchema, null, 2)
              : parsed.responseSchema || null,
          specialty: parsed.specialty || '',
          responseStyle: validateResponseStyle(parsed.responseStyle),
          citationMode: validateCitationMode(parsed.citationMode),
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          recommendedTools: Array.isArray(parsed.recommendedTools) ? parsed.recommendedTools : []
        }

        setState({ isGenerating: false, error: null, result })
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate task expert'
        setState({ isGenerating: false, error: errorMessage, result: null })
        return null
      }
    },
    [client]
  )

  const reset = useCallback(() => {
    setState({ isGenerating: false, error: null, result: null })
  }, [])

  return {
    ...state,
    generate,
    reset
  }
}

// Helper functions for validation
function validateResponseStyle(style: string | undefined): ResponseStyle {
  if (style === 'formal' || style === 'conversational' || style === 'technical') {
    return style
  }
  return 'conversational'
}

function validateCitationMode(mode: string | undefined): CitationMode {
  if (mode === 'always' || mode === 'when_needed' || mode === 'never') {
    return mode
  }
  return 'when_needed'
}

export default useTaskExpertAiGenerate
