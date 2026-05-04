import { useCallback, useEffect, useRef, useState } from 'react'

export interface SkillToastState {
  message: string
  variant: 'success' | 'error'
}

export function useSkillToast(duration = 4000) {
  const [toast, setToast] = useState<SkillToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const showToast = useCallback(
    (message: string, variant: 'success' | 'error' = 'success') => {
      clearTimeout(timer.current)
      setToast({ message, variant })
      timer.current = setTimeout(() => setToast(null), duration)
    },
    [duration]
  )

  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return { toast, showToast, dismissToast } as const
}
