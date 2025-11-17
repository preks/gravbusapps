import React, { useEffect, useState } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Alert,
  Spinner,
  Button
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  extractInvestmentId,
  parseAdditionalProperties,
  validateInvestmentData,
  INVESTMENT_ERRORS
} from '../utils/investmentPopupUtils'
import { buildInvestmentPopupPayload } from '../utils/investmentPopupPayloadHelper'
import {
  generateTileId,
  loadTilesFromInvestment,
  findTileById,
  upsertTile,
  createDefaultTable,
  generateRowId,
  generateColumnId
} from '@/business-apps/irm/common/utils/tileUtils'
import { TileData, TILE_TYPES, TableData, TableRow, TableColumn } from '@/business-apps/irm/common/types/tileTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const prefixDataTestId = 'investment-table-tile-component'

// Form validation schema
const tableTileFormSchema = z.object({
  title: z.string().min(1, 'Title is required')
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
  const businessAppContext = { accessToken, userInfo, additionalData }

  // Extract investmentId
  const investmentId = extractInvestmentId(additionalData)

  // Determine if this is create or edit mode
  const isEditMode = !!tileId

  // Local state for table data
  const [tableData, setTableData] = useState<TableData>(createDefaultTable())

  // Load investment data
  const { investment, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'table'
  })

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
      id: generateColumnId(),
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
      id: generateRowId(),
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
    validateInvestmentData(investment)

    if (!investment) {
      throw new Error(INVESTMENT_ERRORS.DATA_NOT_LOADED())
    }

    // Get current tiles
    const currentTiles = loadTilesFromInvestment(investment)

    // Create or update tile
    const tileData: TileData = {
      id: tileId || generateTileId(),
      type: TILE_TYPES.TABLE,
      title: formData.title,
      tableData: tableData,
      order: 0, // Will be calculated by upsertTile
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // If editing, preserve creation date and order
    if (isEditMode && tileId) {
      const existingTile = findTileById(investment, tileId)
      if (existingTile) {
        tileData.createdAt = existingTile.createdAt
        tileData.order = existingTile.order
      }
    }

    // Update tiles array
    const updatedTiles = upsertTile(currentTiles, tileData)

    // Get current additionalProperties
    const currentAdditionalProps = parseAdditionalProperties(investment.additionalProperties)

    // Update additionalProperties with new tiles
    const updatedAdditionalProperties = {
      ...currentAdditionalProps,
      tilesData: updatedTiles
    }

    // Build the payload using the centralized helper
    const payload = buildInvestmentPopupPayload({
      investment,
      updatedAdditionalProperties,
      businessAppContext,
      businessKeyPrefix: 'investment-table-tile',
      businessKeySuffix: tileData.id
    })

    // Call success callback
    if (onSave) {
      onSave(tileData)
    }

    // Return the payload for AppActionForm to handle
    return payload
  }

  // Show loading state
  if (loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.loading', 'Loading investment data...')}
        </span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        {error}
      </Alert>
    )
  }

  // Show form when investment data is loaded
  if (!investment) {
    return null
  }

  const formTitle = isEditMode
    ? getTranslationFromI18nKeyAndLabel('investment.tiles.editTableTile', 'Edit Table Tile')
    : getTranslationFromI18nKeyAndLabel('investment.tiles.createTableTile', 'Create Table Tile')

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={form.getValues()}
      form={form}
      businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.save', 'Save')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
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
                <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('investment.tiles.addColumn', 'Add Column')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleAddRow} data-testid="add-row-button">
                <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
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
                          <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
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
                        <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
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
    </AppActionForm>
  )
}

export default InvestmentTableTileComponent
