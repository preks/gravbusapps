import * as z from 'zod'
import useInformationExtraction, { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'

const taskDescription = `
You are a professional translator.
You receive a number of text snippets in different source languages and you translate them into the target language given by the user.
Provide only the translated text without explanations or additional formatting.
`
const summarySchema = z.object({
  translatedTexts: z.array(z.string()).describe('The translated text, in the order of the original text snippets')
})
type SummarySchema = z.infer<typeof summarySchema>
type UseAiTranslationReturn = UseInformationExtractionReturn<SummarySchema>

export function useAiTranslation(
  targetLanguage: string,
  inputTexts: string[],
  accessToken: string
): UseAiTranslationReturn {
  const generateInputData = async () => {
    return JSON.stringify({
      targetLanguage,
      inputTexts
    })
  }

  return useInformationExtraction(taskDescription, summarySchema, generateInputData, accessToken, 'gpt-4.1-mini')
}
