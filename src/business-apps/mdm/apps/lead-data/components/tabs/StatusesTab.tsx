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
import { Plus, Edit, Trash2, CircleDot } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useForm } from 'react-hook-form'

export interface StatusesTabProps extends BusinessAppContextProps {
  sourceApp: 'CRM' | 'IRM'
  prefixDataTestId?: string
}

interface Status {
  id: string
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
}

interface StatusFormData {
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
}

const DATA_TEST_ID = 'StatusesTab'

const getStatusColor = (code: string) => {
  const lowerCode = code.toLowerCase()
  if (lowerCode.includes('new') || lowerCode.includes('open') || lowerCode.includes('fresh')) {
    return 'running'
  }
  if (lowerCode.includes('qualified') || lowerCode.includes('contacted') || lowerCode.includes('working')) {
    return 'secondary'
  }
  if (lowerCode.includes('converted') || lowerCode.includes('won') || lowerCode.includes('closed')) {
    return 'success'
  }
  if (lowerCode.includes('lost') || lowerCode.includes('dead') || lowerCode.includes('rejected')) {
    return 'destructive'
  }
  return 'outline'
}

export const StatusesTab: React.FC<StatusesTabProps> = ({ accessToken, sourceApp, prefixDataTestId }) => {
  const { t } = useTranslation()
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<Status | null>(null)

  const form = useForm<StatusFormData>()
  const catalogClient = useCatalogManagerClient(accessToken)

  // Determine catalog name based on source app
  const catalogName = sourceApp === 'CRM' ? 'SalesLeadStatus' : 'InvestmentLeadStatus'

  // Load statuses
  const loadStatuses = async () => {
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

      setStatuses(entries)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statuses'
      setError(errorMessage)
      console.error('Error loading statuses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      loadStatuses()
    }
  }, [accessToken, searchTerm, catalogName])

  const handleAdd = () => {
    setEditingStatus(null)
    form.reset()
    setIsModalOpen(true)
  }

  const handleEdit = (status: Status) => {
    setEditingStatus(status)
    form.reset({
      code: status.code,
      value: status.value,
      alternativeCode: status.alternativeCode || '',
      additionalValue1: status.additionalValue1 || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      // TODO: Implement actual delete operation with catalog API
      console.log('Delete status:', id)
      loadStatuses()
    } catch (err) {
      console.error('Failed to delete status:', err)
    }
  }

  const handleSubmit = async (data: StatusFormData) => {
    try {
      if (editingStatus) {
        // TODO: Implement actual update operation with catalog API
        console.log('Update status:', data)
      } else {
        // TODO: Implement actual create operation with catalog API
        console.log('Create status:', data)
      }

      setIsModalOpen(false)
      loadStatuses()
    } catch (err) {
      console.error('Failed to save status:', err)
    }
  }

  const filteredStatuses = statuses.filter(
    item =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.alternativeCode && item.alternativeCode.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (error) {
    return (
      <Alert className="gba:border-red-200 gba:bg-red-50">
        <AlertDescription>
          {t('mdm.statuses.error', 'Error Loading Statuses')}: {error}
          <Button variant="outline" size="sm" onClick={loadStatuses} className="gba:ml-2">
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
            <CircleDot className="gba:h-5 gba:w-5" />
            {t('mdm.lead_statuses', 'Lead Statuses')}
            <Badge variant={sourceApp === 'CRM' ? 'default' : 'secondary'}>{sourceApp}</Badge>
          </h3>
          <p className="gba:text-sm gba:text-gray-600">
            {t('mdm.lead_statuses.description', 'Manage status values for lead lifecycle')}
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Add-Button`}>
              <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('mdm.status.add', 'Add Status')}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid={`${prefixDataTestId}-${DATA_TEST_ID}-Modal`}>
            <DialogHeader>
              <DialogTitle>
                {editingStatus ? t('mdm.status.edit', 'Edit Status') : t('mdm.status.add', 'Add Status')}
              </DialogTitle>
              <DialogDescription>
                {editingStatus
                  ? t('mdm.status.edit.description', 'Update the status details below.')
                  : t('mdm.status.add.description', 'Add a new status to the catalog.')}
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
          placeholder={t('mdm.statuses.search_placeholder', 'Search statuses...')}
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
              {filteredStatuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-gray-500 gba:py-8">
                    {t('mdm.statuses.no_data', 'No statuses found')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStatuses.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={getStatusColor(item.code) as any}>{item.code}</Badge>
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
