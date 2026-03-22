import { useState, useCallback } from 'react'

interface PrintResult {
  success: boolean
  pdfUrl?: string
  error?: string
}

/**
 * Shared print-preview state and handler for expense tables.
 * `printFn` is the async function that generates the PDF (from a file service hook).
 */
export function usePrintPreview<T>(
  printFn: (item: T) => Promise<PrintResult>,
  isMounted: React.MutableRefObject<boolean>
) {
  const [modalOpen, setModalOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePrint = useCallback(
    async (item: T) => {
      setLoading(true)
      setModalOpen(true)
      try {
        const result = await printFn(item as never)
        if (result.success && result.pdfUrl && isMounted.current) {
          setPdfUrl(result.pdfUrl)
        } else if (!result.success) {
          console.error('Print error:', result.error)
        }
      } catch (err) {
        console.error('Print exception:', err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    },
    [printFn, isMounted]
  )

  const handleClose = useCallback(() => {
    setModalOpen(false)
    setPdfUrl('')
  }, [])

  return { modalOpen, pdfUrl, loading, handlePrint, handleClose }
}
