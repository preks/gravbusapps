import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
import { DocumentTemplate } from '../types'

interface TemplatePreviewModalProps {
  template: DocumentTemplate | null
  isOpen: boolean
  onClose: () => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'template-preview-modal'

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  isOpen,
  onClose,
  prefixDataTestId = DATA_TEST_ID
}) => {
  if (!template) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-4xl gba:max-h-[80vh]" data-testid={prefixDataTestId}>
        <DialogHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <DialogTitle>{template.value}</DialogTitle>
              <DialogDescription className="gba:mt-1">
                <span className="gba:font-mono gba:text-xs">{template.code}</span>
                {template.description && (
                  <>
                    {' • '}
                    {template.description}
                  </>
                )}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid={`${prefixDataTestId}-close-button`}
              aria-label="Close"
            >
              <XIcon />
            </Button>
          </div>
        </DialogHeader>

        <div className="gba:mt-4 gba:space-y-4">
          <div className="gba:border gba:border-input gba:rounded-md gba:p-6 gba:bg-background gba:overflow-auto gba:max-h-[60vh]">
            <div
              dangerouslySetInnerHTML={{ __html: template.htmlContent }}
              data-testid={`${prefixDataTestId}-content`}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TemplatePreviewModal
