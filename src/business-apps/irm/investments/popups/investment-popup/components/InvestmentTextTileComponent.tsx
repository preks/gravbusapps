import React, { useEffect } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Alert
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentPopupForm } from '../hooks/useInvestmentPopupForm'
import { useTileSubmission } from '../hooks/useTileSubmission'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { INVESTMENT_ERRORS } from '../utils/investmentPopupUtils'
import { findTileById, TileData } from '@/common/components/investment/tiles'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const prefixDataTestId = 'investment-text-tile-component'

// Form validation schema
const textTileFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  textContent: z.string().optional()
})

type TextTileFormData = z.infer<typeof textTileFormSchema>

interface InvestmentTextTileComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (tileData: TileData) => void
  tileId?: string
}

export const InvestmentTextTileComponent: React.FC<InvestmentTextTileComponentProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData,
  tileId
}) => {
  // Use common setup hook
  const { businessAppContext, investmentId, investment, loading, error } = useInvestmentPopupForm({
    accessToken,
    userInfo,
    additionalData,
    scope: 'text'
  })

  // Use tile submission hook
  const { isEditMode, buildTileSubmission } = useTileSubmission({
    investment,
    businessAppContext,
    tileId,
    tileType: 'TEXT',
    businessKeyPrefix: 'investment-text-tile'
  })

  // Initialize form
  const form = useForm<TextTileFormData>({
    resolver: zodResolver(textTileFormSchema),
    defaultValues: {
      title: '',
      textContent: ''
    }
  })

  // Load existing tile data if editing
  useEffect(() => {
    if (investment && isEditMode && tileId) {
      const existingTile = findTileById(investment, tileId)
      if (existingTile) {
        form.reset({
          title: existingTile.title || '',
          textContent: existingTile.textContent || ''
        })
      }
    }
  }, [investment, isEditMode, tileId, form])

  // Validate required data (after all hooks are called)
  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'missing-investment-id')}>
        {INVESTMENT_ERRORS.MISSING_ID()}
      </Alert>
    )
  }

  // Handle form submission
  const handleSubmit = async (formData: TextTileFormData) => {
    // Build tile submission with specific data
    const { payload, tileData } = buildTileSubmission({
      title: formData.title,
      textContent: formData.textContent || ''
    })

    // Call success callback
    if (onSave) {
      onSave(tileData)
    }

    // Return the payload for AppActionForm to handle
    return payload
  }

  const formTitle = isEditMode
    ? getTranslationFromI18nKeyAndLabel('investment.tiles.editTextTile', 'Edit Text Tile')
    : getTranslationFromI18nKeyAndLabel('investment.tiles.createTextTile', 'Create Text Tile')

  return (
    <InvestmentPopupFormWrapper
      loading={loading}
      error={error}
      investment={investment}
      onSubmit={handleSubmit}
      onClose={onClose}
      form={form}
      businessAppContext={businessAppContext}
      prefixDataTestId={prefixDataTestId}
      loadingMessage={getTranslationFromI18nKeyAndLabel('investment.tiles.loading', 'Loading investment data...')}
    >
      <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-form-content`}>
        <h3 className="gba:text-lg gba:font-semibold">{formTitle}</h3>

        {/* Title Input */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.tiles.titleLabel', 'Title')}{' '}
                <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.titlePlaceholder',
                    'Enter tile title'
                  )}
                  data-testid={formatDataTestId(prefixDataTestId, 'title-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Text Content Textarea */}
        <FormField
          control={form.control}
          name="textContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('investment.tiles.contentLabel', 'Content')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.contentPlaceholder',
                    'Enter text content...'
                  )}
                  rows={8}
                  data-testid={formatDataTestId(prefixDataTestId, 'content-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </InvestmentPopupFormWrapper>
  )
}

export default InvestmentTextTileComponent
