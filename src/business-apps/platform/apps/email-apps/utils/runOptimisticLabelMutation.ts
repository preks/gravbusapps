import { normalizeLabels } from './labelUtils'
import type { Dispatch, SetStateAction } from 'react'

interface RunOptimisticLabelMutationOptions {
  previousLabels: string[]
  setLocalLabels: Dispatch<SetStateAction<string[]>>
  setIsMutating: Dispatch<SetStateAction<boolean>>
  getOptimisticLabels: (previous: string[]) => string[]
  mutate: () => Promise<string[]>
  onSuccess?: (labels: string[]) => void | Promise<void>
  onError?: () => void | Promise<void>
}

export async function runOptimisticLabelMutation({
  previousLabels,
  setLocalLabels,
  setIsMutating,
  getOptimisticLabels,
  mutate,
  onSuccess,
  onError
}: RunOptimisticLabelMutationOptions): Promise<boolean> {
  const optimistic = normalizeLabels(getOptimisticLabels(previousLabels))
  setLocalLabels(optimistic)
  setIsMutating(true)

  try {
    const updatedLabels = normalizeLabels(await mutate())
    setLocalLabels(updatedLabels)
    await onSuccess?.(updatedLabels)
    return true
  } catch {
    setLocalLabels(previousLabels)
    await onError?.()
    return false
  } finally {
    setIsMutating(false)
  }
}
