import { useEffect } from 'react'

// =============================================================================
// REPORT GENERATION MONITORING HOOK (Enhanced with Debugging)
// =============================================================================

interface ReportGenerationMonitorProps {
  onReportGenerated: (downloadPath: string, fileName: string) => void
  setIsGenerating: (isGenerating: boolean) => void
  extractFilePathFromReportPath: (reportPath: string) => string
  extractFileNameFromReportPath: (reportPath: string) => string
}

export const useReportGenerationMonitor = ({
  onReportGenerated,
  setIsGenerating,
  extractFilePathFromReportPath,
  extractFileNameFromReportPath
}: ReportGenerationMonitorProps) => {
  useEffect(() => {
    const globalEventHandler = (event: any) => {
      // Check for any event that might contain our response
      if (
        event.type &&
        (event.type.includes('process') ||
          event.type.includes('task') ||
          event.type.includes('flow') ||
          event.type.includes('report') ||
          event.type.includes('complete') ||
          event.type.includes('finish') ||
          event.type.includes('success'))
      ) {
        // Check if this event contains our reportPath
        if (event.detail && typeof event.detail === 'object') {
          const checkForReportPath = (obj: any, path = ''): any => {
            if (!obj || typeof obj !== 'object') return null

            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key

              if (key === 'reportPath' && typeof value === 'string') {
                return { reportPath: value, source: `Global Event: ${event.type}`, fullPath: currentPath }
              }

              if (typeof value === 'object' && value !== null) {
                const found = checkForReportPath(value, currentPath)
                if (found) return found
              }
            }
            return null
          }

          const result = checkForReportPath(event.detail)
          if (result) {
            const downloadPath = extractFilePathFromReportPath(result.reportPath)
            const fileName = extractFileNameFromReportPath(result.reportPath)

            if (downloadPath && downloadPath.trim() !== '') {
              onReportGenerated(downloadPath, fileName)
              setIsGenerating(false)
            }
          }
        }
      }
    }

    // Monitor ALL network responses for report data
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      const url = args[0] instanceof Request ? args[0].url : args[0].toString()

      // Check ALL successful JSON responses for reportPath - including 201 Created
      const isRelevantRequest =
        ((response.status === 200 || response.status === 201) &&
          response.headers.get('content-type')?.includes('application/json')) ||
        url.includes('investment') ||
        url.includes('report') ||
        url.includes('generateInvestmentReport') ||
        url.includes('process') ||
        url.includes('kogito') ||
        url.includes('flow')

      if (isRelevantRequest) {
        const clonedResponse = response.clone()
        try {
          const contentType = response.headers.get('content-type')
          let data

          if (contentType && contentType.includes('application/json')) {
            data = await clonedResponse.json()
          } else {
            const text = await clonedResponse.text()
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
              try {
                data = JSON.parse(text)
              } catch {
                // Not JSON
              }
            }
          }

          if (data) {
            const checkResponseForReportPath = (responseData: any, depth = 0): any => {
              if (depth > 10 || !responseData || typeof responseData !== 'object') return null

              // Check direct reportPath
              if (responseData.reportPath && typeof responseData.reportPath === 'string') {
                return responseData
              }

              // Check arrays
              if (Array.isArray(responseData)) {
                for (const item of responseData) {
                  const found = checkResponseForReportPath(item, depth + 1)
                  if (found) return found
                }
              }

              // Check all object properties deeply
              for (const [key, value] of Object.entries(responseData)) {
                if (key === 'reportPath' && typeof value === 'string') {
                  return responseData
                }

                if (typeof value === 'object' && value !== null) {
                  const found = checkResponseForReportPath(value, depth + 1)
                  if (found) return found
                }
              }

              return null
            }

            const reportData = checkResponseForReportPath(data)

            if (reportData) {
              const downloadPath = extractFilePathFromReportPath(reportData.reportPath)
              const fileName = extractFileNameFromReportPath(reportData.reportPath)

              if (downloadPath && downloadPath.trim() !== '') {
                setIsGenerating(false)
                onReportGenerated(downloadPath, fileName)
              }
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }

      return response
    }

    // Listen to ALL possible process completion events
    const allEventNames = [
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.taskCompletion',
      'investmentReportGenerate-completion',
      'flow-completion',
      'report-generated',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    allEventNames.forEach(eventName => {
      window.addEventListener(eventName, globalEventHandler, true)
    })

    return () => {
      allEventNames.forEach(eventName => {
        window.removeEventListener(eventName, globalEventHandler, true)
      })

      // Restore fetch override
      window.fetch = originalFetch
    }
  }, [onReportGenerated, setIsGenerating, extractFilePathFromReportPath, extractFileNameFromReportPath])

  // Monitor XMLHttpRequest (in case response comes through XHR)
  useEffect(() => {
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      ;(this as any)._url = url
      ;(this as any)._method = method
      return originalXHROpen.call(this, method, url, async ?? true, username, password)
    }

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      this.addEventListener('load', function (this: XMLHttpRequest) {
        if (
          (this.status === 200 || this.status === 201) &&
          this.getResponseHeader('content-type')?.includes('application/json')
        ) {
          try {
            const responseData = JSON.parse(this.responseText)

            // Check for reportPath in XHR response
            if (responseData && responseData.reportPath) {
              const downloadPath = extractFilePathFromReportPath(responseData.reportPath)
              const fileName = extractFileNameFromReportPath(responseData.reportPath)

              if (downloadPath && downloadPath.trim() !== '') {
                setIsGenerating(false)
                onReportGenerated(downloadPath, fileName)
              } else {
                setIsGenerating(false)
              }
            }
          } catch {
            // Ignore parsing errors
          }
        }
      })

      return originalXHRSend.call(this, body)
    }

    return () => {
      XMLHttpRequest.prototype.open = originalXHROpen
      XMLHttpRequest.prototype.send = originalXHRSend
    }
  }, [onReportGenerated, extractFilePathFromReportPath, extractFileNameFromReportPath, setIsGenerating])
}
