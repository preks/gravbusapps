import React, { useState, useEffect } from 'react'
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
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Alert,
  AlertDescription,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react'
import type { CatalogEntry } from '@/common/data/catalog'
import {
  generateCode,
  generateShortcode,
  mapEmojiToCatalogEntry,
  mapCustomToCatalogEntry,
  generateParentEntry,
  generateSkinToneVariants,
  supportsSkinTones
} from '../utils/emojiUtils'

interface ReactionFormData {
  type: 'EMOJI' | 'CUSTOM'
  code: string
  value: string
  description: string
  additionalValue1: string
  additionalValue2: string
  additionalValue3: string
  alternativeCode: string
  displayOrder: number
}

interface ReactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ReactionFormData | ReactionFormData[]) => Promise<void>
  submitting: boolean
  initialData?: CatalogEntry
  nextDisplayOrder?: number
  prefixDataTestId?: string
}

export const ReactionFormDialog: React.FC<ReactionFormDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  initialData,
  nextDisplayOrder = 0,
  prefixDataTestId = 'reaction-form'
}) => {
  const [reactionType, setReactionType] = useState<'EMOJI' | 'CUSTOM'>('EMOJI')
  const [selectedEmoji, setSelectedEmoji] = useState<string>('')
  const [selectedEmojiData, setSelectedEmojiData] = useState<EmojiClickData | null>(null)
  const [customImageUrl, setCustomImageUrl] = useState<string>('')

  const form = useForm<ReactionFormData>({
    defaultValues: {
      type: 'EMOJI',
      code: '',
      value: '',
      description: '',
      additionalValue1: '',
      additionalValue2: '',
      additionalValue3: '',
      alternativeCode: '',
      displayOrder: nextDisplayOrder
    }
  })

  useEffect(() => {
    if (initialData && open) {
      setReactionType((initialData.type as 'EMOJI' | 'CUSTOM') || 'EMOJI')
      setSelectedEmoji(initialData.description || '')
      setCustomImageUrl(initialData.additionalValue2 || '')
      form.reset({
        type: (initialData.type as 'EMOJI' | 'CUSTOM') || 'EMOJI',
        code: initialData.code || '',
        value: initialData.value || '',
        description: initialData.description || '',
        additionalValue1: initialData.additionalValue1 || '',
        additionalValue2: initialData.additionalValue2 || '',
        additionalValue3: initialData.additionalValue3 || '',
        alternativeCode: initialData.alternativeCode || '',
        displayOrder: initialData.displayOrder || 0
      })
    } else if (!initialData && open) {
      setReactionType('EMOJI')
      setSelectedEmoji('')
      setCustomImageUrl('')
      form.reset()
    }
  }, [initialData, open, form])

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const displayName = emojiData.names[0] || 'Reaction'
    const mappedData = mapEmojiToCatalogEntry(emojiData, displayName, form.getValues('displayOrder') || 0)

    setSelectedEmoji(emojiData.emoji)
    setSelectedEmojiData(emojiData) // Store emoji data for skin tone generation
    form.setValue('type', 'EMOJI')
    form.setValue('value', displayName) // User can edit this
    form.setValue('code', mappedData.code)
    form.setValue('description', mappedData.description)
    form.setValue('additionalValue1', mappedData.additionalValue1)
    form.setValue('additionalValue2', mappedData.additionalValue2)
    form.setValue('additionalValue3', mappedData.additionalValue3)
    form.setValue('alternativeCode', mappedData.alternativeCode)
  }

  const handleImageUrlChange = (url: string) => {
    setCustomImageUrl(url)
    const displayName = form.getValues('value') || 'Custom Reaction'
    const mappedData = mapCustomToCatalogEntry(displayName, url, form.getValues('displayOrder') || 0)

    form.setValue('type', 'CUSTOM')
    form.setValue('code', mappedData.code)
    form.setValue('description', mappedData.description)
    form.setValue('additionalValue1', mappedData.additionalValue1)
    form.setValue('additionalValue2', mappedData.additionalValue2)
    form.setValue('additionalValue3', mappedData.additionalValue3)
    form.setValue('alternativeCode', mappedData.alternativeCode)
  }

  const handleSubmit = async (data: ReactionFormData) => {
    // For EMOJI type with new creation
    if (data.type === 'EMOJI' && selectedEmojiData && !initialData) {
      const baseCode = generateCode(data.value)
      const parentId = `ContentReaction:v1:${baseCode}`

      // Generate parent entry
      const parentEntry = generateParentEntry(selectedEmojiData, data.value, data.displayOrder)

      // Check if emoji supports skin tones
      if (supportsSkinTones(selectedEmojiData.unifiedWithoutSkinTone)) {
        // Generate all skin tone variants
        const variants = generateSkinToneVariants(selectedEmojiData, data.value, data.displayOrder, parentId)

        // Submit parent + all children
        await onSubmit([parentEntry, ...variants])
      } else {
        // Submit only parent (no skin tone support)
        await onSubmit(parentEntry)
      }
    } else {
      // For CUSTOM type or updates, submit single entry
      await onSubmit(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid={prefixDataTestId}>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Reaction' : 'Create Reaction'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update reaction details' : 'Add a new emoji or custom reaction'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-4">
            <Tabs value={reactionType} onValueChange={v => setReactionType(v as 'EMOJI' | 'CUSTOM')}>
              <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
                <TabsTrigger value="EMOJI" data-testid={`${prefixDataTestId}-emoji-tab`}>
                  Emoji
                </TabsTrigger>
                <TabsTrigger value="CUSTOM" data-testid={`${prefixDataTestId}-custom-tab`}>
                  Custom Image
                </TabsTrigger>
              </TabsList>

              <TabsContent value="EMOJI" className="gba:space-y-4">
                <div className="gba:flex gba:justify-center gba:my-4">
                  {selectedEmoji && (
                    <div className="gba:text-center">
                      <div className="gba:text-6xl gba:mb-2">{selectedEmoji}</div>
                      <Badge>{form.watch('additionalValue2')}</Badge>
                    </div>
                  )}
                </div>
                <div className="gba:flex gba:justify-center [&_.epr-emoji-category-label]:gba:mb-2 [&_.epr-emoji-list]:gba:gap-1">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={Theme.AUTO}
                    emojiStyle={EmojiStyle.NATIVE}
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                    autoFocusSearch={false}
                    width="100%"
                    height="400px"
                  />
                </div>

                {selectedEmojiData && selectedEmojiData.names.length > 1 && (
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Name</FormLabel>
                        <Select
                          onValueChange={value => {
                            field.onChange(value)
                            // Update code and shortcode when name changes
                            const newCode = generateCode(value)
                            form.setValue('code', newCode)
                            form.setValue('alternativeCode', generateShortcode(value))
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid={`${prefixDataTestId}-name-select`}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectedEmojiData.names.map(name => (
                              <SelectItem key={`reaction-name-${name}`} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>

              <TabsContent value="CUSTOM" className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="additionalValue2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://cdn.example.com/emoji/custom.png"
                          onChange={e => {
                            field.onChange(e)
                            handleImageUrlChange(e.target.value)
                          }}
                          data-testid={`${prefixDataTestId}-image-url-input`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {customImageUrl && (
                  <div className="gba:flex gba:justify-center gba:p-4 gba:border gba:rounded">
                    <img
                      src={customImageUrl}
                      alt="Preview"
                      className="gba:w-16 gba:h-16"
                      onError={() => {
                        setCustomImageUrl('')
                        form.setError('additionalValue2', { message: 'Invalid image URL' })
                      }}
                    />
                  </div>
                )}
                <Alert>
                  <AlertDescription>
                    For custom reactions, provide a publicly accessible image URL (PNG, SVG, or GIF recommended)
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Thumbs Up"
                      onChange={e => {
                        field.onChange(e)
                        // Auto-update code when name changes
                        const newCode = generateCode(e.target.value)
                        form.setValue('code', newCode)
                        form.setValue('alternativeCode', generateShortcode(e.target.value))
                      }}
                      data-testid={`${prefixDataTestId}-value-input`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code (Auto-generated)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled data-testid={`${prefixDataTestId}-code-input`} />
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
                      {...field}
                      type="number"
                      onChange={e => field.onChange(Number.parseInt(e.target.value, 10))}
                      data-testid={`${prefixDataTestId}-order-input`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || (!selectedEmoji && !customImageUrl)}
                data-testid={`${prefixDataTestId}-submit`}
              >
                {(() => {
                  if (submitting) return initialData ? 'Updating...' : 'Creating...'
                  return initialData ? 'Update' : 'Create'
                })()}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
