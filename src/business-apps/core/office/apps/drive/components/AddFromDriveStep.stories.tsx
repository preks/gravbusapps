// Storybook stories for the AddFromDriveStep component.

import type { Meta, StoryObj } from '@storybook/react'
import { AddFromDriveStep } from './AddFromDriveStep'

const meta: Meta<typeof AddFromDriveStep> = {
  title: 'Drive/AddFromDriveStep',
  component: AddFromDriveStep,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Browse the user\'s personal Drive and select items to add to a Space via shortcuts. ' +
          'Used inside DriveExternalImportSheet when a spaceId is provided.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    accessToken: { description: 'Auth token for Drive API calls', control: 'text' },
    spaceId: { description: 'Target Space ID to create shortcuts in', control: 'text' },
    targetFolderId: { description: 'Optional folder in the Space to place shortcuts into', control: 'text' },
    onBack: { description: 'Called when Back button is clicked', action: 'back' },
    onComplete: { description: 'Called after items are successfully added', action: 'complete' }
  },
  decorators: [
    Story => (
      <div style={{ width: 520, height: 600, border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
        <Story />
      </div>
    )
  ]
}

export default meta
type Story = StoryObj<typeof AddFromDriveStep>

export const Default: Story = {
  args: {
    accessToken: 'mock-token',
    spaceId: 'space-123',
    targetFolderId: null
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Default state showing the personal Drive browser with search, folder navigation, and multi-select.'
      }
    }
  }
}

export const WithTargetFolder: Story = {
  args: {
    accessToken: 'mock-token',
    spaceId: 'space-123',
    targetFolderId: 'folder-456'
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'When targetFolderId is set, shortcuts are created inside that folder in the Space Drive.'
      }
    }
  }
}
