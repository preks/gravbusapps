type TimeoutRef = {
  current: ReturnType<typeof setTimeout> | null
}

export function scheduleCoalescedTimeout(timeoutRef: TimeoutRef, delayMs: number, callback: () => void): void {
  if (timeoutRef.current != null) return

  timeoutRef.current = setTimeout(() => {
    timeoutRef.current = null
    callback()
  }, delayMs)
}
