/**
 * PresentMode Component
 *
 * Full-screen presentation mode using Spectacle Deck.
 * Provides keyboard navigation and presenter notes.
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import { Deck, Slide, Heading, Text, FlexBox } from 'spectacle'

export interface PresentModeProps {
  slides: Array<{
    id: string
    type: 'title' | 'content'
    title?: string
    content?: string
    layout?: 'center' | 'left' | 'two-column'
  }>
  onExit: () => void
  'data-testid'?: string
}

/**
 * PresentMode Component
 */
export const PresentMode: React.FC<PresentModeProps> = ({ slides, onExit, 'data-testid': testId = 'present-mode' }) => {
  return (
    <div className="gba:fixed gba:inset-0 gba:z-50 gba:bg-background" data-testid={testId}>
      <div className="gba:absolute gba:top-4 gba:right-4 gba:z-10">
        <Button variant="ghost" size="sm" onClick={onExit} data-testid={`${testId}-exit`}>
          <X className="gba:w-4 gba:h-4 gba:mr-1" />
          Exit
        </Button>
      </div>
      <Deck>
        {slides.map(slideContent => (
          // eslint-disable-next-line newwork-local/no-hardcoded-colors -- Spectacle component requires string color
          <Slide key={slideContent.id} backgroundColor="white">
            <FlexBox
              height="100%"
              flexDirection="column"
              justifyContent={slideContent.layout === 'center' ? 'center' : 'flex-start'}
              alignItems={slideContent.layout === 'center' ? 'center' : 'flex-start'}
              padding="4rem"
            >
              {slideContent.title && (
                <Heading fontSize="h1" margin="0 0 2rem 0">
                  {slideContent.title}
                </Heading>
              )}
              {slideContent.content && (
                <Text fontSize="1.75rem" margin="0">
                  {slideContent.content}
                </Text>
              )}
            </FlexBox>
          </Slide>
        ))}
      </Deck>
    </div>
  )
}

export default PresentMode
