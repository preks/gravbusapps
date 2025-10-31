import { useState } from 'react'

export interface SelectOption {
  id: string
  name: string
}

export interface TagCreationResult {
  createTag: (tagName: string) => Promise<SelectOption | null>
  isCreating: boolean
  error: Error | null
}

export const useTagCreation = (): TagCreationResult => {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createTag = async (tagName: string): Promise<SelectOption | null> => {
    if (!tagName.trim()) {
      return null
    }

    setIsCreating(true)
    setError(null)

    try {
      // TODO: Implement actual tag creation API call
      // const result = await fetch(...) or graphqlClient.request(...)

      // Temporary mock implementation
      const newTagOption: SelectOption = {
        id: `temp_${Date.now()}`,
        name: tagName.trim()
      }

      return newTagOption
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Tag creation failed'
      setError(err instanceof Error ? err : new Error(errorMessage))
      return null
    } finally {
      setIsCreating(false)
    }
  }

  return {
    createTag,
    isCreating,
    error
  }
}
