/**
 * Case Form Component
 *
 * Form for creating and editing cases
 */

import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DateInput,
  Button
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { Save, X } from 'lucide-react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { CreateCaseRequest, CaseMetadata } from '../types'
import { PRIORITY_OPTIONS } from '../utils'
import { generateCorrelationId } from '@/common/utils/correlationId'

interface CaseFormProps {
  context: BusinessAppContextProps
  appTag: string
  initialData?: Partial<CaseMetadata>
  onSubmit: (data: CreateCaseRequest) => Promise<void>
  onCancel: () => void
  mode?: 'create' | 'edit'
}

interface CaseFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  assignedTo: string
  dueDate: string
}

export const CaseForm: React.FC<CaseFormProps> = ({
  context,
  appTag,
  initialData,
  onSubmit,
  onCancel,
  mode = 'create'
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CaseFormData>({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      priority: initialData?.priority || 'medium',
      assignedTo: initialData?.assignedTo || context.userInfo?.id || '',
      dueDate: initialData?.dueDate || ''
    }
  })

  const handleSubmit = async (data: CaseFormData) => {
    try {
      setIsSubmitting(true)

      const requestData: CreateCaseRequest = {
        initiator: context.userInfo?.id || 'system',
        title: data.title,
        description: data.description,
        correlationId: generateCorrelationId(),
        tags: [appTag],
        assignment: {
          assignmentMode: 'ASSIGN',
          assignTo: data.assignedTo
        },
        metadata: {
          title: data.title,
          description: data.description,
          status: 'open',
          priority: data.priority,
          assignedTo: data.assignedTo,
          dueDate: data.dueDate || undefined,
          linkedEntities: [],
          notes: []
        }
      }

      await onSubmit(requestData)
    } catch (error) {
      console.error('Failed to submit case:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Create New Case' : 'Edit Case'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              rules={{ required: 'Title is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter case title" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter case description" rows={4} {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>Provide additional context about this case</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assigned To */}
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <FormControl>
                    <Input placeholder="User ID" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>User ID to assign this case to</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <DateInput value={field.value} onChange={field.onChange} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Case' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
