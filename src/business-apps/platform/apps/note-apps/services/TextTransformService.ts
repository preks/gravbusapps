import { env } from '@/common/env/EnvUtils'
import type { TransformType } from '../components/handwriting/TransformMenu'
import type { TranslationLanguage } from '../types/translation'
import { TRANSLATION_LANGUAGE_NAMES } from '../types/translation'

interface TransformResult {
  success: boolean
  transformedContent: string
  actionItems?: string[]
  error?: string
}

export interface TransformOptions {
  targetLanguage?: TranslationLanguage
}

export class TextTransformService {
  constructor(private accessToken: string) {}

  private async callAiService(
    taskDescription: string,
    inputText: string,
    outputSchema: Record<string, unknown>,
    llmModel: 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4o-mini' = 'gpt-4.1'
  ): Promise<unknown> {
    const endpointUrl = `${env('NEXT_PUBLIC_BASE_URL')}/flowbot/information-extraction/extract_information`

    const form = new FormData()
    form.append('task_description', taskDescription)
    form.append('output_json_schema_string', JSON.stringify(outputSchema))
    form.append('input_data', inputText)
    form.append('llm_model', llmModel)

    const res = await fetch(endpointUrl, {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!res.ok) {
      throw new Error(`AI service request failed: ${res.status} ${res.statusText}`)
    }

    const result = await res.json()
    return result.extracted_data
  }

  async transform(type: TransformType, text: string, options?: TransformOptions): Promise<TransformResult> {
    const input = (text || '').trim()
    if (!input) {
      return { success: false, transformedContent: '', error: 'No text to transform' }
    }

    // Non-AI transforms
    if (type === 'copy-text' || type === 'to-text' || type === 'create-text-note') {
      return { success: true, transformedContent: input }
    }

    try {
      switch (type) {
        case 'summarize': {
          const summarySchema = {
            type: 'object',
            properties: {
              summary: { type: 'string', description: 'A concise summary of the content' }
            },
            required: ['summary']
          }
          const taskDescription = `You are an assistant that summarizes notes.\nProvide a concise, well-structured summary.\nFocus on key points, main ideas, and important details.`
          const aiResult = await this.callAiService(taskDescription, input, summarySchema)
          return { success: true, transformedContent: (aiResult as { summary: string }).summary }
        }

        case 'action-items': {
          const actionItemsSchema = {
            type: 'object',
            properties: {
              actionItems: { type: 'array', items: { type: 'string' } }
            },
            required: ['actionItems']
          }
          const taskDescription = `You are an assistant that extracts action items and tasks from notes.\nIdentify actionable items and return them as a list. If none, return an empty array.`
          const aiResult = await this.callAiService(taskDescription, input, actionItemsSchema)
          const actionItems = (aiResult as { actionItems: string[] }).actionItems
          const formatted =
            actionItems.length > 0
              ? actionItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
              : 'No action items found.'
          return { success: true, transformedContent: formatted, actionItems }
        }

        case 'translate': {
          const targetLang = options?.targetLanguage || 'en'
          const targetLangName = TRANSLATION_LANGUAGE_NAMES[targetLang] || 'English'

          const translationSchema = {
            type: 'object',
            properties: { translatedText: { type: 'string' } },
            required: ['translatedText']
          }
          const taskDescription = `You are a professional translator.\nTranslate the following text to ${targetLangName}.\nIf already in ${targetLangName}, return as-is.\nProvide only the translated text without any explanation or commentary.`
          const aiResult = await this.callAiService(taskDescription, input, translationSchema)
          return { success: true, transformedContent: (aiResult as { translatedText: string }).translatedText }
        }

        default:
          return { success: true, transformedContent: input }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI transform failed'
      return { success: false, transformedContent: '', error: msg }
    }
  }
}
