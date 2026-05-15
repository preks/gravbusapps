import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

interface UseFloatingPanelOptions {
  isOpen: boolean
  onClose: () => void
  onMeasure: (panelEl: HTMLDivElement | null, triggerEl: HTMLButtonElement) => void
  measureDeps?: readonly unknown[]
}

interface UseFloatingPanelResult {
  triggerRef: (element: HTMLButtonElement | null) => void
  panelRef: (element: HTMLDivElement | null) => void
  measure: () => void
}

export function useFloatingPanel({
  isOpen,
  onClose,
  onMeasure,
  measureDeps = []
}: UseFloatingPanelOptions): UseFloatingPanelResult {
  const triggerElementRef = useRef<HTMLButtonElement | null>(null)
  const panelElementRef = useRef<HTMLDivElement | null>(null)

  const triggerRef = useCallback((element: HTMLButtonElement | null) => {
    triggerElementRef.current = element
  }, [])

  const panelRef = useCallback((element: HTMLDivElement | null) => {
    panelElementRef.current = element
  }, [])

  const measure = useCallback(() => {
    if (triggerElementRef.current) {
      onMeasure(panelElementRef.current, triggerElementRef.current)
    }
  }, [onMeasure])

  useLayoutEffect(() => {
    if (isOpen) {
      measure()
    }
  }, [isOpen, measure, ...measureDeps])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (
        triggerElementRef.current?.contains(event.target as Node) ||
        panelElementRef.current?.contains(event.target as Node)
      ) {
        return
      }

      onClose()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', measure, { capture: true, passive: true })
    window.addEventListener('resize', measure, { passive: true })

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', measure, { capture: true })
      window.removeEventListener('resize', measure)
    }
  }, [isOpen, measure, onClose])

  return {
    triggerRef,
    panelRef,
    measure
  }
}
