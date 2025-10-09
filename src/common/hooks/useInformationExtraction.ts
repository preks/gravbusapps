import * as z from 'zod'
import { env } from '../env/EnvUtils'

import { useCallback, useMemo, useState } from 'react'

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

  // Memoise values that do not change between invocations of the returned function
  const endpointUrl = useMemo(
    () => `${env('NEXT_PUBLIC_BASE_URL')}/flowbot/information-extraction/extract_information`,
    []
  )
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

      const res = await fetch(endpointUrl, {
        method: 'POST',
        body: form,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`)

      // Validate the result against the response model
      const ExtractInformationResponse = z.object({
        extracted_data: responseModel
      })
      const result = ExtractInformationResponse.parse(await res.json())
      return result.extracted_data
    },
    [endpointUrl, llmModel, outputJsonSchema, responseModel, taskDescription]
  )

  const generateSummary = useCallback(async () => {
    setState({ type: 'loading' })

    // Fetch input data
    const inputData = await generateInputData()

    // Extract information
    try {
      const result = await extractInformation(inputData)
      setState({ type: 'success', content: result })
    } catch (e) {
      setState({ type: 'error' })
    }
  }, [extractInformation, generateInputData, setState])

  return { state, generateSummary }
}
