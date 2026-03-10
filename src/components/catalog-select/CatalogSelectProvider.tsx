/**
 * CatalogSelectProvider - Type-safe provider for catalog select components
 *
 * Features:
 * - Generic over form schema for full type safety
 * - Explicit registration tracking (no fragile setTimeout)
 * - Self-registration pattern with late-registration support
 * - Automatic external value tracking from form
 * - Per-field subscription via useSyncExternalStore to prevent cross-field rerenders
 *
 * Usage:
 * ```tsx
 * <CatalogSelectProvider<FormValues> form={form} {...context}>
 *   <YourForm />
 * </CatalogSelectProvider>
 * ```
 *
 * The provider can optionally call finalizeRegistration() explicitly when all
 * initial components are mounted, or it will auto-finalize after layout for
 * backwards compatibility.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  useSyncExternalStore,
  useLayoutEffect
} from 'react'
import { UseFormReturn, FieldValues } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { CatalogSelectConfig, CatalogSelectController } from './internal/useCatalogSelect'
import { getChangedDebugKeys, logCatalogSelectDebug } from './internal/catalogSelectDebug'
import type { CatalogSelectExternalValue } from './internal/catalogSelectUtils'
import useCatalogSelect from './internal/useCatalogSelect'

type ControllerListener = () => void

const getValueAtPath = (value: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((currentValue, pathSegment) => {
    if (currentValue == null) return undefined
    if (typeof currentValue !== 'object') return undefined
    return (currentValue as Record<string, unknown>)[pathSegment]
  }, value)

const normalizeTrackedValue = (value: unknown): CatalogSelectExternalValue => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
  }
  return typeof value === 'string' && value.length > 0 ? value : null
}

export interface CatalogSelectContextValue {
  // Stable functions — never change identity after mount
  registerCatalog: (config: CatalogSelectConfig) => void
  finalizeRegistration: () => void
  registerForm?: <TFormValues extends FieldValues>(form: UseFormReturn<TFormValues>) => void
  // Per-field subscription API (replaces putting controllers in context value)
  subscribeToController: (id: string, listener: ControllerListener) => () => void
  getController: (id: string) => CatalogSelectController | null
}

export const CatalogSelectContext = createContext<CatalogSelectContextValue | null>(null)

interface CatalogSelectProviderProps<TFormValues extends FieldValues = FieldValues> extends BusinessAppContextProps {
  children: React.ReactNode
  form?: UseFormReturn<TFormValues>
  onFormReady?: (form: UseFormReturn<TFormValues>) => void
}

export const CatalogSelectProvider = <TFormValues extends FieldValues = FieldValues>({
  children,
  form,
  onFormReady,
  ...context
}: CatalogSelectProviderProps<TFormValues>) => {
  // Registration tracking
  const [registeredConfigs, setRegisteredConfigs] = useState<CatalogSelectConfig[]>([])
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false)
  const registrationMapRef = useRef(new Map<string, CatalogSelectConfig>())

  // Track form internally if passed via onFormReady
  const [internalForm, setInternalForm] = useState<UseFormReturn<TFormValues> | undefined>(form)

  // Callback for children to register their form
  const registerForm = useCallback(<TF extends FieldValues>(f: UseFormReturn<TF>) => {
    setInternalForm(f as any)
  }, [])

  // Expose setInternalForm via onFormReady callback
  useEffect(() => {
    if (onFormReady && internalForm) {
      onFormReady(internalForm)
    }
  }, [onFormReady, internalForm])

  // Use either passed form or internal form
  const activeForm = form || internalForm

  // All configs come from self-registration
  const allConfigs = useMemo(() => registeredConfigs, [registeredConfigs])

  // Collect all external keys needed from registered configs
  const externalKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const cfg of allConfigs) {
      keys.add(cfg.id)
      if (cfg.filterField) {
        for (const filter of cfg.filterField) {
          keys.add(filter.from)
        }
      }
      // Also watch parent fields to read parent values from form when CatalogSelect is unmounted (e.g., in accordions)
      if (cfg.parentField) {
        keys.add(cfg.parentField)
      }
    }
    return Array.from(keys)
  }, [allConfigs])

  // Auto-watch form fields if form is provided (type-safe via TFormValues generic)
  // Note: form.watch with array is not reactive, so we need to subscribe manually
  const [externalValues, setExternalValues] = useState<Record<string, CatalogSelectExternalValue> | undefined>(
    undefined
  )
  const prevExternalValuesRef = useRef<Record<string, CatalogSelectExternalValue> | undefined>(undefined)

  const setExternalValuesIfChanged = useCallback(
    (newValues: Record<string, CatalogSelectExternalValue> | undefined) => {
      const prev = prevExternalValuesRef.current
      if (!newValues) {
        if (prev !== undefined) {
          logCatalogSelectDebug('provider:externalValuesCleared', {
            changedKeys: Object.keys(prev)
          })
          prevExternalValuesRef.current = undefined
          setExternalValues(undefined)
        }
        return
      }
      const keys = Object.keys(newValues)
      const hasChanged =
        !prev || keys.length !== Object.keys(prev).length || keys.some(key => newValues[key] !== prev[key])
      if (!hasChanged) return
      logCatalogSelectDebug('provider:externalValuesChanged', {
        changedKeys: getChangedDebugKeys(prev, newValues)
      })
      prevExternalValuesRef.current = newValues
      setExternalValues(newValues)
    },
    []
  )

  useEffect(() => {
    if (!activeForm || externalKeys.length === 0) {
      setExternalValuesIfChanged(undefined)
      return
    }

    // Performance: Track subscription creation
    const subscriptionStartTime = performance.now()
    const trackedExternalKeys = new Set(externalKeys)

    // Subscribe to form changes for external keys
    const subscription = activeForm.watch((values, info) => {
      const changedFieldName = info?.name
      if (changedFieldName && trackedExternalKeys.has(changedFieldName)) {
        const nextTrackedValue = normalizeTrackedValue(getValueAtPath(values, changedFieldName))
        const previousValues = prevExternalValuesRef.current

        logCatalogSelectDebug('provider:watchChange', {
          changedFieldName,
          previousValue: previousValues?.[changedFieldName] || null,
          nextValue: nextTrackedValue,
          strategy: previousValues ? 'incremental' : 'fallback'
        })

        if (previousValues?.[changedFieldName] === nextTrackedValue) {
          return
        }

        if (previousValues) {
          setExternalValuesIfChanged({ ...previousValues, [changedFieldName]: nextTrackedValue })
          return
        }
      } else if (changedFieldName) {
        return
      }

      const nextValues: Record<string, CatalogSelectExternalValue> = {}
      for (const key of externalKeys) {
        nextValues[key] = normalizeTrackedValue(getValueAtPath(values, key))
      }
      setExternalValuesIfChanged(nextValues)
    })

    // Initialize with current values
    const currentValues = activeForm.getValues()
    const initialValues: Record<string, CatalogSelectExternalValue> = {}
    let hasAnyInitialValue = false
    for (const key of externalKeys) {
      const v = normalizeTrackedValue(getValueAtPath(currentValues, key))
      initialValues[key] = v
      if (v !== null) hasAnyInitialValue = true
    }
    // Only update state if there are actual values to track
    if (hasAnyInitialValue) {
      setExternalValuesIfChanged(initialValues)
    } else {
      prevExternalValuesRef.current = initialValues
    }

    const subscriptionDuration = performance.now() - subscriptionStartTime
    if (subscriptionDuration > 10) {
      console.warn(`[PERF] CatalogSelectProvider: Subscription setup took ${subscriptionDuration.toFixed(2)}ms`, {
        externalKeysLength: externalKeys.length,
        timestamp: new Date().toISOString()
      })
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [activeForm, externalKeys, setExternalValuesIfChanged])

  // Registration API - handles both initial and late registrations
  const registerCatalog = useCallback((config: CatalogSelectConfig) => {
    // Track in registry
    if (!registrationMapRef.current.has(config.id)) {
      registrationMapRef.current.set(config.id, config)

      setRegisteredConfigs(prev => {
        const exists = prev.some(c => c.id === config.id)
        if (exists) return prev
        return [...prev, config]
      })
    }
  }, [])

  // Explicit finalization - called by parent when initial registration is done
  const finalizeRegistration = useCallback(() => {
    setIsRegistrationComplete(true)
  }, [])

  // Auto-finalize after all components have had a chance to register.
  // useLayoutEffect of all children runs before useEffect of the parent,
  // so by the time this fires all initial CatalogSelect registrations are complete.
  useEffect(() => {
    if (!isRegistrationComplete) {
      finalizeRegistration()
    }
  }, [])

  const { controllers, preload } = useCatalogSelect(context, allConfigs, externalValues)

  // --- Per-field subscription store ---
  // controllers is stored in a ref so it doesn't flow into context value.
  // Per-field listeners are notified only when their specific controller changes.
  const controllersRef = useRef<Record<string, CatalogSelectController>>(controllers)
  const prevControllersRef = useRef<Record<string, CatalogSelectController>>(controllers)
  // listeners: fieldId -> Set of listener callbacks
  const listenersRef = useRef<Map<string, Set<ControllerListener>>>(new Map())

  // Sync controllers into ref and notify only listeners whose controller changed
  useLayoutEffect(() => {
    controllersRef.current = controllers
    const prev = prevControllersRef.current
    prevControllersRef.current = controllers
    const notifiedControllerIds: string[] = []

    // Notify only listeners for fields whose controller reference changed
    for (const [id, listenerSet] of listenersRef.current) {
      if (controllers[id] !== prev[id]) {
        notifiedControllerIds.push(id)
        for (const listener of listenerSet) {
          listener()
        }
      }
    }

    if (notifiedControllerIds.length > 0) {
      logCatalogSelectDebug('provider:controllerNotifications', {
        notifiedControllerIds
      })
    }
  }, [controllers])

  const subscribeToController = useCallback((id: string, listener: ControllerListener) => {
    if (!listenersRef.current.has(id)) {
      listenersRef.current.set(id, new Set())
    }
    listenersRef.current.get(id)!.add(listener)
    return () => {
      listenersRef.current.get(id)?.delete(listener)
    }
  }, [])

  const getController = useCallback((id: string): CatalogSelectController | null => {
    return controllersRef.current[id] ?? null
  }, [])

  // Track which configs have been preloaded
  const preloadedConfigIdsRef = useRef<Set<string>>(new Set())

  // Preload when registration is complete - only once for all configs
  useEffect(() => {
    if (isRegistrationComplete && allConfigs.length > 0 && preloadedConfigIdsRef.current.size === 0) {
      // Mark all configs as preloaded
      allConfigs.forEach(cfg => preloadedConfigIdsRef.current.add(cfg.id))
      // Trigger preload once for all configs
      preload()
    }
  }, [isRegistrationComplete, allConfigs, preload])

  // Handle late registrations (dynamically added items)
  useEffect(() => {
    if (!isRegistrationComplete) return

    // Find configs that haven't been preloaded yet
    const newConfigs = allConfigs.filter(cfg => !preloadedConfigIdsRef.current.has(cfg.id))
    if (newConfigs.length === 0) return

    // Mark new configs as preloaded
    newConfigs.forEach(cfg => preloadedConfigIdsRef.current.add(cfg.id))

    // Trigger preload - it will reuse existing data where possible
    preload()
  }, [isRegistrationComplete, allConfigs, preload])

  // Context value only contains stable functions — never changes identity after mount,
  // so useContext(CatalogSelectContext) subscribers do NOT rerender on controller updates.
  const value = useMemo(
    () => ({ registerCatalog, finalizeRegistration, registerForm, subscribeToController, getController }),
    [registerCatalog, finalizeRegistration, registerForm]
    // subscribeToController and getController are stable useCallback refs, safe to omit
  )

  return <CatalogSelectContext.Provider value={value}>{children}</CatalogSelectContext.Provider>
}

/**
 * Returns the controller for a single catalog field.
 * Uses useSyncExternalStore so only this field's consumers rerender when its controller changes.
 */
export const useCatalogSelectController = (catalogIdentifier: string): CatalogSelectController | null => {
  const ctx = useContext(CatalogSelectContext)

  const subscribe = useCallback(
    (listener: ControllerListener) => {
      if (!ctx) return () => {}
      return ctx.subscribeToController(catalogIdentifier, listener)
    },
    [ctx, catalogIdentifier]
  )

  const getSnapshot = useCallback(() => {
    return ctx?.getController(catalogIdentifier) ?? null
  }, [ctx, catalogIdentifier])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Validation hook for use in Zod schemas
 * Returns a stable function that checks if a catalog field should be validated
 */
export const useCatalogValidation = () => {
  const ctx = useContext(CatalogSelectContext)

  const validateField = useCallback(
    (fieldName: string): boolean => {
      const controller = ctx?.getController(fieldName)
      return !!(controller?.hasOptions && !controller?.disabled)
    },
    [ctx]
  )

  return { validateField }
}

export default CatalogSelectProvider
