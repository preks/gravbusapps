import React, { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Spinner,
  EmptyState
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { TaskTemplateTableProps, BaseTaskTemplate, DAYS_OF_WEEK, MONTHS_OF_YEAR } from '../types'
import { parseTaskTemplateExtensions } from '../taskTemplateExtensions'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'

export const TaskTemplateTable: React.FC<TaskTemplateTableProps> = ({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onSearchChange,
  dataTestId
}) => {
  const [search, setSearch] = useState('')

  const filteredTemplates = useMemo(() => {
    const s = search.toLowerCase().trim()
    if (!s) return templates

    return templates.filter(template => {
      const ext = parseTaskTemplateExtensions(template.additionalProperties)
      const scopeHay = `${ext.scopedEntityType} ${ext.scopedEntityId}`.toLowerCase()
      const eventHay = `${ext.eventSourceEntityType} ${ext.eventSourceEntityId}`.toLowerCase()
      return (
        template.code.toLowerCase().includes(s) ||
        template.name.toLowerCase().includes(s) ||
        template.description?.toLowerCase().includes(s) ||
        template.assigneeType?.toLowerCase().includes(s) ||
        template.typeRef?.toLowerCase().includes(s) ||
        template.priorityRef?.toLowerCase().includes(s) ||
        scopeHay.includes(s) ||
        eventHay.includes(s)
      )
    })
  }, [templates, search])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange?.(value)
  }

  // Generate schedule preview text
  const getSchedulePreview = (template: BaseTaskTemplate) => {
    const { daysOfWeek = {}, daysOfMonth = {}, monthsOfYear = {}, intervalDays = 1 } = template
    const ext = parseTaskTemplateExtensions(template.additionalProperties)
    const schedulingType = template.schedulingType || 'ONCE'

    const selectedDays = Object.entries(daysOfWeek)
      .filter(([, checked]) => checked)
      .map(([key]) => key)
    const selectedDaysOfMonth = Object.entries(daysOfMonth)
      .filter(([, checked]) => checked)
      .map(([day]) => day)
    const selectedMonths = Object.entries(monthsOfYear)
      .filter(([, checked]) => checked)
      .map(([key]) => key)

    let recurrence = ''
    if (schedulingType === 'ONCE') {
      recurrence = 'Once'
    } else if (selectedDays.length > 0) {
      const dayLabels = selectedDays.map(day => DAYS_OF_WEEK.find(d => d.key === day)?.label || day)
      recurrence = `Every ${intervalDays} week(s) on ${dayLabels.join(', ')}`
    } else if (selectedDaysOfMonth.length > 0) {
      const dayNumbers = selectedDaysOfMonth.map(day => Number.parseInt(day, 10)).sort((a, b) => a - b)
      recurrence = `Every ${intervalDays} month(s) on the ${dayNumbers.join(', ')}`
    } else if (selectedMonths.length > 0) {
      const monthLabels = selectedMonths.map(month => MONTHS_OF_YEAR.find(m => m.key === month)?.label || month)
      recurrence = `Every ${intervalDays} year(s) in ${monthLabels.join(', ')}`
    } else {
      recurrence = `Every ${intervalDays} day(s)`
    }

    const extras: string[] = []
    if (ext.eventTriggerEnabled && ext.eventSourceEntityType) {
      const idPart = ext.eventSourceEntityId ? ` (id …${ext.eventSourceEntityId.slice(-6)})` : ''
      extras.push(`Events: ${ext.eventSourceEntityType}${idPart}`)
    }
    if (ext.scopeLimited && ext.scopedEntityType && ext.scopedEntityId) {
      extras.push(`Scope: ${ext.scopedEntityType}`)
    }
    if (extras.length === 0) {
      return recurrence
    }
    return `${recurrence} · ${extras.join(' · ')}`
  }

  // Format date range
  const formatDateRange = (activeFrom?: string, activeTo?: string) => {
    if (!activeFrom && !activeTo) return 'No date range'

    const from = activeFrom ? new Date(activeFrom).toLocaleDateString() : 'No start'
    const to = activeTo ? new Date(activeTo).toLocaleDateString() : 'No end'

    return `${from} - ${to}`
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-8" data-testid={`${dataTestId}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid={dataTestId}>
      <div className="gba:rounded-md gba:border gba:p-4 gba:mb-6">
        <DebouncedInput
          placeholder="Search task templates..."
          value={search}
          onChange={handleSearchChange}
          data-testid={`${dataTestId}-search-input`}
        />
      </div>

      <div className="gba:rounded-md gba:border">
        <Table data-testid={`${dataTestId}-table`}>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Active Period</TableHead>
              <TableHead className="gba:w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="gba:py-8">
                  <EmptyState
                    title={search ? 'No templates match your search' : 'No task templates configured yet'}
                    description={
                      search
                        ? 'Try adjusting your search terms'
                        : 'Click "Add Template" to create your first task template'
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map(template => (
                <TableRow key={template.id} data-testid={`${dataTestId}-row-${template.id}`}>
                  <TableCell>
                    <Badge variant="outline" data-testid={`${dataTestId}-code-${template.id}`}>
                      {template.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="gba:font-medium" data-testid={`${dataTestId}-name-${template.id}`}>
                        {template.name}
                      </div>
                      {template.description && (
                        <div
                          className="gba:text-sm gba:text-muted-foreground"
                          data-testid={`${dataTestId}-description-${template.id}`}
                        >
                          {template.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={template.enabled ? 'default' : 'secondary'}
                      data-testid={`${dataTestId}-status-${template.id}`}
                    >
                      {template.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="gba:text-sm" data-testid={`${dataTestId}-schedule-${template.id}`}>
                      {getSchedulePreview(template)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:text-sm" data-testid={`${dataTestId}-interval-${template.id}`}>
                      {template.intervalDays || 1} day(s)
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:text-sm" data-testid={`${dataTestId}-active-period-${template.id}`}>
                      {formatDateRange(template.activeFrom, template.activeTo)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(template)}
                        data-testid={`${dataTestId}-edit-button-${template.id}`}
                      >
                        <PencilSimpleIcon className="gba:w-4 gba:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(template.id)}
                        data-testid={`${dataTestId}-delete-button-${template.id}`}
                      >
                        <TrashIcon className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
