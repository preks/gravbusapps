/**
 * DebouncedResizeContainer - Delays iframe/content resize during panel drag.
 * During rapid resize (e.g. dragging the chat/canvas divider), the inner content
 * keeps its size until resize stops. Reduces expensive iframe reflows.
 */

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@newwork/nw-design-system'

const DEFAULT_DEBOUNCE_MS = 150

interface DebouncedResizeContainerProps {
  children: React.ReactNode
  className?: string
  debounceMs?: number
}

export const DebouncedResizeContainer: React.FC<DebouncedResizeContainerProps> = ({
  children,
  className,
  debounceMs = DEFAULT_DEBOUNCE_MS
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRef = useRef(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateSize = (width: number, height: number) => {
      if (isFirstRef.current) {
        isFirstRef.current = false
        setSize({ width, height })
      } else {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          setSize({ width, height })
          debounceRef.current = null
        }, debounceMs)
      }
    }

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      updateSize(width, height)
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [debounceMs])

  return (
    <div ref={containerRef} className={cn('gba:h-full gba:min-h-0 gba:relative gba:overflow-hidden', className)}>
      <div
        className="gba:absolute gba:left-0 gba:top-0"
        style={size ? { width: size.width, height: size.height } : { width: '100%', height: '100%' }}
      >
        {children}
      </div>
    </div>
  )
}
