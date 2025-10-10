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

export interface TaskTypesTabProps extends BusinessAppContextProps {
  sourceApp: 'CRM' | 'IRM'
  prefixDataTestId?: string
}

interface TaskType {
  id: string
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
}

interface TaskTypeFormData {
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
}

const DATA_TEST_ID = 'TaskTypesTab'

export const TaskTypesTab: React.FC<TaskTypesTabProps> = ({ accessToken, sourceApp, prefixDataTestId }) => {
  const { t } = useTranslation()
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTaskType, setEditingTaskType] = useState<TaskType | null>(null)

  const form = useForm<TaskTypeFormData>()
  const catalogClient = useCatalogManagerClient(accessToken)

  // Determine catalog name based on source app
  const catalogName = sourceApp === 'CRM' ? 'SalesTaskType' : 'InvestmentTaskType'

  // Load task types
  const loadTaskTypes = async () => {
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

      setTaskTypes(entries)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load task types'
      setError(errorMessage)
      console.error('Error loading task types:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      loadTaskTypes()
    }
  }, [accessToken, searchTerm, catalogName])

  const handleAdd = () => {
    setEditingTaskType(null)
    form.reset()
    setIsModalOpen(true)
  }

  const handleEdit = (taskType: TaskType) => {
    setEditingTaskType(taskType)
    form.reset({
      code: taskType.code,
      value: taskType.value,
      alternativeCode: taskType.alternativeCode || '',
      additionalValue1: taskType.additionalValue1 || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      // TODO: Implement actual delete operation with catalog API
      console.log('Delete task type:', id)
      loadTaskTypes()
    } catch (err) {
      console.error('Failed to delete task type:', err)
    }
  }

  const handleSubmit = async (data: TaskTypeFormData) => {
    try {
      if (editingTaskType) {
        // TODO: Implement actual update operation with catalog API
        console.log('Update task type:', data)
      } else {
        // TODO: Implement actual create operation with catalog API
        console.log('Create task type:', data)
      }

      setIsModalOpen(false)
      loadTaskTypes()
    } catch (err) {
      console.error('Failed to save task type:', err)
    }
  }

  const filteredTaskTypes = taskTypes.filter(
    item =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.alternativeCode && item.alternativeCode.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (error) {
    return (
      <Alert className="gba:border-red-200 gba:bg-red-50">
        <AlertDescription>
          {t('mdm.task_types.error', 'Error Loading Task Types')}: {error}
          <Button variant="outline" size="sm" onClick={loadTaskTypes} className="gba:ml-2">
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
            {t('mdm.task_types', 'Task Types')}
            <Badge variant={sourceApp === 'CRM' ? 'default' : 'secondary'}>{sourceApp}</Badge>
          </h3>
          <p className="gba:text-sm gba:text-gray-600">
            {t('mdm.task_types.description', 'Manage task types for engagement workflow')}
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Add-Button`}>
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('mdm.task_type.add', 'Add Task Type')}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Modal`}>
            <DialogHeader>
              <DialogTitle>
                {editingTaskType ? t('mdm.task_type.edit', 'Edit Task Type') : t('mdm.task_type.add', 'Add Task Type')}
              </DialogTitle>
              <DialogDescription>
                {editingTaskType
                  ? t('mdm.task_type.edit.description', 'Update the task type details below.')
                  : t('mdm.task_type.add.description', 'Add a new task type to the catalog.')}
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
          placeholder={t('mdm.task_types.search_placeholder', 'Search task types...')}
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
              {filteredTaskTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-gray-500 gba:py-8">
                    {t('mdm.task_types.no_data', 'No task types found')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTaskTypes.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.code}</Badge>
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
