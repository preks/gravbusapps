import React from 'react'
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
  Button,
  Spinner,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system'
import { XIcon, ArrowClockwiseIcon, CheckCircleIcon } from '@phosphor-icons/react'
import type { AiResponsePopoverProps } from './aiTextGeneratorTypes'

export const AiResponsePopover: React.FC<AiResponsePopoverProps & { anchorRef?: React.RefObject<HTMLElement> }> = ({
  isOpen,
  onOpenChange,
  response,
  isLoading,
  error,
  onDiscard,
  onRefine,
  onInsert,
  anchorRef
}) => {
  if (!isOpen) return null

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      {anchorRef?.current && (
        <PopoverAnchor asChild>
          <div
            style={{
              position: 'absolute',
              top: anchorRef.current.getBoundingClientRect().top,
              left: anchorRef.current.getBoundingClientRect().left,
              width: anchorRef.current.offsetWidth,
              height: anchorRef.current.offsetHeight,
              pointerEvents: 'none'
            }}
          />
        </PopoverAnchor>
      )}
      <PopoverContent
        side="bottom"
        align="end"
        className="gba:w-auto gba:max-w-none gba:min-w-0 gba:p-0 gba:rounded-lg gba:overflow-visible gba:shadow-xl gba:border-0 gba:bg-gradient-to-bl gba:from-[var(--nw-color-white)] gba:to-[var(--nw-color-blue-200)] gba:min-w-[500px] gba:max-w-[700px]"
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={20}
      >
        <div className="gba:p-5" data-testid="ai-response-popover">
          {isLoading && (
            <div className="gba:text-center">
              <Spinner className="gba:w-8 gba:h-8 gba:mx-auto" />
              <div className="gba:mt-4 gba:text-sm gba:text-gray-800 gba:font-medium">Generating AI content...</div>
              <div className="gba:mt-1.5 gba:text-xs gba:text-gray-500">Please wait while we process your request</div>
            </div>
          )}

          {error && (
            <div className="gba:text-center">
              <div className="gba:text-sm gba:text-destructive gba:mb-3">Error generating content</div>
              <div className="gba:text-xs gba:text-gray-500 gba:mb-4">{error}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefine}
                className="gba:text-xs"
                data-testid="ai-response-retry-btn"
              >
                Try Again
              </Button>
            </div>
          )}

          {!isLoading && !error && response && (
            <>
              {/* Title Response */}
              <Card className="gba:mb-4" data-testid="ai-response-title-card">
                <CardHeader>
                  <CardTitle className="gba:text-sm">Title</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:text-sm gba:text-gray-800">{response.title}</div>
                </CardContent>
              </Card>

              {/* Preview Text Response */}
              <Card className="gba:mb-4" data-testid="ai-response-preview-card">
                <CardHeader>
                  <CardTitle className="gba:text-sm">Preview Text</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:text-sm gba:text-gray-800">{response.previewText}</div>
                </CardContent>
              </Card>

              {/* Content Response */}
              <Card className="gba:mb-4" data-testid="ai-response-content-card">
                <CardHeader>
                  <CardTitle className="gba:text-sm">Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="gba:text-sm gba:text-gray-800 gba:max-h-[200px] gba:overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: response.content }}
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:pt-2 gba:border-t gba:border-border">
                <Button variant="ghost" size="sm" onClick={onDiscard} data-testid="ai-response-discard-btn">
                  <XIcon className="gba:mr-2" size={16} />
                  Discard
                </Button>
                <Button variant="ghost" size="sm" onClick={onRefine} data-testid="ai-response-refine-btn">
                  <ArrowClockwiseIcon className="gba:mr-2" size={16} />
                  Refine
                </Button>
                <Button variant="default" size="sm" onClick={onInsert} data-testid="ai-response-insert-btn">
                  <CheckCircleIcon className="gba:mr-2" size={16} />
                  Insert
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
