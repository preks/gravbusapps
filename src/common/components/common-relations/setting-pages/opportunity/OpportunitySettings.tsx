import React, { useMemo, useState } from 'react'
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PageLayout,
  EmptyState
} from '@newwork/nw-design-system'
import { TargetIcon } from '@phosphor-icons/react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useForm } from 'react-hook-form'
import PipelineSettings from '../pipelines/PipelineSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CatalogItem {
  id: string
  code: string
  value: string
  type?: string
  alternativeCode?: string
  displayOrder?: number
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
}

export interface CatalogUpsertData {
  code: string
  value: string
  type?: string
  alternativeCode?: string
  additionalValue1?: string
  displayOrder?: number
}

export interface CatalogTabState {
  items: CatalogItem[]
  isLoading?: boolean
  error?: string | null
}

export interface CatalogTabHandlers {
  onCreate: (data: CatalogUpsertData) => Promise<void> | void
  onUpdate: (id: string, data: CatalogUpsertData) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
  onRetry?: () => void
}

export interface PipelineTabProps extends BusinessAppContextProps {
  pipelines: any[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  catalogConfig: {
    pipelineCatalog: string
    stageCatalog: string
    conditionCatalog: string
    version: string
  }
}

export interface OpportunitySettingsProps {
  className?: string
  prefixDataTestId?: string
  headerTitle?: string
  headerDescription?: string
  pipelineTab: PipelineTabProps
  statuses: CatalogTabState & CatalogTabHandlers
  forecasts: CatalogTabState & CatalogTabHandlers
  initialTab?: 'pipelines' | 'statuses' | 'forecasts'
  onBack?: () => void
}

interface GenericTabProps extends CatalogTabState, CatalogTabHandlers {
  entityName: string
  dataTestId: string
  onSearchChange?: (value: string) => void
}

const GenericCatalogTab: React.FC<GenericTabProps> = ({
  entityName,
  dataTestId,
  items,
  isLoading,
  error,
  onCreate,
  onUpdate,
  onDelete,
  onRetry
}) => {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)

  const form = useForm<CatalogUpsertData>({
    defaultValues: {
      code: '',
      value: '',
      type: '',
      displayOrder: undefined
    }
  })

  const filtered = useMemo(() => {
    if (!search) return items
    const lowerSearch = search.toLowerCase()
    return items.filter(
      item =>
        item.code?.toLowerCase().includes(lowerSearch) ||
        item.value?.toLowerCase().includes(lowerSearch) ||
        item.type?.toLowerCase().includes(lowerSearch) ||
        item.alternativeCode?.toLowerCase().includes(lowerSearch)
    )
  }, [items, search])

  const handleAdd = () => {
    form.reset({ code: '', value: '', type: '', displayOrder: undefined })
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleEdit = (item: CatalogItem) => {
    form.reset({
      code: item.code,
      value: item.value,
      type: item.type || '',
      displayOrder: item.displayOrder
    })
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleSubmit = async (data: CatalogUpsertData) => {
    try {
      if (editingItem) {
        await onUpdate(editingItem.id, data)
      } else {
        await onCreate(data)
      }
      setIsModalOpen(false)
      form.reset()
      setEditingItem(null)
    } catch (err) {
      console.error('Error saving item:', err)
    }
  }

  return (
    <div data-testid={dataTestId}>
      <div className="gba:flex gba:justify-end gba:mb-6">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid={`${dataTestId}-Add-Button`}>
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add {entityName}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid={`${dataTestId}-Dialog`}>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit' : 'Add'} {entityName}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update' : 'Create'} a {entityName.toLowerCase()} entry
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-6">
                <FormField
                  control={form.control}
                  name="code"
                  rules={{ required: 'Code is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid={`${dataTestId}-Code-Input`} disabled={!!editingItem} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  rules={{ required: 'Value is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid={`${dataTestId}-Value-Input`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid={`${dataTestId}-Type-Input`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          onChange={e => {
                            const value = e.target.value
                            field.onChange(value === '' ? 0 : parseInt(value, 10) || 0)
                          }}
                          value={field.value ?? 0}
                          data-testid={`${dataTestId}-DisplayOrder-Input`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false)
                      form.reset()
                    }}
                    data-testid={`${dataTestId}-Cancel-Button`}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid={`${dataTestId}-Submit-Button`}>
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="gba:rounded-md gba:border gba:p-4 gba:mb-6">
        <DebouncedInput
          placeholder="Search..."
          value={search}
          onChange={v => setSearch(v)}
          data-testid={`${dataTestId}-Search-Input`}
        />
      </div>

      <div className="gba:rounded-md gba:border">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <Table data-testid={`${dataTestId}-Table`}>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead className="gba:w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="gba:py-8">
                    <EmptyState
                      title={search ? 'No entries match your search' : `No ${entityName.toLowerCase()}s configured yet`}
                      description={
                        search
                          ? 'Try adjusting your search terms'
                          : `Click "Add ${entityName}" to create your first entry`
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.code}</Badge>
                    </TableCell>
                    <TableCell>{item.value}</TableCell>
                    <TableCell>{item.type ? <Badge variant="secondary">{item.type}</Badge> : <span>-</span>}</TableCell>
                    <TableCell>
                      {item.displayOrder != null ? (
                        <Badge variant="secondary">{item.displayOrder}</Badge>
                      ) : item.alternativeCode ? (
                        <Badge variant="secondary">{item.alternativeCode}</Badge>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          data-testid={`${dataTestId}-Edit-Button-${item.id}`}
                        >
                          <Edit className="gba:w-4 gba:h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(item.id)}
                          data-testid={`${dataTestId}-Delete-Button-${item.id}`}
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
        )}
      </div>

      {error && onRetry && (
        <Alert variant="destructive" className="gba:mt-4">
          <AlertDescription>
            <div className="gba:flex gba:items-center gba:justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export const OpportunitySettings: React.FC<OpportunitySettingsProps> = ({
  prefixDataTestId = 'OpportunitySettings',
  className,
  headerTitle = 'Opportunity Data',
  headerDescription = 'Manage opportunity pipelines, statuses, and forecasts',
  pipelineTab,
  statuses,
  forecasts,
  initialTab = 'pipelines',
  onBack
}) => {
  const [active, setActive] = useState<'pipelines' | 'statuses' | 'forecasts'>(initialTab)

  return (
    <PageLayout
      headerIcon={TargetIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      className={className}
      data-testid={`${prefixDataTestId}-Container`}
    >
      <Tabs value={active} onValueChange={k => setActive(k as any)} data-testid={`${prefixDataTestId}-Tabs`}>
        <TabsList>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines">
          <PipelineSettings
            prefixDataTestId={`${prefixDataTestId}-Pipelines`}
            accessToken={pipelineTab.accessToken}
            userInfo={pipelineTab.userInfo}
            additionalData={pipelineTab.additionalData}
            pipelines={pipelineTab.pipelines}
            isLoading={pipelineTab.isLoading}
            error={pipelineTab.error}
            onRetry={pipelineTab.onRetry}
            catalogConfig={pipelineTab.catalogConfig}
            headerPhosphorIcon={{ icon: undefined }}
            headerTitle=""
            headerDescription=""
            hidePageLayout={true}
          />
        </TabsContent>

        <TabsContent value="statuses">
          <GenericCatalogTab entityName="Status" dataTestId={`${prefixDataTestId}-Statuses`} {...statuses} />
        </TabsContent>

        <TabsContent value="forecasts">
          <GenericCatalogTab entityName="Forecast" dataTestId={`${prefixDataTestId}-Forecasts`} {...forecasts} />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
