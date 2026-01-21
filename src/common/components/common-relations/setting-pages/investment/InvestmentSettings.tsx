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
import { ChartLineIcon } from '@phosphor-icons/react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useForm } from 'react-hook-form'

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

export interface InvestmentSettingsProps {
  className?: string
  prefixDataTestId?: string
  headerTitle?: string
  headerDescription?: string
  roles: CatalogTabState & CatalogTabHandlers
  statuses: CatalogTabState & CatalogTabHandlers
  stakeTypes: CatalogTabState & CatalogTabHandlers
  initialTab?: 'roles' | 'statuses' | 'stake-types'
  onBack?: () => void
}

interface GenericTabProps extends CatalogTabState, CatalogTabHandlers {
  entityName: string
  dataTestId: string
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [search, setSearch] = useState('')

  const form = useForm<CatalogUpsertData>({
    defaultValues: {
      code: '',
      value: '',
      type: '',
      displayOrder: undefined
    }
  })

  const handleAdd = () => {
    setEditingItem(null)
    form.reset({ code: '', value: '', type: '', displayOrder: undefined })
    setIsModalOpen(true)
  }

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item)
    form.reset({
      code: item.code,
      value: item.value,
      type: item.type || '',
      displayOrder: item.displayOrder
    })
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
    } catch (error) {
      console.error('Error saving catalog entry:', error)
    }
  }

  const filteredItems = useMemo(() => {
    if (!search) return items
    const searchLower = search.toLowerCase()
    return items.filter(
      item =>
        item.code.toLowerCase().includes(searchLower) ||
        item.value.toLowerCase().includes(searchLower) ||
        (item.type && item.type.toLowerCase().includes(searchLower))
    )
  }, [items, search])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="gba:ml-4">
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-4">
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
                        <Input {...field} data-testid={`${dataTestId}-Code-Input`} />
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Display Order</TableHead>
              <TableHead className="gba:text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="gba:text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    title={`No ${entityName.toLowerCase()}s found`}
                    description={
                      search
                        ? 'Try adjusting your search criteria'
                        : `Click "Add ${entityName}" to create your first entry`
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">{item.code}</Badge>
                  </TableCell>
                  <TableCell>{item.value}</TableCell>
                  <TableCell>
                    {item.type ? (
                      <Badge variant="secondary">{item.type}</Badge>
                    ) : (
                      <span className="gba:text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{item.displayOrder ?? '—'}</TableCell>
                  <TableCell className="gba:text-right">
                    <div className="gba:flex gba:justify-end gba:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        data-testid={`${dataTestId}-Edit-Button-${item.code}`}
                      >
                        <Edit className="gba:w-4 gba:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item.id)}
                        data-testid={`${dataTestId}-Delete-Button-${item.code}`}
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
    </div>
  )
}

export const InvestmentSettings: React.FC<InvestmentSettingsProps> = ({
  className,
  prefixDataTestId,
  headerTitle = 'Investment Settings',
  headerDescription = 'Manage investment roles, statuses, and stake types',
  roles,
  statuses,
  stakeTypes,
  initialTab = 'roles',
  onBack
}) => {
  const [active, setActive] = useState<'roles' | 'statuses' | 'stake-types'>(initialTab)

  return (
    <PageLayout
      headerIcon={ChartLineIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      className={className}
      data-testid={`${prefixDataTestId || ''}-InvestmentSettings-Container`}
    >
      <Tabs
        value={active}
        onValueChange={k => setActive(k as any)}
        data-testid={`${prefixDataTestId || ''}-InvestmentSettings-Tabs`}
      >
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="stake-types">Stake Types</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <GenericCatalogTab
            entityName="Investment Role"
            dataTestId={`${prefixDataTestId || ''}-InvestmentSettings-Roles`}
            {...roles}
          />
        </TabsContent>

        <TabsContent value="statuses">
          <GenericCatalogTab
            entityName="Investment Status"
            dataTestId={`${prefixDataTestId || ''}-InvestmentSettings-Statuses`}
            {...statuses}
          />
        </TabsContent>

        <TabsContent value="stake-types">
          <GenericCatalogTab
            entityName="Investment Stake Type"
            dataTestId={`${prefixDataTestId || ''}-InvestmentSettings-StakeTypes`}
            {...stakeTypes}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}

export default InvestmentSettings
