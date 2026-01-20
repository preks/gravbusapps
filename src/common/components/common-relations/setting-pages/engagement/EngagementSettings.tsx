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
import { HandshakeIcon } from '@phosphor-icons/react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useForm } from 'react-hook-form'

export interface CatalogItem {
  id: string
  code: string
  value: string
  alternativeCode?: string
  displayOrder?: number
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
}

export interface CatalogUpsertData {
  code: string
  value: string
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

export interface EngagementSettingsProps {
  className?: string
  prefixDataTestId?: string
  headerTitle?: string
  headerDescription?: string
  activityTypes: CatalogTabState & CatalogTabHandlers
  taskTypes: CatalogTabState & CatalogTabHandlers
  taskPriorities: CatalogTabState & CatalogTabHandlers
  taskStatuses: CatalogTabState & CatalogTabHandlers
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
  onRetry,
  onSearchChange
}) => {
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogItem | null>(null)
  const form = useForm<CatalogUpsertData>()

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim()
    if (!s) return items
    return items.filter(
      i =>
        i.code.toLowerCase().includes(s) ||
        i.value.toLowerCase().includes(s) ||
        (i.alternativeCode && i.alternativeCode.toLowerCase().includes(s)) ||
        (i.displayOrder != null && String(i.displayOrder).toLowerCase().includes(s))
    )
  }, [items, search])

  const handleAdd = () => {
    setEditing(null)
    form.reset({ code: '', value: '', alternativeCode: '', additionalValue1: '', displayOrder: undefined })
    setIsModalOpen(true)
  }

  const handleEdit = (item: CatalogItem) => {
    setEditing(item)
    form.reset({
      code: item.code,
      value: item.value,
      alternativeCode: item.alternativeCode || '',
      additionalValue1: item.additionalValue1 || '',
      displayOrder: item.displayOrder
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (data: CatalogUpsertData) => {
    const payload: CatalogUpsertData = {
      ...data,
      alternativeCode: data.alternativeCode ?? (data.displayOrder != null ? String(data.displayOrder) : undefined),
      displayOrder: data.displayOrder
    }
    if (editing) {
      await onUpdate(editing.id, payload)
    } else {
      await onCreate(payload)
    }
    setIsModalOpen(false)
  }

  if (error) {
    return (
      <Alert
        className="gba:border-destructive-secondary gba:bg-destructive-secondary"
        data-testid={`${dataTestId}-Error`}
      >
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
          <DialogContent data-testid={`${dataTestId}-Modal`}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit' : 'Add'}</DialogTitle>
              <DialogDescription>{editing ? 'Update the details below.' : 'Add a new entry.'}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)}>
                <FormField
                  control={form.control}
                  name="code"
                  rules={{ required: 'Code is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter code" />
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
                        <Input {...field} placeholder="Enter value" />
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
                        <Input {...field} type="number" placeholder="Enter display order" />
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
                      <FormLabel>Alternative Code (fallback)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter alternative code" />
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
                      <FormLabel>Additional Value 1</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter additional value 1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="gba:flex gba:justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <DebouncedInput
          placeholder="Search..."
          value={search}
          onChange={v => {
            setSearch(v)
            if (onSearchChange) {
              onSearchChange(v)
            }
          }}
          data-testid={`${dataTestId}-Search-Input`}
        />
      </div>

      <div>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <Table data-testid={`${dataTestId}-Table`}>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead className="gba:w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:py-8">
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
    </div>
  )
}

export const EngagementSettings: React.FC<EngagementSettingsProps> = ({
  className,
  prefixDataTestId,
  headerTitle = 'Engagement Data',
  headerDescription = 'Manage activity types, task types, priorities, and statuses',
  activityTypes,
  taskTypes,
  taskPriorities,
  taskStatuses,
  onBack
}) => {
  const [active, setActive] = useState<'activity-types' | 'task-types' | 'task-priorities' | 'task-statuses'>(
    'activity-types'
  )

  return (
    <PageLayout
      headerIcon={HandshakeIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      className={className}
      data-testid={`${prefixDataTestId || ''}-EngagementSettings-Container`}
    >
      <Tabs
        value={active}
        onValueChange={k => setActive(k as any)}
        data-testid={`${prefixDataTestId || ''}-EngagementSettings-Tabs`}
      >
        <TabsList>
          <TabsTrigger value="activity-types">Activity Types</TabsTrigger>
          <TabsTrigger value="task-types">Task Types</TabsTrigger>
          <TabsTrigger value="task-priorities">Task Priorities</TabsTrigger>
          <TabsTrigger value="task-statuses">Task Statuses</TabsTrigger>
        </TabsList>

        <TabsContent value="activity-types">
          <GenericCatalogTab
            entityName="Activity Type"
            dataTestId={`${prefixDataTestId || ''}-EngagementSettings-ActivityTypes`}
            {...activityTypes}
          />
        </TabsContent>

        <TabsContent value="task-types">
          <GenericCatalogTab
            entityName="Task Type"
            dataTestId={`${prefixDataTestId || ''}-EngagementSettings-TaskTypes`}
            {...taskTypes}
          />
        </TabsContent>

        <TabsContent value="task-priorities">
          <GenericCatalogTab
            entityName="Task Priority"
            dataTestId={`${prefixDataTestId || ''}-EngagementSettings-TaskPriorities`}
            {...taskPriorities}
          />
        </TabsContent>

        <TabsContent value="task-statuses">
          <GenericCatalogTab
            entityName="Task Status"
            dataTestId={`${prefixDataTestId || ''}-EngagementSettings-TaskStatuses`}
            {...taskStatuses}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}

export default EngagementSettings
