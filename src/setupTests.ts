/**
 * Jest Setup File
 *
 * Configuration and global test utilities
 */

import '@testing-library/jest-dom'

// Mock window.matchMedia (required for many UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = '0px'
  readonly thresholds: ReadonlyArray<number> = []

  constructor() {} // NOSONAR - Intentional empty constructor for test mock
  disconnect() {} // NOSONAR - Intentional empty method for test mock
  observe() {} // NOSONAR - Intentional empty method for test mock
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve() {} // NOSONAR - Intentional empty method for test mock
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {} // NOSONAR - Intentional empty constructor for test mock
  disconnect() {} // NOSONAR - Intentional empty method for test mock
  observe() {} // NOSONAR - Intentional empty method for test mock
  unobserve() {} // NOSONAR - Intentional empty method for test mock
}

// Mock ClipboardEvent and DataTransfer for paste tests
class MockDataTransfer {
  private readonly data: Map<string, string> = new Map()

  setData(format: string, data: string) {
    this.data.set(format, data)
  }

  getData(format: string): string {
    return this.data.get(format) || ''
  }
}

global.ClipboardEvent = class ClipboardEvent extends Event {
  clipboardData: MockDataTransfer

  constructor(type: string, eventInitDict?: any) {
    super(type, eventInitDict)
    this.clipboardData = eventInitDict?.clipboardData || new MockDataTransfer()
  }
} as any

global.DataTransfer = MockDataTransfer as any

// Suppress console errors in tests (optional - comment out if you want to see them)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
