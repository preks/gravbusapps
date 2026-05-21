import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InlineContactCreateForm } from './InlineContactCreateForm'
import { InlineAccountCreateForm } from './InlineAccountCreateForm'
import type {
  InlineEntityDraft,
  InlineAccountFormConfig,
  InlineContactFormConfig,
  InlineEntityCreateRenderProps
} from './types'
import translations from './_i18n'

export type InlineEntityCreatePopupProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessAppContext: BusinessAppContextProps
  draftId?: string
  defaultValues?: Record<string, any>
  onConfirm: (draft: InlineEntityDraft) => void
  'data-testid'?: string
} & (
  | { entity: 'account'; formConfig: InlineAccountFormConfig }
  | { entity: 'contact'; formConfig: InlineContactFormConfig }
)

const InlineEntityCreatePopup: React.FC<InlineEntityCreatePopupProps> = props => {
  const {
    open,
    onOpenChange,
    businessAppContext,
    draftId,
    defaultValues,
    onConfirm,
    'data-testid': testId = 'inline-entity-create-popup'
  } = props

  const { t } = useTranslation(translations)

  const isEdit = !!draftId
  const isContact = props.entity === 'contact'

  let titleKey: string
  if (isEdit) {
    titleKey = isContact ? 'edit-contact-title' : 'edit-account-title'
  } else {
    titleKey = isContact ? 'create-contact-title' : 'create-account-title'
  }

  const descriptionKey = isContact ? 'create-contact-description' : 'create-account-description'

  const handleCancel = React.useCallback(() => onOpenChange(false), [onOpenChange])

  const handleConfirm = React.useCallback(
    (draft: InlineEntityDraft) => {
      onConfirm(draft)
      onOpenChange(false)
    },
    [onConfirm, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-2xl gba:p-0 gba:gap-0 gba:overflow-hidden gba:rounded-xl"
        data-testid={testId}
      >
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-2">
          <DialogTitle data-testid={`${testId}-title`}>{t(titleKey)}</DialogTitle>
          <DialogDescription data-testid={`${testId}-description`}>{t(descriptionKey)}</DialogDescription>
        </DialogHeader>
        <div className="gba:px-6 gba:pb-6">
          {props.entity === 'contact' ? (
            <InlineContactCreateForm
              key={`${draftId || 'new'}-${open ? 'open' : 'closed'}`}
              formConfig={props.formConfig}
              businessAppContext={businessAppContext}
              defaultValues={defaultValues}
              draftId={draftId}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              dataTestId={`${testId}-contact`}
            />
          ) : (
            <InlineAccountCreateForm
              key={`${draftId || 'new'}-${open ? 'open' : 'closed'}`}
              formConfig={props.formConfig}
              businessAppContext={businessAppContext}
              defaultValues={defaultValues}
              draftId={draftId}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              dataTestId={`${testId}-account`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

type InlineEntityPopupRendererConfig = {
  businessAppContext: BusinessAppContextProps
} & (
  | { entity: 'account'; formConfig: InlineAccountFormConfig }
  | { entity: 'contact'; formConfig: InlineContactFormConfig }
)

export const createInlineEntityPopupRenderer = (config: InlineEntityPopupRendererConfig) => {
  if (config.entity === 'account') {
    return (popupProps: InlineEntityCreateRenderProps) => (
      <InlineEntityCreatePopup
        {...popupProps}
        entity="account"
        businessAppContext={config.businessAppContext}
        formConfig={config.formConfig}
      />
    )
  }

  return (popupProps: InlineEntityCreateRenderProps) => (
    <InlineEntityCreatePopup
      {...popupProps}
      entity="contact"
      businessAppContext={config.businessAppContext}
      formConfig={config.formConfig}
    />
  )
}

export default InlineEntityCreatePopup
export { InlineEntityCreatePopup }
