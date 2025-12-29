import React from 'react'
import { TableCell } from '@newwork/nw-design-system'

export interface EditableCellProps {
  /** Whether the cell is in editing mode */
  isEditing: boolean
  /** Render function that receives editing state and returns content */
  children: (isEditing: boolean) => React.ReactNode
  /** Additional class names for the cell */
  className?: string
  /** Test ID for the cell */
  dataTestId?: string
}

/**
 * A table cell that renders different content based on editing state.
 * Uses render props pattern for maximum flexibility.
 *
 * @example
 * ```tsx
 * <EditableCell isEditing={isEditMode}>
 *   {(editing) => editing
 *     ? <FormField name="value" render={({field}) => <Input {...field} />} />
 *     : <span>{row.value}</span>
 *   }
 * </EditableCell>
 *
 * // Or with more complex logic:
 * <EditableCell isEditing={canEdit && !isSubmitted}>
 *   {(editing) => {
 *     if (editing) {
 *       return <Input type="time" {...field} />;
 *     }
 *     if (isSubmitted) {
 *       return <Badge>Submitted: {value}</Badge>;
 *     }
 *     return <span>{value}</span>;
 *   }}
 * </EditableCell>
 * ```
 */
export const EditableCell: React.FC<EditableCellProps> = ({ isEditing, children, className, dataTestId }) => {
  return (
    <TableCell className={className} data-testid={dataTestId}>
      {children(isEditing)}
    </TableCell>
  )
}

export default EditableCell
