import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface HoursDiscrepancy {
  date: string
  dateFormatted: string
  allocatedHours: string // HH:MM format
  recordedHours: string // HH:MM format
  type: 'under' | 'over' // Type of discrepancy for this specific day
}

export type DiscrepancyType = 'under' | 'over' | 'mixed'

export interface SubmitConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  discrepancies: HoursDiscrepancy[]
  discrepancyType: DiscrepancyType
  onCancel: () => void
  onConfirm: () => void
  isSubmitting?: boolean
}

const SubmitConfirmationDialog: React.FC<SubmitConfirmationDialogProps> = ({
  open,
  onOpenChange,
  discrepancies,
  discrepancyType,
  onCancel,
  onConfirm,
  isSubmitting = false
}) => {
  const getTitle = () => {
    switch (discrepancyType) {
      case 'under':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.smart_booking.undistributed_hours_title',
          'Undistributed Hours'
        )
      case 'over':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.smart_booking.overdistributed_hours_title',
          'Over-distributed Hours'
        )
      case 'mixed':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.smart_booking.hours_mismatch_title',
          'Hours Mismatch'
        )
    }
  }

  const getDescription = () => {
    switch (discrepancyType) {
      case 'under':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.smart_booking.undistributed_hours_description',
          'You have not distributed all your recorded hours for the following days. Are you sure you want to submit?'
        )
      case 'over':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.smart_booking.overdistributed_hours_description',
          'You have distributed more hours than recorded for the following days. Are you sure you want to submit?'
        )
      case 'mixed':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_tracking.smart_booking.hours_mismatch_description',
          'The distributed hours do not match the recorded hours for the following days. Are you sure you want to submit?'
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <WarningCircleIcon className="gba:h-5 gba:w-5 gba:text-warning" weight="fill" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.date', 'Date')}
              </TableHead>
              <TableHead className="gba:text-center">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.recorded', 'Recorded')}
              </TableHead>
              <TableHead className="gba:text-center">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.distributed', 'Distributed')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discrepancies.map(discrepancy => (
              <TableRow key={discrepancy.date}>
                <TableCell className="gba:font-medium">{discrepancy.dateFormatted}</TableCell>
                <TableCell className="gba:text-center">{discrepancy.recordedHours}</TableCell>
                <TableCell
                  className={`gba:text-center gba:font-semibold ${
                    discrepancy.type === 'under' ? 'gba:text-warning' : 'gba:text-info'
                  }`}
                >
                  {discrepancy.allocatedHours}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.cancel', 'Cancel')}
          </Button>
          <Button variant="default" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting
              ? getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.submitting', 'Submitting...')
              : getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.smart_booking.submit', 'Submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SubmitConfirmationDialog
