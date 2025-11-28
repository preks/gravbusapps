/**
 * CatalogSelectProvider - Type-safe provider for catalog select components
 *
 * Features:
 * - Generic over form schema for full type safety
 * - Explicit registration tracking (no fragile setTimeout)
 * - Self-registration pattern with late-registration support
 * - Automatic external value tracking from form
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
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { UseFormReturn, FieldValues } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { CatalogSelectConfig, CatalogSelectController } from './internal/useCatalogSelect'
import useCatalogSelect from './internal/useCatalogSelect'

export interface CatalogSelectContextValue {
  controllers: Record<string, CatalogSelectController>
  registerCatalog: (config: CatalogSelectConfig) => void
  finalizeRegistration: () => void
  registerForm?: <TFormValues extends FieldValues>(form: UseFormReturn<TFormValues>) => void
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
  const registrationMapRef = React.useRef(new Map<string, CatalogSelectConfig>())

  // Track form internally if passed via onFormReady
  const [internalForm, setInternalForm] = useState<UseFormReturn<TFormValues> | undefined>(form)

  // Callback for children to register their form
  const registerForm = useCallback(<TF extends FieldValues>(f: UseFormReturn<TF>) => {
    setInternalForm(f as any)
  }, [])

  // Expose setInternalForm via onFormReady callback
  React.useEffect(() => {
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
  const [externalValues, setExternalValues] = useState<Record<string, string | null> | undefined>(undefined)

  useEffect(() => {
    if (!activeForm || externalKeys.length === 0) {
      setExternalValues(undefined)
      return
    }

    // Performance: Track subscription creation
    const subscriptionStartTime = performance.now()

    // Subscribe to form changes for external keys
    const subscription = activeForm.watch(values => {
      const callbackStartTime = performance.now()

      const newValues: Record<string, string | null> = {}
      for (const key of externalKeys) {
        newValues[key] = ((values as any)[key] as string) || null
      }

      const callbackDuration = performance.now() - callbackStartTime
      if (callbackDuration > 5) {
        // Only log if > 5ms
        console.warn(`[PERF] CatalogSelectProvider: form.watch() callback took ${callbackDuration.toFixed(2)}ms`, {
          externalKeys,
          externalKeysLength: externalKeys.length,
          valuesSize: JSON.stringify(values).length,
          timestamp: new Date().toISOString()
        })
      }

      setExternalValues(newValues)
    })

    // Initialize with current values
    const initStartTime = performance.now()
    const currentValues = activeForm.getValues()
    const initialValues: Record<string, string | null> = {}
    for (const key of externalKeys) {
      initialValues[key] = ((currentValues as any)[key] as string) || null
    }
    setExternalValues(initialValues)

    const initDuration = performance.now() - initStartTime
    const subscriptionDuration = performance.now() - subscriptionStartTime
    if (subscriptionDuration > 10) {
      console.warn(`[PERF] CatalogSelectProvider: Subscription setup took ${subscriptionDuration.toFixed(2)}ms`, {
        initDuration: initDuration.toFixed(2),
        externalKeysLength: externalKeys.length,
        timestamp: new Date().toISOString()
      })
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [activeForm, externalKeys])

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

  // Auto-finalize after all components have had a chance to register
  // Wait until registration count stabilizes (no new registrations for 50ms)
  useEffect(() => {
    if (!isRegistrationComplete && registeredConfigs.length > 0) {
      const timer = setTimeout(() => {
        finalizeRegistration()
      }, 50) // Wait 50ms after last registration
      return () => clearTimeout(timer)
    }
  }, [isRegistrationComplete, finalizeRegistration, registeredConfigs.length])

  const { controllers, preload } = useCatalogSelect(context, allConfigs, externalValues)

  // Track which configs have been preloaded
  const preloadedConfigIdsRef = React.useRef<Set<string>>(new Set())

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

  const value = useMemo(
    () => ({ controllers, registerCatalog, finalizeRegistration, registerForm }),
    [controllers, registerCatalog, finalizeRegistration, registerForm]
  )

  return <CatalogSelectContext.Provider value={value}>{children}</CatalogSelectContext.Provider>
}

export const useCatalogSelectController = (catalogIdentifier: string): CatalogSelectController | null => {
  const ctx = useContext(CatalogSelectContext)
  return ctx?.controllers[catalogIdentifier] || null
}

/**
 * Validation hook for use in Zod schemas
 * Returns a stable function that checks if a catalog field should be validated
 */
export const useCatalogValidation = () => {
  const ctx = useContext(CatalogSelectContext)

  const validateField = useCallback(
    (fieldName: string): boolean => {
      const controller = ctx?.controllers[fieldName]
      return !!(controller?.hasOptions && !controller?.disabled)
    },
    [ctx]
  )

  return { validateField }
}

export default CatalogSelectProvider
