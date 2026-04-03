import * as z from 'zod'
import { useCallback, useMemo, useState } from 'react'
import { useRestClient } from '../network/rest/useRestClient'

type AvailableLlmModels = 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4o-mini'

export type InformationExtractionState<T> =
  | {
      type: 'loading'
    }
  | {
      type: 'error'
    }
  | {
      type: 'success'
      content: T
    }

export type UseInformationExtractionReturn<T> = {
  state: InformationExtractionState<T> | null
  generateSummary: () => Promise<void>
}

/**
 * React hook that prepares and memoises the information-extraction request.
 *
 * The costly parts – endpoint URL construction and Zod → JSON-schema conversion –
 * are memoised so they are executed only when one of the dependencies changes.
 *
 * Usage:
 * const extractInformation = useInformationExtraction(taskDescription, responseModel);
 * const result = await extractInformation(inputText);
 */
export default function useInformationExtraction<T>(
  taskDescription: string,
  responseModel: z.ZodType<T>,
  generateInputData: () => Promise<string>,
  accessToken: string,
  llmModel: AvailableLlmModels = 'gpt-4.1'
): UseInformationExtractionReturn<T> {
  const [state, setState] = useState<InformationExtractionState<T> | null>(null)
  const restClient = useRestClient()

  // Memoise values that do not change between invocations of the returned function
  const endpointPath = useMemo(() => '/flowbot/information-extraction/extract_information', [])
  const outputJsonSchema = useMemo(() => z.toJSONSchema(responseModel), [responseModel])

  /**
   * Memoised function that sends the extraction request.
   * Only the `inputData` argument is required by consumers.
   */
  const extractInformation = useCallback(
    async (inputData: string): Promise<T> => {
      const form = new FormData()
      form.append('task_description', taskDescription)
      form.append('output_json_schema_string', JSON.stringify(outputJsonSchema))
      if (inputData !== undefined) form.append('input_data', inputData)
      // ⬇ files intentionally left out
      form.append('llm_model', llmModel)

      const response = await restClient.post(endpointPath, form, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      // Validate the result against the response model
      const ExtractInformationResponse = z.object({
        extracted_data: responseModel
      })
      const result = ExtractInformationResponse.parse(response)
      return result.extracted_data
    },
    [endpointPath, llmModel, outputJsonSchema, responseModel, taskDescription, accessToken, restClient]
  )

  const generateSummary = useCallback(async () => {
    setState({ type: 'loading' })

    // Fetch input data
    const inputData = await generateInputData()

    // Extract information
    try {
      const result = await extractInformation(inputData)
      setState({ type: 'success', content: result })
    } catch (error) {
      console.error('Error extracting information:', error)
      setState({ type: 'error' })
    }
  }, [extractInformation, generateInputData, setState])

  return { state, generateSummary }
}
