import React, { useState, useMemo } from 'react'
import { UseFormReturn, FieldValues } from 'react-hook-form'
import { ZodType } from 'zod'
import { Form, Table, TableBody, TableHeader, TableRow } from '@newwork/nw-design-system'
import { cn } from '@/common/utils/cn'
import { TableFormContext, TableFormContextValue } from './TableFormContext'

export interface TableFormProps<TFormValues extends FieldValues> {
  /** React Hook Form instance */
  form: UseFormReturn<TFormValues>
  /** Optional Zod schema for validation */
  schema?: ZodType<TFormValues>
  /** Handler called on form submit (when using type="submit" button) */
  onSubmit?: (data: TFormValues) => void | Promise<void>
  /** Content rendered above the table (title, actions, etc.) */
  header?: React.ReactNode
  /** Column headers - should be TableHead elements */
  columns?: React.ReactNode
  /** Content rendered below the table (submit buttons, totals, etc.) */
  footer?: React.ReactNode
  /** Table body content - should be TableRow elements */
  children: React.ReactNode
  /** Additional class names for the form container */
  className?: string
  /** Test ID for the form */
  dataTestId?: string
  /** Whether to wrap children in overflow container */
  enableOverflow?: boolean
}

/**
 * A generic form wrapper that combines react-hook-form with a Table structure.
 * Provides form state via context so children can access isValid, isSubmitting, etc.
 *
 * @example
 * ```tsx
 * <TableForm
 *   form={form}
 *   schema={mySchema}
 *   onSubmit={handleSubmit}
 *   header={<h2>My Table</h2>}
 *   columns={<><TableHead>Name</TableHead><TableHead>Value</TableHead></>}
 *   footer={<Button type="submit">Save</Button>}
 * >
 *   {rows.map((row, i) => (
 *     <TableRow key={i}>
 *       <TableCell>{row.name}</TableCell>
 *       <TableCell>
 *         <FormField name={`rows.${i}.value`} render={...} />
 *       </TableCell>
 *     </TableRow>
 *   ))}
 * </TableForm>
 * ```
 */
export function TableForm<TFormValues extends FieldValues>({
  form,
  schema,
  onSubmit,
  header,
  columns,
  footer,
  children,
  className,
  dataTestId = 'table-form',
  enableOverflow = true
}: TableFormProps<TFormValues>) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: TFormValues) => {
    if (!onSubmit) return
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const contextValue: TableFormContextValue = useMemo(
    () => ({
      isValid: form.formState.isValid,
      isSubmitting,
      isDirty: form.formState.isDirty
    }),
    [form.formState.isValid, form.formState.isDirty, isSubmitting]
  )

  const tableContent = (
    <Table>
      {columns && (
        <TableHeader>
          <TableRow>{columns}</TableRow>
        </TableHeader>
      )}
      <TableBody>{children}</TableBody>
    </Table>
  )

  return (
    <TableFormContext.Provider value={contextValue}>
      <Form {...form} schema={schema}>
        <form
          onSubmit={onSubmit ? form.handleSubmit(handleSubmit) : undefined}
          className={cn('gba:flex gba:flex-col gba:gap-4', className)}
          data-testid={dataTestId}
        >
          {header}

          {enableOverflow ? <div className="gba:overflow-x-auto">{tableContent}</div> : tableContent}

          {footer}
        </form>
      </Form>
    </TableFormContext.Provider>
  )
}

export default TableForm
