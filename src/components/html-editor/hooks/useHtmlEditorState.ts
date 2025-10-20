import { useState, useEffect, useRef } from 'react'
import { EditorElement } from '../types'
import { parseHtmlToElements, elementsToHtml } from '../utils/htmlParser'

interface UseHtmlEditorStateProps {
  value: string
  onChange: (html: string) => void
}

export const useHtmlEditorState = ({ value, onChange }: UseHtmlEditorStateProps) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('visual')
  const [elements, setElements] = useState<EditorElement[]>([])
  const [codeValue, setCodeValue] = useState(value)
  const [error, setError] = useState<string | null>(null)

  // Track last synced HTML to avoid expensive elementsToHtml calls
  const lastSyncedHtmlRef = useRef<string>(value)
  // Track if user is actively editing to prevent overwriting their changes
  const isEditingRef = useRef(false)

  // Parse HTML to elements on mount or when switching to visual mode
  useEffect(() => {
    if (activeTab === 'visual' && value !== lastSyncedHtmlRef.current) {
      try {
        const parsed = parseHtmlToElements(value)
        setElements(parsed)
        lastSyncedHtmlRef.current = value
        setError(null)
      } catch {
        setError('Failed to parse HTML. Please check the code view.')
      }
    }
  }, [activeTab, value])

  // Sync code value with prop value, but only when not actively editing
  useEffect(() => {
    if (!isEditingRef.current && value !== codeValue) {
      setCodeValue(value)
    }
  }, [value, codeValue])

  const handleCodeChange = (newCode: string) => {
    isEditingRef.current = true
    setCodeValue(newCode)
    onChange(newCode)
  }

  const handleHtmlChange = (html: string) => {
    setCodeValue(html)
    lastSyncedHtmlRef.current = html
    onChange(html)
  }

  const handleTabChange = (newTab: string) => {
    try {
      if (newTab === 'code' && activeTab === 'visual') {
        // Switching FROM visual TO code: sync elements to code
        const html = elementsToHtml(elements)
        setCodeValue(html)
        lastSyncedHtmlRef.current = html
      } else if (newTab === 'visual' && activeTab === 'code') {
        // Switching FROM code TO visual: sync code to elements
        const parsedElements = parseHtmlToElements(codeValue)
        setElements(parsedElements)
        lastSyncedHtmlRef.current = codeValue
      }
    } catch (err) {
      console.error('Failed to sync editor content:', err)
      setError('Failed to sync content between tabs. Please check your HTML.')
      return // Don't switch tabs on error
    }
    // Clear editing flag when switching tabs
    isEditingRef.current = false
    setActiveTab(newTab as 'visual' | 'code' | 'preview')
  }

  return {
    activeTab,
    elements,
    setElements,
    codeValue,
    error,
    handleCodeChange,
    handleHtmlChange,
    handleTabChange
  }
}
