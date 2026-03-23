import { useCallback, useEffect, useState, type MutableRefObject } from 'react'

export interface UsePagedDocumentChromeMetricsResult {
  measuredHeaderHeight: number
  setHeaderChromeNode: (node: HTMLDivElement | null) => void
}

export function usePagedDocumentChromeMetrics(
  editorChromeRef: MutableRefObject<HTMLDivElement | null>
): UsePagedDocumentChromeMetricsResult {
  const [headerChromeNode, setHeaderChromeNodeState] = useState<HTMLDivElement | null>(null)
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(0)

  const setHeaderChromeNode = useCallback(
    (node: HTMLDivElement | null) => {
      setHeaderChromeNodeState(node)
      editorChromeRef.current = node
    },
    [editorChromeRef]
  )

  useEffect(() => {
    if (!headerChromeNode) return

    const measure = () => {
      const rect = headerChromeNode.getBoundingClientRect()
      setMeasuredHeaderHeight(rect.bottom)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(headerChromeNode)
    return () => observer.disconnect()
  }, [headerChromeNode])

  return {
    measuredHeaderHeight,
    setHeaderChromeNode
  }
}
