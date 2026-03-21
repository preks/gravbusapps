import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  useTranslation
} from '@newwork/nw-design-system'
import type { TableTheme, TableWidthMode } from '@/components/tiptap-extensions/tiptap-custom-tables'
import translations from '../../_i18n'
import { TableBorderControlsSection } from './TableBorderControlsSection'
import { useTableSidebarActions } from './useTableSidebarActions'

const TABLE_THEME_OPTIONS: ReadonlyArray<{ value: TableTheme; labelKey: string }> = [
  { value: 'blue', labelKey: 'table-theme-blue' },
  { value: 'teal', labelKey: 'table-theme-teal' },
  { value: 'green', labelKey: 'table-theme-green' },
  { value: 'orange', labelKey: 'table-theme-orange' },
  { value: 'purple', labelKey: 'table-theme-purple' },
  { value: 'gray', labelKey: 'table-theme-gray' }
]

const TABLE_WIDTH_MODE_OPTIONS: ReadonlyArray<{ value: TableWidthMode; labelKey: string }> = [
  { value: 'auto-fit-window', labelKey: 'editor-toolbar-table-width-autofit-window' },
  { value: 'auto-fit-content', labelKey: 'editor-toolbar-table-width-autofit-content' },
  { value: 'manual', labelKey: 'table-sidebar-width-mode-manual' }
]

const FILL_OPTIONS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: '#E0F2FE', labelKey: 'table-sidebar-fill-blue' },
  { value: '#ECFCCB', labelKey: 'table-sidebar-fill-green' },
  { value: '#FEF3C7', labelKey: 'table-sidebar-fill-yellow' },
  { value: '#F3E8FF', labelKey: 'table-sidebar-fill-purple' }
]

function preventEditorBlurOnMouseDown(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault()
}

function formatCentimeterValue(value: number | null) {
  if (value == null) return ''
  return `${((value * 2.54) / 96).toFixed(2)}cm`
}

function ensureUnit(value: string) {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return ''
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}cm` : trimmed
}

interface TableSettingsSidebarContentProps {
  testId: string
  controller: ReturnType<typeof useTableSidebarActions>
}

export function TableSettingsSidebarContent({ testId, controller }: Readonly<TableSettingsSidebarContentProps>) {
  const { t } = useTranslation(translations)
  const { actions, capability, selectionMetrics, values } = controller

  const [tableWidthInput, setTableWidthInput] = useState(values.tableWidth)
  const [rowHeightInput, setRowHeightInput] = useState(values.rowHeight)
  const [columnWidthInput, setColumnWidthInput] = useState(formatCentimeterValue(values.columnWidthPx))

  useEffect(() => {
    setTableWidthInput(values.tableWidth)
  }, [values.tableWidth])

  useEffect(() => {
    setRowHeightInput(values.rowHeight)
  }, [values.rowHeight])

  useEffect(() => {
    setColumnWidthInput(formatCentimeterValue(values.columnWidthPx))
  }, [values.columnWidthPx])

  const selectionLabel = useMemo(() => t('table-sidebar-selection-summary', selectionMetrics), [selectionMetrics, t])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:px-4 gba:py-4">
      <section className="gba:space-y-3">
        <div className="gba:space-y-1">
          <Label className="gba:text-xs gba:text-muted-foreground">{t('table-sidebar-section-style')}</Label>
          <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-selection-summary`}>
            {selectionLabel}
          </p>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          {TABLE_THEME_OPTIONS.map(option => (
            <Button
              key={option.value}
              type="button"
              variant={values.tableTheme === option.value ? 'default' : 'outline'}
              size="sm"
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => actions.setTableTheme(option.value)}
              data-testid={`${testId}-theme-${option.value}`}
            >
              {t(option.labelKey)}
            </Button>
          ))}
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <Label htmlFor={`${testId}-style-header-row`} className="gba:text-xs">
              {t('table-sidebar-style-header-row')}
            </Label>
            <Switch
              id={`${testId}-style-header-row`}
              checked={values.styleHeaderRow}
              onCheckedChange={checked => actions.setTableStyleOptions({ styleHeaderRow: checked })}
              data-testid={`${testId}-style-header-row`}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <Label htmlFor={`${testId}-style-first-column`} className="gba:text-xs">
              {t('table-sidebar-style-first-column')}
            </Label>
            <Switch
              id={`${testId}-style-first-column`}
              checked={values.styleFirstColumn}
              onCheckedChange={checked => actions.setTableStyleOptions({ styleFirstColumn: checked })}
              data-testid={`${testId}-style-first-column`}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <Label htmlFor={`${testId}-style-last-column`} className="gba:text-xs">
              {t('table-sidebar-style-last-column')}
            </Label>
            <Switch
              id={`${testId}-style-last-column`}
              checked={values.styleLastColumn}
              onCheckedChange={checked => actions.setTableStyleOptions({ styleLastColumn: checked })}
              data-testid={`${testId}-style-last-column`}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <Label htmlFor={`${testId}-style-banded-rows`} className="gba:text-xs">
              {t('table-sidebar-style-banded-rows')}
            </Label>
            <Switch
              id={`${testId}-style-banded-rows`}
              checked={values.styleBandedRows}
              onCheckedChange={checked => actions.setTableStyleOptions({ styleBandedRows: checked })}
              data-testid={`${testId}-style-banded-rows`}
            />
          </div>
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <Label htmlFor={`${testId}-style-banded-columns`} className="gba:text-xs">
              {t('table-sidebar-style-banded-columns')}
            </Label>
            <Switch
              id={`${testId}-style-banded-columns`}
              checked={values.styleBandedColumns}
              onCheckedChange={checked => actions.setTableStyleOptions({ styleBandedColumns: checked })}
              data-testid={`${testId}-style-banded-columns`}
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="gba:space-y-3">
        <Label className="gba:text-xs gba:text-muted-foreground">{t('table-sidebar-section-structure')}</Label>
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canAddRowBefore}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.addRowBefore}
            data-testid={`${testId}-row-before`}
          >
            {t('editor-toolbar-table-row-before')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canAddRowAfter}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.addRowAfter}
            data-testid={`${testId}-row-after`}
          >
            {t('editor-toolbar-table-row-after')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canAddColumnBefore}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.addColumnBefore}
            data-testid={`${testId}-column-before`}
          >
            {t('editor-toolbar-table-column-before')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canAddColumnAfter}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.addColumnAfter}
            data-testid={`${testId}-column-after`}
          >
            {t('editor-toolbar-table-column-after')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canDuplicateRow}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.duplicateRow}
            data-testid={`${testId}-duplicate-row`}
          >
            {t('editor-toolbar-table-duplicate-row')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canDuplicateColumn}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.duplicateColumn}
            data-testid={`${testId}-duplicate-column`}
          >
            {t('editor-toolbar-table-duplicate-column')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canDeleteRow}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.deleteRow}
            data-testid={`${testId}-delete-row`}
          >
            {t('editor-toolbar-table-delete-row')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canDeleteColumn}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.deleteColumn}
            data-testid={`${testId}-delete-column`}
          >
            {t('editor-toolbar-table-delete-column')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canMergeCells}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.mergeCells}
            data-testid={`${testId}-merge-cells`}
          >
            {t('editor-toolbar-table-merge-cells')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canSplitCell}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={actions.splitCell}
            data-testid={`${testId}-split-cell`}
          >
            {t('editor-toolbar-table-split-cell')}
          </Button>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="gba:w-full"
          disabled={!capability.canDeleteTable}
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={actions.deleteTable}
          data-testid={`${testId}-delete-table`}
        >
          {t('editor-toolbar-table-delete-table')}
        </Button>
      </section>

      <Separator />

      <section className="gba:space-y-3">
        <Label className="gba:text-xs gba:text-muted-foreground">{t('table-sidebar-section-layout')}</Label>
        <div className="gba:space-y-1">
          <Label htmlFor={`${testId}-width-mode`} className="gba:text-xs gba:text-muted-foreground">
            {t('table-sidebar-width-mode')}
          </Label>
          <Select
            value={values.tableWidthMode}
            onValueChange={value => actions.setTableWidthMode(value as TableWidthMode)}
          >
            <SelectTrigger id={`${testId}-width-mode`} data-testid={`${testId}-width-mode`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_WIDTH_MODE_OPTIONS.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  data-testid={`${testId}-width-mode-${option.value}`}
                >
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="gba:grid gba:grid-cols-[1fr_auto] gba:gap-2">
          <Input
            value={tableWidthInput}
            onChange={event => setTableWidthInput(event.target.value)}
            placeholder="100%"
            data-testid={`${testId}-table-width`}
          />
          <Button
            type="button"
            variant="outline"
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={() => actions.setTableWidth(ensureUnit(tableWidthInput))}
            data-testid={`${testId}-table-width-apply`}
          >
            {t('table-sidebar-apply')}
          </Button>
        </div>

        <div className="gba:grid gba:grid-cols-3 gba:gap-2">
          <Button
            type="button"
            variant={values.tableAlign === 'left' ? 'default' : 'outline'}
            size="sm"
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={() => actions.setTableAlign('left')}
            data-testid={`${testId}-table-align-left`}
          >
            {t('editor-toolbar-table-align-left')}
          </Button>
          <Button
            type="button"
            variant={values.tableAlign === 'center' ? 'default' : 'outline'}
            size="sm"
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={() => actions.setTableAlign('center')}
            data-testid={`${testId}-table-align-center`}
          >
            {t('editor-toolbar-table-align-center')}
          </Button>
          <Button
            type="button"
            variant={values.tableAlign === 'right' ? 'default' : 'outline'}
            size="sm"
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={() => actions.setTableAlign('right')}
            data-testid={`${testId}-table-align-right`}
          >
            {t('editor-toolbar-table-align-right')}
          </Button>
        </div>

        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          <div className="gba:space-y-2">
            <Label className="gba:text-xs gba:text-muted-foreground">{t('table-sidebar-row-height')}</Label>
            <div className="gba:grid gba:grid-cols-[1fr_auto] gba:gap-2">
              <Input
                value={rowHeightInput}
                onChange={event => setRowHeightInput(event.target.value)}
                placeholder="0.8cm"
                data-testid={`${testId}-row-height`}
              />
              <Button
                type="button"
                variant="outline"
                onMouseDown={preventEditorBlurOnMouseDown}
                onClick={() => actions.setSelectedRowHeight(ensureUnit(rowHeightInput) || null)}
                data-testid={`${testId}-row-height-apply`}
              >
                {t('table-sidebar-apply')}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gba:w-full"
              disabled={!capability.canDistributeRows}
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => actions.distributeRowsEvenly(ensureUnit(rowHeightInput) || '0.8cm')}
              data-testid={`${testId}-distribute-rows`}
            >
              {t('table-sidebar-distribute-rows')}
            </Button>
          </div>

          <div className="gba:space-y-2">
            <Label className="gba:text-xs gba:text-muted-foreground">{t('table-sidebar-column-width')}</Label>
            <div className="gba:grid gba:grid-cols-[1fr_auto] gba:gap-2">
              <Input
                value={columnWidthInput}
                onChange={event => setColumnWidthInput(event.target.value)}
                placeholder="3cm"
                data-testid={`${testId}-column-width`}
              />
              <Button
                type="button"
                variant="outline"
                onMouseDown={preventEditorBlurOnMouseDown}
                onClick={() => actions.setSelectedColumnWidth(ensureUnit(columnWidthInput) || null)}
                data-testid={`${testId}-column-width-apply`}
              >
                {t('table-sidebar-apply')}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gba:w-full"
              disabled={!capability.canDistributeColumns}
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => actions.distributeColumnsEvenly(ensureUnit(columnWidthInput) || '3cm')}
              data-testid={`${testId}-distribute-columns`}
            >
              {t('table-sidebar-distribute-columns')}
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      <section className="gba:space-y-3">
        <Label className="gba:text-xs gba:text-muted-foreground">{t('table-sidebar-section-cell')}</Label>
        <div className="gba:grid gba:grid-cols-4 gba:gap-2">
          {(['left', 'center', 'right', 'justify'] as const).map(option => (
            <Button
              key={option}
              type="button"
              variant={values.cellTextAlign === option ? 'default' : 'outline'}
              size="sm"
              disabled={!capability.canSetCellTextAlign}
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => actions.setCellTextAlign(option)}
              data-testid={`${testId}-text-align-${option}`}
            >
              {t(option === 'justify' ? 'editor-toolbar-justify' : `editor-toolbar-align-${option}`)}
            </Button>
          ))}
        </div>
        <div className="gba:grid gba:grid-cols-3 gba:gap-2">
          {(['top', 'middle', 'bottom'] as const).map(option => (
            <Button
              key={option}
              type="button"
              variant={values.cellVerticalAlign === option ? 'default' : 'outline'}
              size="sm"
              disabled={!capability.canSetCellVerticalAlign}
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => actions.setCellVerticalAlign(option)}
              data-testid={`${testId}-vertical-align-${option}`}
            >
              {t(`editor-toolbar-table-vertical-align-${option}`)}
            </Button>
          ))}
        </div>
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          {FILL_OPTIONS.map(option => (
            <Button
              key={option.value}
              type="button"
              variant={values.backgroundColor === option.value ? 'default' : 'outline'}
              size="sm"
              disabled={!capability.canSetCellBackground}
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => actions.setCellBackground(option.value)}
              data-testid={`${testId}-fill-${option.value.replace('#', '').toLowerCase()}`}
            >
              {t(option.labelKey)}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!capability.canSetCellBackground}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={() => actions.setCellBackground(null)}
            data-testid={`${testId}-fill-clear`}
          >
            {t('editor-toolbar-table-fill-clear')}
          </Button>
        </div>
      </section>

      <Separator />

      <TableBorderControlsSection
        testId={`${testId}-borders`}
        initialStyle={values.borderStyle}
        initialWidth={values.borderWidth}
        initialColor={values.borderColor}
        canApplyBorders={capability.canApplyBorders}
        onApplyPreset={(preset, options) => actions.applyBorderPreset({ preset, ...options })}
      />
    </div>
  )
}
