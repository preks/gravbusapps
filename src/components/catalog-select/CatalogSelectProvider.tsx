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
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useLayoutEffect } from 'react'
import { UseFormReturn, FieldValues } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { CatalogSelectConfig, CatalogSelectController } from './useCatalogSelect'
import useCatalogSelect from './useCatalogSelect'

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
    allConfigs.forEach(cfg => {
      cfg.externalEqualsFilters?.forEach(filter => {
        keys.add(filter.externalKey)
      })
    })
    return Array.from(keys)
  }, [allConfigs])

  // Auto-watch form fields if form is provided (type-safe via TFormValues generic)
  // Note: form.watch with array is not reactive, so we need to subscribe manually
  const [externalValues, setExternalValues] = useState<Record<string, string | null> | undefined>(undefined)

  useEffect(() => {
    if (!activeForm || externalKeys.length === 0) {
      console.log('[CatalogSelectProvider] No form or no external keys', { form: !!activeForm, externalKeys })
      setExternalValues(undefined)
      return
    }

    console.log('[CatalogSelectProvider] Setting up subscription for external keys:', externalKeys)

    // Subscribe to form changes for external keys
    const subscription = activeForm.watch(values => {
      const newValues: Record<string, string | null> = {}
      externalKeys.forEach(key => {
        newValues[key] = ((values as any)[key] as string) || null
      })
      console.log('[CatalogSelectProvider] Form values changed:', newValues)
      setExternalValues(newValues)
    })

    // Initialize with current values
    const currentValues = activeForm.getValues()
    const initialValues: Record<string, string | null> = {}
    externalKeys.forEach(key => {
      initialValues[key] = ((currentValues as any)[key] as string) || null
    })
    console.log('[CatalogSelectProvider] Initial values:', initialValues)
    setExternalValues(initialValues)

    return () => subscription.unsubscribe()
  }, [activeForm, externalKeys])

  // Registration API - handles both initial and late registrations
  const registerCatalog = useCallback(
    (config: CatalogSelectConfig) => {
      // Track in registry
      if (!registrationMapRef.current.has(config.id)) {
        registrationMapRef.current.set(config.id, config)

        setRegisteredConfigs(prev => {
          const exists = prev.some(c => c.id === config.id)
          if (exists) return prev
          return [...prev, config]
        })

        // If registration happens after initial preload, trigger individual preload
        if (isRegistrationComplete && config.prefetch) {
          // Late registration - will be handled by preload effect
        }
      }
    },
    [isRegistrationComplete]
  )

  // Explicit finalization - called by parent when initial registration is done
  const finalizeRegistration = useCallback(() => {
    setIsRegistrationComplete(true)
  }, [])

  // Auto-finalize after layout if no explicit call (backwards compatibility)
  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      if (!isRegistrationComplete) {
        finalizeRegistration()
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [isRegistrationComplete, finalizeRegistration])

  const { controllers, preload } = useCatalogSelect(context, allConfigs, externalValues)

  // Track if preload was already called to prevent loops
  const preloadedRef = React.useRef(false)

  // Preload once registration is complete
  useEffect(() => {
    if (isRegistrationComplete && allConfigs.length > 0 && !preloadedRef.current) {
      preloadedRef.current = true
      preload()
    }
  }, [isRegistrationComplete, allConfigs.length, preload])

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

  const shouldValidateField = useCallback(
    (fieldName: string): boolean => {
      const controller = ctx?.controllers[fieldName]
      return !!(controller?.hasOptions && !controller?.disabled)
    },
    [ctx]
  )

  return { shouldValidateField }
}

export default CatalogSelectProvider
