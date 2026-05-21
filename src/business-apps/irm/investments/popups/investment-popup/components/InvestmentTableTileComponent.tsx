import React, { useEffect, useState } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Alert,
  Button
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useInvestmentPopupForm } from '../hooks/useInvestmentPopupForm'
import { useTileSubmission } from '../hooks/useTileSubmission'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { INVESTMENT_ERRORS } from '../utils/investmentPopupUtils'
import {
  findTileById,
  createDefaultTable,
  TileData,
  TableData,
  TableRow,
  TableColumn
} from '@/common/components/investment/tiles'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const prefixDataTestId = 'investment-table-tile-component'

// Form validation schema
const tableTileFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required')
})

type TableTileFormData = z.infer<typeof tableTileFormSchema>

interface InvestmentTableTileComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (tileData: TileData) => void
  tileId?: string
}

export const InvestmentTableTileComponent: React.FC<InvestmentTableTileComponentProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData,
  tileId
}) => {
  // Use common setup hook
  const { businessAppContext, investmentId, investment, loading, error } = useInvestmentPopupForm({
    accessToken,
    userInfo,
    additionalData,
    scope: 'table'
  })

  // Use tile submission hook
  const { isEditMode, buildTileSubmission } = useTileSubmission({
    investment,
    businessAppContext,
    tileId,
    tileType: 'TABLE',
    businessKeyPrefix: 'investment-table-tile'
  })

  // Local state for table data
  const [tableData, setTableData] = useState<TableData>(createDefaultTable())

  // Initialize form
  const form = useForm<TableTileFormData>({
    resolver: zodResolver(tableTileFormSchema),
    defaultValues: {
      title: ''
    }
  })

  // Load existing tile data if editing
  useEffect(() => {
    if (investment && isEditMode && tileId) {
      const existingTile = findTileById(investment, tileId)
      if (existingTile) {
        form.reset({
          title: existingTile.title || ''
        })
        if (existingTile.tableData) {
          setTableData(existingTile.tableData)
        }
      }
    }
  }, [investment, isEditMode, tileId, form])

  // Validate required data (after all hooks are called)
  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'missing-investment-id')}>
        {INVESTMENT_ERRORS.MISSING_ID()}
      </Alert>
    )
  }

  // Table manipulation functions
  const handleAddColumn = () => {
    const newColumn: TableColumn = {
      id: crypto.randomUUID(),
      label: `Column ${tableData.columns.length + 1}`
    }

    // Add empty cell for new column in all rows
    const updatedRows = tableData.rows.map(row => ({
      ...row,
      cells: {
        ...row.cells,
        [newColumn.id]: ''
      }
    }))

    setTableData({
      columns: [...tableData.columns, newColumn],
      rows: updatedRows
    })
  }

  const handleAddRow = () => {
    const newRow: TableRow = {
      id: crypto.randomUUID(),
      cells: {}
    }

    // Initialize cells for all columns
    tableData.columns.forEach(col => {
      newRow.cells[col.id] = ''
    })

    setTableData({
      ...tableData,
      rows: [...tableData.rows, newRow]
    })
  }

  const handleRemoveColumn = (columnId: string) => {
    if (tableData.columns.length <= 1) {
      alert(getTranslationFromI18nKeyAndLabel('investment.tiles.minOneColumn', 'Table must have at least one column'))
      return
    }

    const updatedColumns = tableData.columns.filter(col => col.id !== columnId)
    const updatedRows = tableData.rows.map(row => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [columnId]: _removed, ...remainingCells } = row.cells
      return {
        ...row,
        cells: remainingCells
      }
    })

    setTableData({
      columns: updatedColumns,
      rows: updatedRows
    })
  }

  const handleRemoveRow = (rowId: string) => {
    if (tableData.rows.length <= 1) {
      alert(getTranslationFromI18nKeyAndLabel('investment.tiles.minOneRow', 'Table must have at least one row'))
      return
    }

    setTableData({
      ...tableData,
      rows: tableData.rows.filter(row => row.id !== rowId)
    })
  }

  const handleColumnLabelChange = (columnId: string, newLabel: string) => {
    setTableData({
      ...tableData,
      columns: tableData.columns.map(col => (col.id === columnId ? { ...col, label: newLabel } : col))
    })
  }

  const handleCellChange = (rowId: string, columnId: string, value: string) => {
    setTableData({
      ...tableData,
      rows: tableData.rows.map(row =>
        row.id === rowId
          ? {
              ...row,
              cells: {
                ...row.cells,
                [columnId]: value
              }
            }
          : row
      )
    })
  }

  // Handle form submission
  const handleSubmit = async (formData: TableTileFormData) => {
    // Build tile submission with specific data
    const { payload, tileData } = buildTileSubmission({
      title: formData.title,
      tableData: tableData
    })

    // Call success callback
    if (onSave) {
      onSave(tileData)
    }

    // Return the payload for AppActionForm to handle
    return payload
  }

  const formTitle = isEditMode
    ? getTranslationFromI18nKeyAndLabel('investment.tiles.editTableTile', 'Edit Table Tile')
    : getTranslationFromI18nKeyAndLabel('investment.tiles.createTableTile', 'Create Table Tile')

  return (
    <InvestmentPopupFormWrapper
      loading={loading}
      error={error}
      investment={investment}
      onSubmit={handleSubmit}
      onClose={onClose}
      form={form}
      businessAppContext={businessAppContext}
      prefixDataTestId={prefixDataTestId}
      loadingMessage={getTranslationFromI18nKeyAndLabel('investment.tiles.loading', 'Loading investment data...')}
    >
      <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-form-content`}>
        <h3 className="gba:text-lg gba:font-semibold">{formTitle}</h3>

        {/* Title Input */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.tiles.titleLabel', 'Title')}{' '}
                <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.titlePlaceholder',
                    'Enter tile title'
                  )}
                  data-testid={formatDataTestId(prefixDataTestId, 'title-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Table Editor */}
        <div className="gba:space-y-2">
          <div className="gba:flex gba:justify-between gba:items-center">
            <FormLabel>{getTranslationFromI18nKeyAndLabel('investment.tiles.tableLabel', 'Table Data')}</FormLabel>
            <div className="gba:flex gba:gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddColumn}
                data-testid="add-column-button"
              >
                <PlusIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('investment.tiles.addColumn', 'Add Column')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleAddRow} data-testid="add-row-button">
                <PlusIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('investment.tiles.addRow', 'Add Row')}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="gba:overflow-x-auto gba:border gba:border-border gba:rounded-md" data-testid="table-editor">
            <table className="gba:w-full gba:border-collapse">
              <thead>
                <tr>
                  {tableData.columns.map((column, colIndex) => (
                    <th key={column.id} className="gba:border gba:border-border gba:bg-muted gba:p-2 gba:min-w-[200px]">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Input
                          value={column.label}
                          onChange={e => handleColumnLabelChange(column.id, e.target.value)}
                          className="gba:h-8 gba:text-sm"
                          placeholder={`Column ${colIndex + 1}`}
                          data-testid={`column-header-${colIndex}`}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveColumn(column.id)}
                          className="gba:h-8 gba:w-8 gba:flex-shrink-0"
                          data-testid={`remove-column-${colIndex}`}
                        >
                          <TrashIcon className="gba:h-4 gba:w-4 gba:text-destructive" />
                        </Button>
                      </div>
                    </th>
                  ))}
                  <th className="gba:border gba:border-border gba:bg-muted gba:p-2 gba:w-12"></th>
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={row.id}>
                    {tableData.columns.map((column, colIndex) => (
                      <td
                        key={`${row.id}-${column.id}`}
                        className="gba:border gba:border-border gba:p-2 gba:min-w-[200px]"
                      >
                        <Input
                          value={row.cells[column.id] || ''}
                          onChange={e => handleCellChange(row.id, column.id, e.target.value)}
                          className="gba:h-8 gba:text-sm"
                          placeholder="Enter value"
                          data-testid={`cell-${rowIndex}-${colIndex}`}
                        />
                      </td>
                    ))}
                    <td className="gba:border gba:border-border gba:p-2 gba:text-center gba:w-12">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveRow(row.id)}
                        className="gba:h-8 gba:w-8"
                        data-testid={`remove-row-${rowIndex}`}
                      >
                        <TrashIcon className="gba:h-4 gba:w-4 gba:text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'investment.tiles.tableHelp',
              'Click on column headers or cells to edit. Use the buttons to add or remove columns and rows.'
            )}
          </p>
        </div>
      </div>
    </InvestmentPopupFormWrapper>
  )
}

export default InvestmentTableTileComponent
