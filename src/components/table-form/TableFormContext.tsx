import { createContext, useContext } from 'react'

export interface TableFormContextValue {
  /** Whether the form is valid according to schema validation */
  isValid: boolean
  /** Whether the form is currently submitting */
  isSubmitting: boolean
  /** Whether the form has been modified */
  isDirty: boolean
}

export const TableFormContext = createContext<TableFormContextValue | null>(null)

/**
 * Hook to access TableForm state from within children components.
 * Useful for conditionally disabling submit buttons based on form state.
 *
 * @example
 * ```tsx
 * const SubmitButton = () => {
 *   const { isValid, isSubmitting, isDirty } = useTableFormState();
 *   return (
 *     <Button
 *       type="submit"
 *       disabled={!isValid || isSubmitting || !isDirty}
 *     >
 *       Submit
 *     </Button>
 *   );
 * };
 * ```
 */
export const useTableFormState = (): TableFormContextValue => {
  const context = useContext(TableFormContext)
  if (!context) {
    throw new Error('useTableFormState must be used within a TableForm component')
  }
  return context
}
