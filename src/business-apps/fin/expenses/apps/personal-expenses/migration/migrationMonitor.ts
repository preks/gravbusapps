// Real-time migration monitor for action buttons
export class MigrationMonitor {
  private originalProcessCalls: Map<string, any> = new Map()
  private isMonitoring = false
  private testResults: any[] = []

  startMonitoring() {
    if (this.isMonitoring) return
    this.isMonitoring = true

    console.log('🔍 Migration Monitor Started')

    // Capture original process calls
    this.captureOriginalProcessCalls()

    // Monitor for process events
    window.addEventListener('com.newwork.process.start', this.handleProcessEvent.bind(this))

    // Monitor for DOM changes (component swaps)
    this.observeActionButtons()
  }

  stopMonitoring() {
    this.isMonitoring = false
    console.log('🛑 Migration Monitor Stopped')
  }

  private captureOriginalProcessCalls() {
    // Document current working process patterns
    this.originalProcessCalls.set('edit-expense-item', {
      domain: 'employee-expense',
      processName: 'changeExpenseItem',
      payloadKeys: ['employeeId', 'expenseId']
    })

    this.originalProcessCalls.set('create-expense-item', {
      domain: 'employee-expense',
      processName: 'changeExpenseItem',
      payloadKeys: ['employeeId']
    })

    this.originalProcessCalls.set('create-expense-request', {
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payloadKeys: ['employeeId']
    })

    console.log('📋 Original process calls captured:', this.originalProcessCalls)
  }

  private handleProcessEvent(event: any) {
    const { domain, processName, startProcessBody } = event.detail

    console.group('🔄 Process Event Detected During Migration')
    console.log('Domain:', domain)
    console.log('Process:', processName)
    console.log('Payload:', startProcessBody)

    // Validate against original patterns
    const isValid = this.validateProcessCall(domain, processName, startProcessBody)

    if (isValid) {
      console.log('✅ Process call matches original pattern')
    } else {
      console.error('❌ Process call differs from original - MIGRATION ISSUE!')
    }

    console.groupEnd()

    this.testResults.push({
      timestamp: new Date().toISOString(),
      domain,
      processName,
      payload: startProcessBody,
      valid: isValid
    })
  }

  private validateProcessCall(domain: string, processName: string, payload: any): boolean {
    // Check if this matches known working patterns
    for (const [key, pattern] of this.originalProcessCalls) {
      if (pattern.domain === domain && pattern.processName === processName) {
        // Verify payload has expected keys
        const hasRequiredKeys = pattern.payloadKeys.every((key: string) => payload.hasOwnProperty(key) && payload[key])

        if (!hasRequiredKeys) {
          console.error(`❌ Missing required payload keys for ${key}:`, {
            required: pattern.payloadKeys,
            actual: Object.keys(payload)
          })
          return false
        }

        return true
      }
    }

    console.warn('⚠️ Unknown process call pattern:', { domain, processName })
    return false
  }

  private observeActionButtons() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          // Check if action buttons were added/removed
          const addedButtons = Array.from(mutation.addedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE)
            .map(node => node as Element)
            .filter(el => el.querySelector('[data-testid*="actions-"], [data-testid*="add-"]'))

          if (addedButtons.length > 0) {
            console.log('🔄 Action buttons DOM changed - verifying...')
            this.verifyActionButtons()
          }
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  private verifyActionButtons() {
    const buttons = document.querySelectorAll('[data-testid*="actions-"], [data-testid*="add-"]')

    console.group('🧪 Action Button Verification')
    console.log(`Found ${buttons.length} action buttons`)

    buttons.forEach(button => {
      const testId = button.getAttribute('data-testid')
      console.log(`✅ Button found: ${testId}`)
    })

    console.groupEnd()
  }

  getTestResults() {
    return {
      totalTests: this.testResults.length,
      passedTests: this.testResults.filter(t => t.valid).length,
      failedTests: this.testResults.filter(t => !t.valid).length,
      results: this.testResults
    }
  }

  generateReport() {
    const results = this.getTestResults()

    console.group('📊 Migration Test Report')
    console.log(`Total Tests: ${results.totalTests}`)
    console.log(`Passed: ${results.passedTests}`)
    console.log(`Failed: ${results.failedTests}`)
    console.log(`Success Rate: ${((results.passedTests / results.totalTests) * 100).toFixed(1)}%`)

    if (results.failedTests > 0) {
      console.error(
        '❌ Failed Tests:',
        results.results.filter(t => !t.valid)
      )
    }

    console.groupEnd()

    return results
  }
}

// Usage during migration:
// const monitor = new MigrationMonitor();
// monitor.startMonitoring();
// // ... perform migration ...
// monitor.generateReport();
