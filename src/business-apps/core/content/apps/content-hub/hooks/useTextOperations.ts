import { useCallback } from 'react'
import { UseFormSetValue, FieldValues } from 'react-hook-form'

export type TextOperation = 'formalize' | 'translate' | 'shorten'

export const useTextOperations = <TFieldValues extends FieldValues>() => {
  const processTextOperation = useCallback(
    (
      operation: TextOperation,
      content: string,
      setValue: UseFormSetValue<TFieldValues>,
      setLoadingState: React.Dispatch<React.SetStateAction<boolean>>
    ): void => {
      if (!content) {
        return
      }

      setLoadingState(true)

      // TODO: Implement actual text operation API call
      // For now, just set loading to false after delay
      setTimeout(() => {
        setLoadingState(false)
      }, 1000)
    },
    []
  )

  const formalize = useCallback(
    (
      content: string,
      setValue: UseFormSetValue<TFieldValues>,
      setLoadingState: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
      return processTextOperation('formalize', content, setValue, setLoadingState)
    },
    [processTextOperation]
  )

  const translate = useCallback(
    (
      content: string,
      setValue: UseFormSetValue<TFieldValues>,
      setLoadingState: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
      return processTextOperation('translate', content, setValue, setLoadingState)
    },
    [processTextOperation]
  )

  const shorten = useCallback(
    (
      content: string,
      setValue: UseFormSetValue<TFieldValues>,
      setLoadingState: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
      return processTextOperation('shorten', content, setValue, setLoadingState)
    },
    [processTextOperation]
  )

  return {
    processTextOperation,
    formalize,
    translate,
    shorten
  }
}
