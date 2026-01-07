import { Button, ActionButton, Toggle, ToggleGroup, ToggleGroupItem, toast } from '@newwork/nw-design-system'
import { Star, Heart, Bell, House, Gear, User } from '@phosphor-icons/react'
import ComponentShowcase from './ComponentShowcase'

/**
 * Comprehensive showcase of all button and interactive components
 */
export function ButtonsShowcase() {
  const sampleActions = [
    {
      label: 'Create',
      onSelect: () => toast.success('Create action'),
      isPrimary: true
    },
    { label: 'Edit', onSelect: () => toast.info('Edit action') },
    { label: 'Delete', onSelect: () => toast.error('Delete action') }
  ]

  return (
    <div className="gba:space-y-8" data-testid="buttons-showcase">
      {/* Basic Buttons */}
      <ComponentShowcase title="Button Variants" description="All available button styles and states">
        <div className="gba:space-y-4">
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Button onClick={() => toast.success('Primary button clicked')}>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>

          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>

          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </ComponentShowcase>

      {/* Action Button */}
      <ComponentShowcase
        title="Action Button"
        description="Standardized control for business actions with dropdown menu"
      >
        <div className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            <div>
              <h4 className="gba:text-sm gba:font-medium gba:mb-2">Single Action</h4>
              <ActionButton
                actions={[
                  {
                    label: 'Create New',
                    onSelect: () => toast.success('Single action')
                  }
                ]}
              />
            </div>

            <div>
              <h4 className="gba:text-sm gba:font-medium gba:mb-2">Multiple Actions</h4>
              <ActionButton actions={sampleActions} />
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            <div>
              <h4 className="gba:text-sm gba:font-medium gba:mb-2">Different Variants</h4>
              <div className="gba:space-x-2">
                <ActionButton actions={[{ label: 'Default', onSelect: () => {} }]} />
                <ActionButton actions={[{ label: 'Outline', onSelect: () => {} }]} />
              </div>
            </div>

            <div>
              <h4 className="gba:text-sm gba:font-medium gba:mb-2">With States</h4>
              <div className="gba:space-x-2">
                <ActionButton actions={[{ label: 'Disabled', onSelect: () => {} }]} disabled={true} />
              </div>
            </div>
          </div>
        </div>
      </ComponentShowcase>

      {/* Toggle Components */}
      <ComponentShowcase title="Toggle Components" description="Toggle buttons for on/off states and selections">
        <div className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Basic Toggles</h4>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              <Toggle>Default</Toggle>
              <Toggle variant="outline">Outline</Toggle>
              <Toggle pressed={true}>Active</Toggle>
              <Toggle disabled>Disabled</Toggle>
            </div>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Toggles with Icons</h4>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              <Toggle>
                <Star size={16} />
                Favorite
              </Toggle>
              <Toggle variant="outline">
                <Bell size={16} />
                Notifications
              </Toggle>
              <Toggle pressed={true}>
                <Heart size={16} />
                Like
              </Toggle>
              <Toggle>
                <User size={16} />
              </Toggle>
            </div>
          </div>
        </div>
      </ComponentShowcase>

      {/* Toggle Groups */}
      <ComponentShowcase
        title="Toggle Groups"
        description="Grouped toggle controls for mutually exclusive or multiple selections"
      >
        <div className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Text Alignment</h4>
            <ToggleGroup defaultValue="center">
              <ToggleGroupItem value="left" aria-label="Align left">
                Left
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Align center">
                Center
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="Align right">
                Right
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Navigation with Icons</h4>
            <ToggleGroup defaultValue="dashboard" variant="secondary">
              <ToggleGroupItem value="dashboard" aria-label="Dashboard">
                <House size={16} />
                Dashboard
              </ToggleGroupItem>
              <ToggleGroupItem value="analytics" aria-label="Analytics">
                <Star size={16} />
                Analytics
              </ToggleGroupItem>
              <ToggleGroupItem value="settings" aria-label="Settings">
                <Gear size={16} />
                Settings
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">Icon-Only Toggle Group</h4>
            <ToggleGroup defaultValue="heart">
              <ToggleGroupItem value="star" aria-label="Star">
                <Star size={16} />
              </ToggleGroupItem>
              <ToggleGroupItem value="heart" aria-label="Heart">
                <Heart size={16} />
              </ToggleGroupItem>
              <ToggleGroupItem value="bell" aria-label="Bell">
                <Bell size={16} />
              </ToggleGroupItem>
              <ToggleGroupItem value="user" aria-label="User">
                <User size={16} />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </ComponentShowcase>
    </div>
  )
}

export default ButtonsShowcase
