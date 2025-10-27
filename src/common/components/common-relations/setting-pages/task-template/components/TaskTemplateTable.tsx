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
  Alert,
  AlertDescription,
  Spinner
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { TaskTemplateTableProps, BaseTaskTemplate, DAYS_OF_WEEK, MONTHS_OF_YEAR } from '../types'
import { Edit, Trash2 } from 'lucide-react'

export const TaskTemplateTable: React.FC<TaskTemplateTableProps> = ({
  templates,
  isLoading,
  error,
  onEdit,
  onDelete,
  onRetry,
  onSearchChange,
  dataTestId
}) => {
  const [search, setSearch] = useState('')

  const filteredTemplates = useMemo(() => {
    const s = search.toLowerCase().trim()
    if (!s) return templates

    return templates.filter(
      template =>
        template.code.toLowerCase().includes(s) ||
        template.name.toLowerCase().includes(s) ||
        template.description?.toLowerCase().includes(s) ||
        template.assigneeType?.toLowerCase().includes(s) ||
        template.typeRef?.toLowerCase().includes(s) ||
        template.priorityRef?.toLowerCase().includes(s)
    )
  }, [templates, search])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange?.(value)
  }

  // Generate schedule preview text
  const getSchedulePreview = (template: BaseTaskTemplate) => {
    const { daysOfWeek = {}, daysOfMonth = {}, monthsOfYear = {}, intervalDays = 1 } = template

    const selectedDays = Object.entries(daysOfWeek)
      .filter(([, checked]) => checked)
      .map(([key]) => key)
    const selectedDaysOfMonth = Object.entries(daysOfMonth)
      .filter(([, checked]) => checked)
      .map(([day]) => day)
    const selectedMonths = Object.entries(monthsOfYear)
      .filter(([, checked]) => checked)
      .map(([key]) => key)

    if (selectedDays.length > 0) {
      const dayLabels = selectedDays.map(day => DAYS_OF_WEEK.find(d => d.key === day)?.label || day)
      return `Every ${intervalDays} week(s) on ${dayLabels.join(', ')}`
    }

    if (selectedDaysOfMonth.length > 0) {
      const dayNumbers = selectedDaysOfMonth.map(day => Number.parseInt(day)).sort((a, b) => a - b)
      return `Every ${intervalDays} month(s) on the ${dayNumbers.join(', ')}`
    }

    if (selectedMonths.length > 0) {
      const monthLabels = selectedMonths.map(month => MONTHS_OF_YEAR.find(m => m.key === month)?.label || month)
      return `Every ${intervalDays} year(s) in ${monthLabels.join(', ')}`
    }

    return `Every ${intervalDays} day(s)`
  }

  // Format date range
  const formatDateRange = (activeFrom?: string, activeTo?: string) => {
    if (!activeFrom && !activeTo) return 'No date range'

    const from = activeFrom ? new Date(activeFrom).toLocaleDateString() : 'No start'
    const to = activeTo ? new Date(activeTo).toLocaleDateString() : 'No end'

    return `${from} - ${to}`
  }

  if (error) {
    return (
      <Alert className="gba:border-red-200 gba:bg-red-50" data-testid={`${dataTestId}-error`}>
        <AlertDescription>
          {error}
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="gba:ml-2">
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
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
      <div className="gba:mb-4">
        <DebouncedInput
          placeholder="Search task templates..."
          value={search}
          onChange={handleSearchChange}
          data-testid={`${dataTestId}-search-input`}
        />
      </div>

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
              <TableCell colSpan={7} className="gba:text-center gba:py-8">
                {search ? 'No templates match your search' : 'No task templates found'}
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
                        className="gba:text-sm gba:text-gray-500"
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
                      <Edit className="gba:w-4 gba:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(template.id)}
                      data-testid={`${dataTestId}-delete-button-${template.id}`}
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
