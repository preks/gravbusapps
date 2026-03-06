import type { Dispatch, SetStateAction } from 'react'

interface RunOptimisticLabelMutationOptions<T> {
  previousLabels: T[]
  setLocalLabels: Dispatch<SetStateAction<T[]>>
  setIsMutating: Dispatch<SetStateAction<boolean>>
  getOptimisticLabels: (previous: T[]) => T[]
  mutate: () => Promise<T[]>
  onSuccess?: (labels: T[]) => void | Promise<void>
  onError?: () => void | Promise<void>
}

export async function runOptimisticLabelMutation<T>({
  previousLabels,
  setLocalLabels,
  setIsMutating,
  getOptimisticLabels,
  mutate,
  onSuccess,
  onError
}: RunOptimisticLabelMutationOptions<T>): Promise<boolean> {
  const optimistic = getOptimisticLabels(previousLabels)
  setLocalLabels(optimistic)
  setIsMutating(true)

  try {
    const updatedLabels = await mutate()
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
