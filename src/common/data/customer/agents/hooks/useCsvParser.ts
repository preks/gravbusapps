/**
 * CSV Parser Hook
 * Provides CSV parsing functionality with error handling
 */

import { useState, useCallback } from 'react'
import { ParsedRow } from '@/common/data/customer/agents/types'
import { parseCSV, validateCSVFile, readFileAsText } from '@/common/data/customer/agents/utils'

export interface UseCsvParserReturn {
  parseCSVFile: (file: File) => Promise<ParsedRow[]>
  parseCSVText: (text: string) => ParsedRow[]
  isValidCSV: (file: File) => { valid: boolean; error?: string }
  isParsing: boolean
  parseError: string | null
}

export function useCsvParser(): UseCsvParserReturn {
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const parseCSVFile = useCallback(async (file: File): Promise<ParsedRow[]> => {
    setIsParsing(true)
    setParseError(null)

    try {
      // Validate file
      const validation = validateCSVFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Read file as text
      const text = await readFileAsText(file)

      // Parse CSV
      const rows = parseCSV(text)

      return rows
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV'
      setParseError(errorMessage)
      throw error
    } finally {
      setIsParsing(false)
    }
  }, [])

  const parseCSVText = useCallback((text: string): ParsedRow[] => {
    try {
      setParseError(null)
      return parseCSV(text)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV'
      setParseError(errorMessage)
      throw error
    }
  }, [])

  const isValidCSV = useCallback((file: File) => {
    return validateCSVFile(file)
  }, [])

  return {
    parseCSVFile,
    parseCSVText,
    isValidCSV,
    isParsing,
    parseError
  }
}
