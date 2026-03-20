import React from 'react'
import { Input, Textarea, Label, Switch, Avatar, IconAvatar } from '@newwork/nw-design-system'
import { Globe, Lock, UserIcon } from 'lucide-react'
import type { OrgUserBasic } from '@/common/network/org-directory/OrgDirectoryClient'

const COLOR_OPTIONS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' }
]

const ICON_OPTIONS = ['📋', '🎯', '🚀', '💼', '📊', '🏗️', '🎨', '📦', '⚡', '🔬', '🌐', '📱']

export interface SpaceFormFieldsProps {
  name: string
  onNameChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  isPublic: boolean
  onIsPublicChange: (value: boolean) => void
  selectedIcon: string | null
  onIconChange: (value: string | null) => void
  selectedColor: string | null
  onColorChange: (value: string | null) => void
  canSubmit: boolean
  onSubmit: () => void
  testId: string
}

export const SpaceFormFields: React.FC<SpaceFormFieldsProps> = ({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  isPublic,
  onIsPublicChange,
  selectedIcon,
  onIconChange,
  selectedColor,
  onColorChange,
  canSubmit,
  onSubmit,
  testId
}) => (
  <>
    <div className="gba:space-y-2">
      <Label htmlFor="space-name">Name</Label>
      <Input
        id="space-name"
        placeholder="e.g. Marketing, Engineering, Q1 Planning..."
        value={name}
        onChange={e => onNameChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && canSubmit) onSubmit()
        }}
        autoFocus
        data-testid={`${testId}-name`}
      />
    </div>
    <div className="gba:space-y-2">
      <Label htmlFor="space-desc">Description (optional)</Label>
      <Textarea
        id="space-desc"
        placeholder="What is this space for?"
        value={description}
        onChange={e => onDescriptionChange(e.target.value)}
        className="gba:resize-none"
        rows={2}
        data-testid={`${testId}-desc`}
      />
    </div>
    <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-lg gba:bg-card gba:border gba:border-border/50">
      <div className="gba:flex gba:items-center gba:gap-3">
        {isPublic ? (
          <Globe className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        ) : (
          <Lock className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        )}
        <div>
          <p className="gba:text-sm gba:font-medium gba:text-foreground">{isPublic ? 'Public' : 'Private'}</p>
          <p className="gba:text-xs gba:text-muted-foreground">
            {isPublic ? 'Discoverable by organization' : 'Only invited members'}
          </p>
        </div>
      </div>
      <Switch checked={isPublic} onCheckedChange={onIsPublicChange} data-testid={`${testId}-public-switch`} />
    </div>
    <div className="gba:space-y-2">
      <Label>Icon (optional)</Label>
      <div className="gba:flex gba:flex-wrap gba:gap-1.5">
        {ICON_OPTIONS.map(icon => (
          <button
            key={icon}
            className={`gba:w-8 gba:h-8 gba:rounded-md gba:flex gba:items-center gba:justify-center gba:text-base gba:transition-all ${
              selectedIcon === icon
                ? 'gba:bg-primary/20 gba:ring-2 gba:ring-primary gba:scale-110'
                : 'gba:bg-muted/50 gba:hover:bg-muted gba:hover:scale-105'
            }`}
            onClick={() => onIconChange(selectedIcon === icon ? null : icon)}
            type="button"
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
    <div className="gba:space-y-2">
      <Label>Color (optional)</Label>
      <div className="gba:flex gba:flex-wrap gba:gap-1.5">
        {COLOR_OPTIONS.map(color => (
          <button
            key={color.value}
            className={`gba:w-7 gba:h-7 gba:rounded-full gba:transition-all ${
              selectedColor === color.value
                ? 'gba:ring-2 gba:ring-offset-2 gba:ring-primary gba:scale-110'
                : 'gba:hover:scale-110'
            }`}
            style={{ backgroundColor: color.value }}
            onClick={() => onColorChange(selectedColor === color.value ? null : color.value)}
            title={color.label}
            type="button"
          />
        ))}
      </div>
    </div>
  </>
)

export interface MemberPreviewProps {
  members: OrgUserBasic[]
}

export const MemberPreview: React.FC<MemberPreviewProps> = ({ members }) => (
  <div className="gba:space-y-2">
    <Label className="gba:text-sm gba:text-muted-foreground">
      Members <span className="gba:ml-1 gba:text-foreground gba:font-medium">({members.length})</span>
    </Label>
    <div className="gba:h-32 gba:overflow-y-auto gba:border gba:border-border/50 gba:rounded-lg gba:bg-muted/20 gba:p-2">
      <div className="gba:flex gba:flex-wrap gba:gap-2">
        {members.map(member => (
          <div
            key={member.id}
            className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:bg-background gba:rounded-md gba:text-sm gba:border gba:border-border/50"
          >
            {member.avatarUrl ? (
              <Avatar className="gba:w-5 gba:h-5 gba:flex-shrink-0">
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="gba:w-full gba:h-full gba:object-cover gba:rounded-full"
                />
              </Avatar>
            ) : (
              <IconAvatar className="gba:w-5 gba:h-5 gba:flex-shrink-0" label={member.name} icon={UserIcon} />
            )}
            <span className="gba:truncate gba:max-w-[120px]">{member.name}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)
