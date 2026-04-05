/**
 * Single place that chooses Prompt Manager AI for the spreadsheet app.
 *
 * Requirement: every spreadsheet feature that calls Prompt Manager `execute` must use
 * service **azure-openai** and model **gpt-oss-120b** (model `name` must match the Azure deployment name).
 *
 * Callers: AI analyse menu (analyze / review / chat / formula), analytics insights & summary,
 * `useSpreadsheetAI`, collection Excel summary, RunSummarizeWithAI — all use `selectPreferredModel`.
 */
import type { PromptManagerClient, AIModelODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { getPromptManagerDocumentId } from './promptManagerModelId'

const PREFERRED_SERVICE = 'azure-openai'
const PREFERRED_MODEL = 'gpt-oss-120b'

/**
 * Resolve the only allowed Prompt Manager model for spreadsheet AI flows.
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

  const assertModelId = (model: AIModelODM): AIModelODM => {
    if (!getPromptManagerDocumentId(model)) {
      throw new Error('Prompt Manager returned a model without a document id')
    }
    return model
  }

  let preferredServiceId: string | undefined
  try {
    const servicesResponse = await promptClient.getAiServices({
      limit: 20,
      offset: 0,
      returnTotalRecords: false
    })
    preferredServiceId = getPromptManagerDocumentId(
      servicesResponse.data?.find(s => s.name.toLowerCase() === PREFERRED_SERVICE)
    )
  } catch {
    // handled below
  }

  if (!preferredServiceId) {
    throw new Error(
      `AI service "${PREFERRED_SERVICE}" not found. Check Prompt Manager /ai-services/ and that you are authenticated.`
    )
  }

  const match = models.find(m => m.service.id === preferredServiceId && m.name.toLowerCase() === PREFERRED_MODEL)

  if (!match) {
    throw new Error(
      `No AI model "${PREFERRED_MODEL}" on service "${PREFERRED_SERVICE}". Register it in Prompt Manager under that service (deployment name must match Azure).`
    )
  }

  return assertModelId(match)
}
