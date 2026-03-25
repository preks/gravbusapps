import { Sheet, SheetContent } from '@newwork/nw-design-system'
import ExpenseDetailsShell from '../../../../../../common/components/details-panel/ExpenseDetailsShell'
import AdvancePaymentDetailsBackoffice from '../AdvancePaymentDetailsBackoffice'
import type { AdvancePaymentItem } from '../../../../types'
import type { TranslateFn } from '../../../../utils/utils'
import type { UserInfoProps } from '@/common/BusinessAppContext'

interface AdvancePaymentsDetailsSheetProps {
  selectedItem: AdvancePaymentItem | null
  accessToken: string
  userInfo: UserInfoProps | undefined
  t: TranslateFn
  onClose: () => void
}

export default function AdvancePaymentsDetailsSheet({
  selectedItem,
  accessToken,
  userInfo,
  t,
  onClose
}: Readonly<AdvancePaymentsDetailsSheetProps>) {
  return (
    <Sheet open={selectedItem !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
        <ExpenseDetailsShell
          title={selectedItem?.title || selectedItem?.description || t('advance-payment-details-title')}
        >
          {selectedItem ? (
            <AdvancePaymentDetailsBackoffice payment={selectedItem} accessToken={accessToken} userInfo={userInfo} />
          ) : null}
        </ExpenseDetailsShell>
      </SheetContent>
    </Sheet>
  )
}
