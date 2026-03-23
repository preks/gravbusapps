import { useState, useCallback } from 'react'

// Global cache for loaded components (shared across all hook instances)
const globalScreenCache = new Map<
  string,
  {
    component: React.ComponentType<any>
    loadedAt: number
  }
>()

// Global loading state to prevent concurrent loads of the same screen
const globalLoadingState = new Map<string, Promise<React.ComponentType<any>>>()

// Performance tracking
const performanceMetrics = new Map<
  string,
  {
    loadTime: number
    loadCount: number
    lastLoadTime: number
  }
>()

const DYNAMIC_SCREEN_HMR_EVENT = 'gba:dynamic-screen-hmr'
let hmrVersion = 0

// Import the virtual module for dynamic screen loading
// This will only work in development mode
let dynamicScreenLoader: any = null

// In dev, a cached component function can get "stuck" across HMR updates.
// We clear caches and signal active screens to reload on any update.
if (import.meta.hot && typeof window !== 'undefined') {
  import.meta.hot.on('vite:afterUpdate', () => {
    hmrVersion += 1
    globalScreenCache.clear()
    globalLoadingState.clear()
    window.dispatchEvent(new Event(DYNAMIC_SCREEN_HMR_EVENT))
  })
}

// Initialize the dynamic screen loader
const initDynamicScreenLoader = async () => {
  if (dynamicScreenLoader) {
    return dynamicScreenLoader
  }

  try {
    // Only load in development mode
    if (import.meta.env.MODE === 'development') {
      dynamicScreenLoader = await import('virtual:dynamic-screen-loader')
    }
    return dynamicScreenLoader
  } catch (error) {
    console.warn('[useDynamicScreen] Dynamic screen loader not available:', error)
    return null
  }
}

// Global function to load a screen with caching
const loadScreenGlobally = async (screenKey: string): Promise<React.ComponentType<any>> => {
  const cacheKey = import.meta.env.MODE === 'development' ? `${screenKey}::hmr${hmrVersion}` : screenKey
  // Check global cache first
  if (globalScreenCache.has(cacheKey)) {
    const cached = globalScreenCache.get(cacheKey)!
    console.log(
      `[useDynamicScreen] Using cached component for ${screenKey} (loaded ${Date.now() - cached.loadedAt}ms ago)`
    )
    return cached.component
  }

  // Check if already loading
  if (globalLoadingState.has(cacheKey)) {
    console.log(`[useDynamicScreen] Waiting for concurrent load of ${screenKey}`)
    return globalLoadingState.get(cacheKey)!
  }

  // Start performance tracking
  const startTime = performance.now()

  // Create loading promise
  const loadPromise = (async () => {
    try {
      const loader = await initDynamicScreenLoader()
      if (!loader) {
        throw new Error('Dynamic screen loading is only available in development mode')
      }

      console.log(`[useDynamicScreen] Loading ${screenKey}...`)
      const component = await loader.loadScreen(screenKey)

      // Cache the component globally
      globalScreenCache.set(cacheKey, {
        component,
        loadedAt: Date.now()
      })

      // Track performance
      const loadTime = performance.now() - startTime
      const existing = performanceMetrics.get(screenKey) || { loadTime: 0, loadCount: 0, lastLoadTime: 0 }
      performanceMetrics.set(screenKey, {
        loadTime: existing.loadTime + loadTime,
        loadCount: existing.loadCount + 1,
        lastLoadTime: loadTime
      })

      console.log(`[useDynamicScreen] Successfully loaded ${screenKey} in ${loadTime.toFixed(2)}ms`)
      return component
    } catch (error) {
      console.error(`[useDynamicScreen] Failed to load ${screenKey}:`, error)
      throw error
    } finally {
      // Remove from loading state
      globalLoadingState.delete(cacheKey)
    }
  })()

  // Store loading promise
  globalLoadingState.set(cacheKey, loadPromise)

  return loadPromise
}

export interface DynamicScreenState {
  isLoading: boolean
  error: string | null
  component: React.ComponentType<any> | null
}

export interface DynamicScreenHook {
  loadScreen: (screenKey: string) => Promise<void>
  getAvailableScreens: () => string[]
  isScreenAvailable: (screenKey: string) => boolean
  getScreenInfo: (screenKey: string) => any
  state: DynamicScreenState
  reset: () => void
  getPerformanceMetrics: () => Map<string, any>
}

/**
 * Hook for dynamically loading business app screens in development mode with global caching
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { loadScreen, state, getAvailableScreens } = useDynamicScreen();
 *
 *   const handleLoadScreen = async (screenKey: string) => {
 *     await loadScreen(screenKey);
 *   };
 *
 *   return (
 *     <div>
 *       {state.isLoading ? <Spinner /> : state.component && <state.component />}
 *     </div>
 *   );
 * }
 * ```
 */
export const useDynamicScreen = (): DynamicScreenHook => {
  const [state, setState] = useState<DynamicScreenState>({
    isLoading: false,
    error: null,
    component: null
  })

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      component: null
    })
  }, [])

  const loadScreen = useCallback(async (screenKey: string) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      const component = await loadScreenGlobally(screenKey)
      setState({
        isLoading: false,
        error: null,
        component
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState({
        isLoading: false,
        error: errorMessage,
        component: null
      })
    }
  }, [])

  const getAvailableScreens = useCallback((): string[] => {
    try {
      if (dynamicScreenLoader) {
        return dynamicScreenLoader.getAvailableScreens()
      }
      return []
    } catch (error) {
      console.warn('[useDynamicScreen] Failed to get available screens:', error)
      return []
    }
  }, [])

  const isScreenAvailable = useCallback((screenKey: string): boolean => {
    try {
      if (dynamicScreenLoader) {
        return dynamicScreenLoader.isScreenAvailable(screenKey)
      }
      return false
    } catch (error) {
      console.warn('[useDynamicScreen] Failed to check screen availability:', error)
      return false
    }
  }, [])

  const getScreenInfo = useCallback((screenKey: string): any => {
    try {
      if (dynamicScreenLoader) {
        const info = dynamicScreenLoader.getScreenInfo(screenKey)
        return {
          ...info,
          isCachedGlobally: globalScreenCache.has(screenKey),
          isLoading: globalLoadingState.has(screenKey)
        }
      }
      return null
    } catch (error) {
      console.warn('[useDynamicScreen] Failed to get screen info:', error)
      return null
    }
  }, [])

  const getPerformanceMetrics = useCallback(() => {
    return performanceMetrics
  }, [])

  return {
    loadScreen,
    getAvailableScreens,
    isScreenAvailable,
    getScreenInfo,
    state,
    reset,
    getPerformanceMetrics
  }
}
