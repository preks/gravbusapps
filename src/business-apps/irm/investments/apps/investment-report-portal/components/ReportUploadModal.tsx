import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Textarea
} from '@newwork/nw-design-system'
import { FileText, FolderOpen } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { Investment, InvestmentAccount, InvestmentContact, ReportScope } from '@/common/data/investment'
import dayjs from 'dayjs'

interface ReportUploadModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  investments: Investment[]
  accounts: InvestmentAccount[]
  contacts: InvestmentContact[]
  prefixDataTestId: string
}

interface FormValues {
  investmentId: string
  date: string
  scope: ReportScope
  description: string
  notes: string
}

export const ReportUploadModal: React.FC<ReportUploadModalProps> = ({ visible, onCancel, onSuccess, investments }) => {
  const [isUploading, setIsUploading] = useState(false)
  const [fileList, setFileList] = useState<any[]>([])

  const form = useForm<FormValues>({
    defaultValues: {
      date: dayjs().format('YYYY-MM-DD'),
      scope: 'MONTHLY' as ReportScope
    }
  })

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsUploading(true)

      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // TODO: Implement actual file upload and report creation
      // This will be handled by the backend endpoints
      console.log('Upload values:', values)
      console.log('Files:', fileList)

      // TODO: Replace with proper toast notification
      console.log('Report uploaded successfully')
      setFileList([])
      form.reset()
      onSuccess()
    } catch (error) {
      console.error('Upload error:', error)
      // TODO: Replace with proper toast notification
      console.error('Failed to upload report')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setFileList([])
    form.reset()
    onCancel()
  }

  const reportScopeOptions = [
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.daily', 'Daily'), value: 'DAILY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.weekly', 'Weekly'), value: 'WEEKLY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.monthly', 'Monthly'), value: 'MONTHLY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.quarterly', 'Quarterly'), value: 'QUARTERLY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.yearly', 'Yearly'), value: 'YEARLY' }
  ]

  return (
    <Dialog open={visible} onOpenChange={open => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} />
            {getTranslationFromI18nKeyAndLabel('report.upload.title', 'Upload Investment Report')}
          </DialogTitle>
          <DialogDescription>Upload a new investment report file and provide metadata</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* File Upload */}
            <FormField
              control={form.control}
              name="file"
              rules={{ required: 'Please select a file' }}
              render={() => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('report.upload.file', 'Report File')}</FormLabel>
                  <FormControl>
                    <div
                      style={{
                        border: '2px dashed #d1d5db',
                        borderRadius: '8px',
                        padding: '32px',
                        textAlign: 'center',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        // TODO: Implement file picker
                        console.log('File picker clicked')
                      }}
                    >
                      <FolderOpen size={48} className="gba:text-muted-foreground gba:mb-4" />
                      <p className="gba:my-2 gba:text-base gba:font-medium">
                        {getTranslationFromI18nKeyAndLabel(
                          'report.upload.dragText',
                          'Click or drag file to this area to upload'
                        )}
                      </p>
                      <p className="gba:my-2 gba:text-sm gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'report.upload.hint',
                          'Support for PDF, Word, Excel, and text files. Max size: 10MB.'
                        )}
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Investment Selection */}
            <FormField
              control={form.control}
              name="investmentId"
              rules={{ required: 'Please select an investment' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('report.upload.investment', 'Investment')}</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'report.upload.investment.placeholder',
                            'Select investment'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {investments.map(investment => (
                          <SelectItem key={investment.id} value={investment.id}>
                            {investment.name} {investment.code && `(${investment.code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Report Date */}
            <FormField
              control={form.control}
              name="date"
              rules={{ required: 'Please select a report date' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('report.upload.date', 'Report Date')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Report Scope */}
            <FormField
              control={form.control}
              name="scope"
              rules={{ required: 'Please select a report scope' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('report.upload.scope', 'Report Scope')}</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'report.upload.scope.placeholder',
                            'Select scope'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {reportScopeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('report.upload.description', 'Description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'report.upload.description.placeholder',
                        'Optional description of the report content'
                      )}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('report.upload.notes', 'Additional Notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'report.upload.notes.placeholder',
                        'Any additional notes or comments'
                      )}
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                {getTranslationFromI18nKeyAndLabel('button.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={fileList.length === 0 || isUploading}>
                {isUploading ? 'Uploading...' : getTranslationFromI18nKeyAndLabel('button.upload', 'Upload')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
