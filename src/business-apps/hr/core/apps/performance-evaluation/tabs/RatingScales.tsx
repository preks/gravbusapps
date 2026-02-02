import React, { useState } from 'react'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useTranslation,
  Spinner
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import type { RatingScale } from '../types'
import RatingScaleEditorModal, { RatingScaleValues } from '../RatingScaleEditorModal'
import translations from '../_i18n'

/** Display "1 star"/"2 stars" etc. as ★, ★★, … in the Rating Scales table. */
function formatRatingScaleValueForDisplay(value: string): string {
  const re = /^(\d+)\s+stars?$/i
  const match = re.exec(value.trim())
  if (match) {
    const n = Math.max(0, Math.min(parseInt(match[1], 10), 10))
    return '★'.repeat(n)
  }
  return value
}

export interface RatingScalesProps {
  ratingScales: RatingScale[]
  ratingScalesLoading: boolean
  ratingScalesError: string | null
  /** Optional; kept for parent API compatibility. */
  refetchRatingScales?: () => Promise<void>
  onSaveFromScaleModal: (values: RatingScaleValues) => Promise<void>
  onDeleteScale: (scale: RatingScale) => Promise<void>
}

export const RatingScales: React.FC<RatingScalesProps> = ({
  ratingScales,
  ratingScalesLoading,
  ratingScalesError,
  onSaveFromScaleModal,
  onDeleteScale
}) => {
  const { t } = useTranslation(translations)
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false)
  const [editingScale, setEditingScale] = useState<RatingScale | null>(null)

  const handleAdd = () => {
    setEditingScale(null)
    setIsScaleModalOpen(true)
  }

  const handleSaveFromModal = async (values: RatingScaleValues) => {
    await onSaveFromScaleModal(values)
    setEditingScale(null)
    setIsScaleModalOpen(false)
  }

  return (
    <div className="gba:space-y-6">
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">{t('tab-rating-scales')}</CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2">
              {ratingScalesLoading && (
                <Spinner className="gba:h-5 gba:w-5" data-testid="performance-rating-scales-loading" />
              )}
              <Button variant="default" onClick={handleAdd} data-testid="performance-rating-scales-add-button">
                <PlusIcon className="gba:mr-2" size={16} />
                {t('button-add')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ratingScalesError && (
            <div
              className="gba:mb-4 gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-destructive gba:text-sm"
              data-testid="performance-rating-scales-error"
            >
              {ratingScalesError}
            </div>
          )}
          <div className="gba:border gba:rounded-lg gba:overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-[24px]"></TableHead>
                  <TableHead>{t('table-name')}</TableHead>
                  <TableHead>{t('table-values')}</TableHead>
                  <TableHead className="gba:text-right">{t('table-actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratingScalesLoading && ratingScales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="gba:py-8 gba:text-center">
                      <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                    </TableCell>
                  </TableRow>
                ) : ratingScales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="gba:text-center gba:text-muted-foreground">
                      {t('empty-no-rating-scales')}
                    </TableCell>
                  </TableRow>
                ) : (
                  ratingScales.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="gba:font-medium">{s.name}</TableCell>
                      <TableCell>{s.values.map(formatRatingScaleValueForDisplay).join(', ')}</TableCell>
                      <TableCell className="gba:text-right">
                        <div className="gba:flex gba:justify-end gba:gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingScale(s)
                              setIsScaleModalOpen(true)
                            }}
                            aria-label="Edit Scale"
                          >
                            {t('button-edit')}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteScale(s)}
                            aria-label="Delete Scale"
                          >
                            {t('button-delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <RatingScaleEditorModal
        open={isScaleModalOpen}
        onOpenChange={open => setIsScaleModalOpen(open)}
        onSave={handleSaveFromModal}
        initialValues={
          editingScale
            ? {
                id: editingScale.id,
                name: editingScale.name,
                values: editingScale.values
              }
            : undefined
        }
      />
    </div>
  )
}

export default RatingScales
