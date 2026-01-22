import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'
import { EnumOption } from '../types'

export interface DetailFormSegmentProps {
  form: any
  dataTestId: string
  taskTypeCatalogId: string
  taskPriorityCatalogId: string
  assigneeTypes: EnumOption[]
}

export const DetailFormSegment: React.FC<DetailFormSegmentProps> = ({
  form,
  dataTestId,
  taskTypeCatalogId,
  taskPriorityCatalogId,
  assigneeTypes
}) => {
  return (
    <div className="gba:space-y-4">
      <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Basic Information</h3>

      <div className="gba:grid gba:grid-cols-1 gba:gap-4">
        <FormField
          control={form.control}
          name="code"
          rules={{ required: 'Code is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter template code" data-testid={`${dataTestId}-code-input`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="name"
        rules={{ required: 'Name is required' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter template name" data-testid={`${dataTestId}-name-input`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="Enter template description"
                rows={3}
                data-testid={`${dataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="typeRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Type</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={taskTypeCatalogId}
                  value={field.value || null}
                  onValueChange={field.onChange}
                  data-testid={`${dataTestId}-type-ref-select`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priorityRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={taskPriorityCatalogId}
                  value={field.value || null}
                  onValueChange={field.onChange}
                  data-testid={`${dataTestId}-priority-ref-select`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="assigneeType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assignee Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger data-testid={`${dataTestId}-assignee-type-select`}>
                  <SelectValue placeholder="Select assignee type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {assigneeTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="gba:grid gba:grid-cols-3 gba:gap-4">
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={v => field.onChange(v === 'ACTIVE')}
                defaultValue={field.value ? 'ACTIVE' : 'DRAFT'}
              >
                <FormControl>
                  <SelectTrigger data-testid={`${dataTestId}-status-inline-select`}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('isActive') && (
          <>
            <FormField
              control={form.control}
              name="activeFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Active From</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" data-testid={`${dataTestId}-active-from-input`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activeTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Active To</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" data-testid={`${dataTestId}-active-to-input`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default DetailFormSegment
