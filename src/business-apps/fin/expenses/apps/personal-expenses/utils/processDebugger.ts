// Development-only process debugger
export const enableProcessDebugging = () => {
  if (process.env.NODE_ENV !== 'development') return

  let processEventCount = 0

  // Monitor process start events
  window.addEventListener('com.newwork.process.start', (event: any) => {
    processEventCount++
    console.group(`🚀 Process Event #${processEventCount}`)
    console.log('Event:', event)
    console.log('Detail:', event.detail)
    console.log('Timestamp:', new Date().toISOString())
    console.groupEnd()
  })

  // Monitor for failed processes (custom event)
  window.addEventListener('com.newwork.process.failed', (event: any) => {
    console.error('❌ Process Failed:', event.detail)
  })

  console.log('🔍 Process debugging enabled')
}

// Call this in your main app during development
// enableProcessDebugging();
