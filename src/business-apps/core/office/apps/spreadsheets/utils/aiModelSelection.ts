import type { PromptManagerClient, AIModelODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

const PREFERRED_SERVICE = 'azure-openai'
const PREFERRED_MODEL = 'gpt-4o'

/**
 * Select the best AI model from the Prompt Manager.
 *
 * Priority:
 *   1. Model matching PREFERRED_MODEL on the PREFERRED_SERVICE (azure-openai / gpt-4o)
 *   2. Any model whose name includes "gpt-4"
 *   3. First available model
 */
export async function selectPreferredModel(promptClient: PromptManagerClient): Promise<AIModelODM> {
  const modelsResponse = await promptClient.getAiModels({
    limit: 20,
    offset: 0,
    returnTotalRecords: false
  })

  const models = modelsResponse.data
  if (!models?.length) {
    throw new Error('No AI models available')
  }

  let preferredServiceId: string | undefined
  try {
    const servicesResponse = await promptClient.getAiServices({
      limit: 20,
      offset: 0,
      returnTotalRecords: false
    })
    preferredServiceId = servicesResponse.data?.find(s => s.name.toLowerCase() === PREFERRED_SERVICE)?._id
  } catch {
    // Services endpoint unavailable — fall through to name-only matching
  }

  if (preferredServiceId) {
    const match = models.find(m => m.name.toLowerCase() === PREFERRED_MODEL && m.service.id === preferredServiceId)
    if (match) return match
  }

  const gpt4Model = models.find(m => m.name.toLowerCase().includes('gpt-4'))
  if (gpt4Model) return gpt4Model

  return models[0]
}
