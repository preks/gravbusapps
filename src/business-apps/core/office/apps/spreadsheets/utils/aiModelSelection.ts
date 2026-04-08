/**
 * Single place that chooses Prompt Manager AI for the spreadsheet app.
 *
 * Picks model **openai/gpt-oss-120b** by name. If an AI service named **azure-openai** exists,
 * the model on that service is preferred; otherwise the first matching model (any service) is used.
 * This matches Flowbot-mounted Prompt Manager where service display names may differ.
 *
 * Callers: AI analyse menu (analyze / review / chat / formula), analytics insights & summary,
 * `useSpreadsheetAI`, collection Excel summary, RunSummarizeWithAI — all use `selectPreferredModel`.
 */
import type { PromptManagerClient, AIModelODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { getPromptManagerDocumentId } from './promptManagerModelId'

const PREFERRED_SERVICE_NAME = 'azure-openai'
const PREFERRED_MODEL = 'openai/gpt-oss-120b'

const MODEL_LIST_LIMIT = 200

function normalizeModelName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Resolve the only allowed Prompt Manager model for spreadsheet AI flows.
 */
export async function selectPreferredModel(promptClient: PromptManagerClient): Promise<AIModelODM> {
  const modelsResponse = await promptClient.getAiModels({
    limit: MODEL_LIST_LIMIT,
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

  const targetName = normalizeModelName(PREFERRED_MODEL)
  const byName = models.filter(m => normalizeModelName(m.name) === targetName)

  if (byName.length === 0) {
    throw new Error(
      `No AI model named "${PREFERRED_MODEL}" in the first ${MODEL_LIST_LIMIT} models. ` +
        'Register it in Prompt Manager or increase coverage if your tenant lists many models.'
    )
  }

  let preferredServiceId: string | undefined
  try {
    const servicesResponse = await promptClient.getAiServices({
      limit: 50,
      offset: 0,
      returnTotalRecords: false
    })
    preferredServiceId = getPromptManagerDocumentId(
      servicesResponse.data?.find(s => s.name.toLowerCase() === PREFERRED_SERVICE_NAME)
    )
  } catch {
    preferredServiceId = undefined
  }

  const onPreferredService =
    preferredServiceId !== undefined ? byName.find(m => m.service.id === preferredServiceId) : undefined

  const match = onPreferredService ?? byName[0]

  return assertModelId(match)
}
