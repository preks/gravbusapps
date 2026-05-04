import { useEffect, useRef } from 'react'
import { FieldValues, useWatch, useFormContext, Path, PathValue } from 'react-hook-form'

interface CodeSuggestionWatcherProps<T extends FieldValues> {
  /** Whether to enable code suggestions (typically !isEditMode) */
  enabled: boolean
  /** Function that generates the suggested code based on watched values */
  generateCode: (watchedValues: Partial<T>) => string
  /** Array of field names to watch for changes */
  watchFields: (keyof T)[]
  /** Name of the field to update with the suggested code */
  codeFieldName: Path<T>
  /** Callback to update the suggested code in parent component */
  onCodeSuggested: (code: string) => void
}

/**
 * Component that watches form fields and suggests codes - must be rendered inside form context
 *
 * @example
 * // Inside form component:
 * const [suggestedCode, setSuggestedCode] = useState('')
 *
 * // Inside FormWrapperModal:
 * <CodeSuggestionWatcher<JobFunctionFormValues>
 *   enabled={!jobFunction}
 *   generateCode={(values) => values.jobFamily?.code || ''}
 *   watchFields={['jobFamily']}
 *   onCodeSuggested={setSuggestedCode}
 * />
 */
export function CodeSuggestionWatcher<T extends FieldValues>({
  enabled,
  generateCode,
  watchFields,
  codeFieldName,
  onCodeSuggested
}: CodeSuggestionWatcherProps<T>): null {
  const { setValue } = useFormContext<T>()
  const prevCodeRef = useRef<string>('')

  // Always pass the array form — useWatch returns values in the same order as the names array
  const watchedValues = useWatch<T>({ name: watchFields as any }) as unknown[]

  useEffect(() => {
    if (!enabled) {
      if (prevCodeRef.current !== '') {
        prevCodeRef.current = ''
        onCodeSuggested('')
      }
      return
    }

    const valuesObject = Object.fromEntries(watchFields.map((field, i) => [field, watchedValues[i]])) as Partial<T>
    const newSuggestedCode = generateCode(valuesObject)

    // Skip if the generated code hasn't changed — useWatch may return a new array
    // reference when unrelated form state updates (e.g. validation errors on other
    // fields), which would otherwise re-trigger setValue in an infinite loop.
    if (newSuggestedCode === prevCodeRef.current) return

    prevCodeRef.current = newSuggestedCode
    onCodeSuggested(newSuggestedCode)

    // Update the form field directly with the suggested code
    if (newSuggestedCode) {
      setValue(codeFieldName, newSuggestedCode as PathValue<T, Path<T>>, { shouldValidate: true, shouldDirty: true })
    }
  }, [enabled, generateCode, watchedValues, watchFields, onCodeSuggested, codeFieldName, setValue])

  return null
}
