import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Form validation schema
const campaignSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    type: z.string().min(1, 'Type is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    description: z.string().optional()
  })
  .refine(
    data => {
      if (data.startDate && data.endDate) {
        return dayjs(data.startDate).isBefore(dayjs(data.endDate))
      }
      return true
    },
    {
      message: 'End date must be after start date',
      path: ['endDate']
    }
  )

type CampaignFormData = z.infer<typeof campaignSchema>

export interface NewCampaignData {
  name: string
  type: string
  startDate: string
  endDate: string
  description?: string
}

interface AddCampaignModalProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: NewCampaignData) => Promise<void>
  isLoading?: boolean
}

const AddCampaignModal: React.FC<AddCampaignModalProps> = ({ isOpen, onClose, onSubmit, isLoading = false }) => {
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      type: '',
      startDate: '',
      endDate: '',
      description: ''
    }
  })

  const handleSubmit = async (data: CampaignFormData) => {
    try {
      await onSubmit(data)
      form.reset()
    } catch {
      console.error('Error submitting campaign')
    }
  }

  const campaignTypes = [
    { value: 'email', label: 'Email Campaign' },
    { value: 'social', label: 'Social Media Campaign' },
    { value: 'print', label: 'Print Campaign' },
    { value: 'digital', label: 'Digital Campaign' },
    { value: 'event', label: 'Event Campaign' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        style={{ maxWidth: 'var(--spacing-128)', width: '100%' }}
        className="gba:p-0"
        data-testid="add-campaign-modal"
      >
        <DialogHeader className="gba:p-6 gba:pb-0">
          <DialogTitle data-testid="add-campaign-modal-title">
            {getTranslationFromI18nKeyAndLabel('campaigns.modal.title', 'Create Campaign')}
          </DialogTitle>
          <DialogDescription className="gba:mt-1">
            {getTranslationFromI18nKeyAndLabel(
              'campaigns.modal.subtitle',
              'Provide basic details to create a new campaign.'
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} data-testid="add-campaign-form">
            <div className="gba:p-6 gba:space-y-4">
              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="add-campaign-name-label">
                      {getTranslationFromI18nKeyAndLabel('campaigns.modal.name.label', 'Name')}
                      <span style={{ color: 'var(--color-danger-500)' }}> *</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'campaigns.modal.name.placeholder',
                          'Enter campaign name'
                        )}
                        data-testid="add-campaign-name-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type Field */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="add-campaign-type-label">
                      {getTranslationFromI18nKeyAndLabel('campaigns.modal.type.label', 'Type')}
                      <span style={{ color: 'var(--color-danger-500)' }}> *</span>
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="add-campaign-type-select">
                          <SelectValue
                            placeholder={getTranslationFromI18nKeyAndLabel(
                              'campaigns.modal.type.placeholder',
                              'Select campaign type'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {campaignTypes.map(type => (
                            <SelectItem
                              key={type.value}
                              value={type.value}
                              data-testid={`add-campaign-type-option-${type.value}`}
                            >
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date Field */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="add-campaign-start-date-label">
                      {getTranslationFromI18nKeyAndLabel('campaigns.modal.startDate.label', 'Start Date')}
                      <span style={{ color: 'var(--color-danger-500)' }}> *</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="add-campaign-start-date-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date Field */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="add-campaign-end-date-label">
                      {getTranslationFromI18nKeyAndLabel('campaigns.modal.endDate.label', 'End Date')}
                      <span style={{ color: 'var(--color-danger-500)' }}> *</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="add-campaign-end-date-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="add-campaign-description-label">
                      {getTranslationFromI18nKeyAndLabel('campaigns.modal.description.label', 'Description')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'campaigns.modal.description.placeholder',
                          'Enter campaign description'
                        )}
                        data-testid="add-campaign-description-input"
                        style={{ minHeight: 'var(--spacing-20)' }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gba:p-6 gba:pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                data-testid="add-campaign-cancel-button"
              >
                {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="add-campaign-save-button">
                {isLoading
                  ? getTranslationFromI18nKeyAndLabel('common.saving', 'Saving...')
                  : getTranslationFromI18nKeyAndLabel('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddCampaignModal
