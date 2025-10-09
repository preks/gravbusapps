import React, { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Badge,
  Alert,
  AlertDescription,
  Spinner
} from '@newwork/nw-design-system'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useForm } from 'react-hook-form'

export interface TaskPrioritiesTabProps extends BusinessAppContextProps {
  sourceApp: 'CRM' | 'IRM'
  prefixDataTestId?: string
}

interface TaskPriority {
  id: string
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
}

interface TaskPriorityFormData {
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
}

const DATA_TEST_ID = 'TaskPrioritiesTab'

const getPriorityColor = (code: string) => {
  const lowerCode = code.toLowerCase()
  if (lowerCode.includes('high') || lowerCode.includes('urgent') || lowerCode.includes('critical')) {
    return 'destructive'
  }
  if (lowerCode.includes('medium') || lowerCode.includes('normal')) {
    return 'default'
  }
  if (lowerCode.includes('low')) {
    return 'secondary'
  }
  return 'outline'
}

export const TaskPrioritiesTab: React.FC<TaskPrioritiesTabProps> = ({ accessToken, sourceApp, prefixDataTestId }) => {
  const { t } = useTranslation()
  const [taskPriorities, setTaskPriorities] = useState<TaskPriority[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTaskPriority, setEditingTaskPriority] = useState<TaskPriority | null>(null)

  const form = useForm<TaskPriorityFormData>()
  const catalogClient = useCatalogManagerClient(accessToken)

  // Determine catalog name based on source app
  const catalogName = sourceApp === 'CRM' ? 'SalesTaskPriority' : 'InvestmentTaskPriority'

  // Load task priorities
  const loadTaskPriorities = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: catalogName,
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: false,
          ...(searchTerm && { searchCriteria: searchTerm })
        }
      )

      const entries =
        response.data?.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode,
          additionalValue1: entry.additionalValue1,
          additionalValue2: entry.additionalValue2,
          additionalValue3: entry.additionalValue3
        })) || []

      setTaskPriorities(entries)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load task priorities'
      setError(errorMessage)
      console.error('Error loading task priorities:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      loadTaskPriorities()
    }
  }, [accessToken, searchTerm, catalogName])

  const handleAdd = () => {
    setEditingTaskPriority(null)
    form.reset()
    setIsModalOpen(true)
  }

  const handleEdit = (taskPriority: TaskPriority) => {
    setEditingTaskPriority(taskPriority)
    form.reset({
      code: taskPriority.code,
      value: taskPriority.value,
      alternativeCode: taskPriority.alternativeCode || '',
      additionalValue1: taskPriority.additionalValue1 || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      // TODO: Implement actual delete operation with catalog API
      console.log('Delete task priority:', id)
      loadTaskPriorities()
    } catch (err) {
      console.error('Failed to delete task priority:', err)
    }
  }

  const handleSubmit = async (data: TaskPriorityFormData) => {
    try {
      if (editingTaskPriority) {
        // TODO: Implement actual update operation with catalog API
        console.log('Update task priority:', data)
      } else {
        // TODO: Implement actual create operation with catalog API
        console.log('Create task priority:', data)
      }

      setIsModalOpen(false)
      loadTaskPriorities()
    } catch (err) {
      console.error('Failed to save task priority:', err)
    }
  }

  const filteredTaskPriorities = taskPriorities.filter(
    item =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.alternativeCode && item.alternativeCode.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (error) {
    return (
      <Alert className="gba:border-red-200 gba:bg-red-50">
        <AlertDescription>
          {t('mdm.task_priorities.error', 'Error Loading Task Priorities')}: {error}
          <Button variant="outline" size="sm" onClick={loadTaskPriorities} className="gba:ml-2">
            {t('common.retry', 'Retry')}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid={`${prefixDataTestId}-${DATA_TEST_ID}`} className="gba:space-y-4">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
            {t('mdm.task_priorities', 'Task Priorities')}
            <Badge variant={sourceApp === 'CRM' ? 'default' : 'secondary'}>{sourceApp}</Badge>
          </h3>
          <p className="gba:text-sm gba:text-gray-600">
            {t('mdm.task_priorities.description', 'Manage priority levels for tasks')}
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Add-Button`}>
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('mdm.task_priority.add', 'Add Task Priority')}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Modal`}>
            <DialogHeader>
              <DialogTitle>
                {editingTaskPriority
                  ? t('mdm.task_priority.edit', 'Edit Task Priority')
                  : t('mdm.task_priority.add', 'Add Task Priority')}
              </DialogTitle>
              <DialogDescription>
                {editingTaskPriority
                  ? t('mdm.task_priority.edit.description', 'Update the task priority details below.')
                  : t('mdm.task_priority.add.description', 'Add a new task priority to the catalog.')}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  rules={{ required: t('mdm.code.required', 'Code is required') }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('mdm.code', 'Code')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('mdm.code.placeholder', 'Enter code')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  rules={{ required: t('mdm.value.required', 'Value is required') }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('mdm.value', 'Value')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('mdm.value.placeholder', 'Enter value')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alternativeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('mdm.alternative_code', 'Alternative Code')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('mdm.alternative_code.placeholder', 'Enter alternative code')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalValue1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('mdm.additional_value_1', 'Additional Value 1')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('mdm.additional_value_1.placeholder', 'Enter additional value 1')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button type="submit">{t('common.save', 'Save')}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="gba:w-80">
        <DebouncedInput
          placeholder={t('mdm.task_priorities.search_placeholder', 'Search task priorities...')}
          value={searchTerm}
          onChange={setSearchTerm}
          data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Search-Input`}
        />
      </div>

      {/* Table */}
      <div className="gba:border gba:rounded-lg">
        {loading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-32">
            <Spinner />
          </div>
        ) : (
          <Table data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Table`}>
            <TableHeader>
              <TableRow>
                <TableHead>{t('mdm.code', 'Code')}</TableHead>
                <TableHead>{t('mdm.value', 'Value')}</TableHead>
                <TableHead>{t('mdm.alternative_code', 'Alternative Code')}</TableHead>
                <TableHead className="gba:w-24">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTaskPriorities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-gray-500 gba:py-8">
                    {t('mdm.task_priorities.no_data', 'No task priorities found')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTaskPriorities.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={getPriorityColor(item.code) as any}>{item.code}</Badge>
                    </TableCell>
                    <TableCell>{item.value}</TableCell>
                    <TableCell>
                      {item.alternativeCode ? (
                        <Badge variant="secondary">{item.alternativeCode}</Badge>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Edit-Button-${item.id}`}
                        >
                          <Edit className="gba:h-4 gba:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Delete-Button-${item.id}`}
                        >
                          <Trash2 className="gba:h-4 gba:w-4 gba:text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
