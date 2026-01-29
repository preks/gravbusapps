/**
 * TransformService
 * Handles AI-powered transformations of handwritten notes via OCR
 */

import { DrawingApiService } from './DrawingApiService'
import type { StrokeData } from '../components/handwriting'
import type { TransformType } from '../components/handwriting/TransformMenu'
import type { TranslationLanguage } from '../types/translation'
import { TRANSLATION_LANGUAGE_NAMES } from '../types/translation'
import { getStroke } from 'perfect-freehand'
import { env } from '@/common/env/EnvUtils'

interface TransformResult {
  success: boolean
  transformedContent: string
  /** For action-items transform, contains the array of action items */
  actionItems?: string[]
  error?: string
}

export interface TransformOptions {
  targetLanguage?: TranslationLanguage
}

// Convert stroke points to SVG path
function getSvgPathFromStroke(stroke: number[][]): string {
  if (stroke.length < 2) return ''

  const d: string[] = []
  let [p0, p1] = stroke

  d.push(`M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`)

  for (let i = 1; i < stroke.length; i++) {
    const midPoint = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]
    d.push(`Q ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} ${midPoint[0].toFixed(2)} ${midPoint[1].toFixed(2)}`)
    p0 = p1
    p1 = stroke[i]
  }

  d.push(`L ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`)

  return d.join(' ')
}

// Convert strokes to SVG
function strokesToSvg(strokes: StrokeData[], width: number, height: number): string {
  const paths = strokes
    .map(stroke => {
      const strokePoints = stroke.points.map(p => [p.x, p.y, p.pressure || 0.5])
      const outlinePoints = getStroke(strokePoints, {
        size: stroke.width * 2,
        thinning: 0.4,
        smoothing: 0.6,
        streamline: 0.6
      })

      if (outlinePoints.length < 2) return ''

      const pathD = getSvgPathFromStroke(outlinePoints)
      return `<path d="${pathD}" fill="${stroke.color}" />`
    })
    .filter(Boolean)
    .join('\n    ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#fffef8"/>
    ${paths}
  </svg>`
}

export class TransformService {
  private accessToken: string
  private drawingService: DrawingApiService

  constructor(accessToken: string) {
    this.accessToken = accessToken
    this.drawingService = new DrawingApiService(accessToken)
  }

  /**
   * Call AI information extraction API
   */
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

  async transform(
    noteId: string,
    type: TransformType,
    strokes: StrokeData[],
    width: number,
    height: number,
    options?: TransformOptions
  ): Promise<TransformResult> {
    if (strokes.length === 0) {
      return {
        success: false,
        transformedContent: '',
        error: 'No handwriting to transform'
      }
    }

    console.log(`[TransformService] Triggering OCR for ${strokes.length} strokes`)

    try {
      // Combine all strokes into a single SVG
      const svgData = strokesToSvg(strokes, width, height)

      // Send to backend for OCR
      const result = await this.drawingService.createDrawing({
        entityType: 'note',
        entityId: noteId,
        svgData,
        strokeData: {
          points: strokes.flatMap(s => s.points),
          color: strokes[0]?.color || '#000000',
          width: strokes[0]?.width || 4
        },
        width,
        height,
        strokeCount: strokes.length,
        metadata: { transformType: type }
      })

      // Check if OCR was performed
      let extractedText = result.ocrText || ''

      // If no OCR text, trigger OCR manually
      if (!extractedText && result.id) {
        console.log('[TransformService] OCR not in response, triggering manually...')
        try {
          const ocrResult = await this.drawingService.triggerOcr(result.id)
          extractedText = ocrResult.ocrText || ''
          console.log(`[TransformService] OCR extracted: ${extractedText.slice(0, 50)}...`)
        } catch (ocrError) {
          console.error('[TransformService] OCR trigger failed:', ocrError)

          // Provide helpful error message
          const errorMessage = ocrError instanceof Error ? ocrError.message : 'OCR failed'
          if (errorMessage.includes('OpenAI API key not configured')) {
            return {
              success: false,
              transformedContent: '',
              error: 'OCR service not configured. Please contact administrator to set up OpenAI API key.'
            }
          }

          return {
            success: false,
            transformedContent: '',
            error: `OCR failed: ${errorMessage}`
          }
        }
      }

      if (!extractedText) {
        return {
          success: false,
          transformedContent: '',
          error: 'No text found in drawing'
        }
      }

      // Process based on transform type
      // Simple transforms (copy-text, to-text, create-text-note) just return OCR text
      if (type === 'copy-text' || type === 'to-text' || type === 'create-text-note') {
        return {
          success: true,
          transformedContent: extractedText
        }
      }

      // AI-powered transforms
      try {
        let aiResult: unknown

        switch (type) {
          case 'summarize': {
            const summarySchema = {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'A concise summary of the handwritten content'
                }
              },
              required: ['summary']
            }

            const taskDescription = `You are an assistant that summarizes handwritten notes. 
Provide a concise, well-structured summary of the content. 
Focus on key points, main ideas, and important details.`

            aiResult = await this.callAiService(taskDescription, extractedText, summarySchema)
            const summary = (aiResult as { summary: string }).summary
            return {
              success: true,
              transformedContent: summary
            }
          }

          case 'action-items': {
            const actionItemsSchema = {
              type: 'object',
              properties: {
                actionItems: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of actionable tasks or to-dos extracted from the content'
                }
              },
              required: ['actionItems']
            }

            const taskDescription = `You are an assistant that extracts action items and tasks from handwritten notes.
Identify all actionable items, to-dos, tasks, and things that need to be done.
Each action item should be a clear, actionable statement.
Return them as a list. If no action items are found, return an empty array.`

            aiResult = await this.callAiService(taskDescription, extractedText, actionItemsSchema)
            const actionItems = (aiResult as { actionItems: string[] }).actionItems
            const formattedItems =
              actionItems.length > 0
                ? actionItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
                : 'No action items found in the note.'
            return {
              success: true,
              transformedContent: formattedItems,
              actionItems // Return the raw array for modal usage
            }
          }

          case 'translate': {
            const targetLang = options?.targetLanguage || 'en'
            const targetLangName = TRANSLATION_LANGUAGE_NAMES[targetLang] || 'English'

            const translationSchema = {
              type: 'object',
              properties: {
                translatedText: {
                  type: 'string',
                  description: `The text translated to ${targetLangName}`
                }
              },
              required: ['translatedText']
            }

            const taskDescription = `You are a professional translator.
Translate the following text to ${targetLangName}. 
If the text is already in ${targetLangName}, return it as-is.
Provide only the translated text without explanations or additional formatting.`

            aiResult = await this.callAiService(taskDescription, extractedText, translationSchema)
            const translatedText = (aiResult as { translatedText: string }).translatedText
            return {
              success: true,
              transformedContent: translatedText
            }
          }

          default:
            // Fallback to raw OCR text
            return {
              success: true,
              transformedContent: extractedText
            }
        }
      } catch (aiError) {
        console.error('[TransformService] AI transformation failed:', aiError)
        const errorMessage = aiError instanceof Error ? aiError.message : 'AI transformation failed'

        // If AI fails, return OCR text as fallback for some transforms
        if (type === 'summarize' || type === 'action-items' || type === 'translate') {
          return {
            success: false,
            transformedContent: '',
            error: `AI transformation failed: ${errorMessage}. Please try again or use "Copy as Text" to get the raw OCR result.`
          }
        }

        return {
          success: false,
          transformedContent: '',
          error: `Transform failed: ${errorMessage}`
        }
      }
    } catch (error) {
      console.error('[TransformService] Transform failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        transformedContent: '',
        error: `Transform failed: ${errorMessage}`
      }
    }
  }
}
