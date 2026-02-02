/**
 * EveryAI Expert-specific fields for Task Expert Editor
 *
 * Shows additional configuration options for EveryAI agents:
 * - Specialty description
 * - Response style
 * - Avatar and color
 * - Citation mode
 * - Tags
 * - Public/Private toggle
 */

import React from 'react'
import {
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system'
import type { ResponseStyle, CitationMode } from '@/common/network/ai/prompt-manager/PromptManagerClient'

interface EveryExpertFieldsProps {
  specialty: string
  onSpecialtyChange: (value: string) => void
  responseStyle: ResponseStyle
  onResponseStyleChange: (value: ResponseStyle) => void
  color: string
  onColorChange: (value: string) => void
  citationMode: CitationMode
  onCitationModeChange: (value: CitationMode) => void
  tags: string[]
  onTagsChange: (tags: string[]) => void
  isPublic: boolean
  onIsPublicChange: (value: boolean) => void
  'data-testid'?: string
}

const PRESET_COLORS = [
  { name: 'Blue (Legal)', value: '#1890ff' },
  { name: 'Green (HR)', value: '#52c41a' },
  { name: 'Orange (Sales)', value: '#fa8c16' },
  { name: 'Purple (Tech)', value: '#722ed1' },
  { name: 'Cyan (Finance)', value: '#13c2c2' },
  { name: 'Magenta (Product)', value: '#eb2f96' },
  { name: 'Gold (Process)', value: '#faad14' },
  { name: 'Red (Security)', value: '#ff4d4f' }
]

export const EveryExpertFields: React.FC<EveryExpertFieldsProps> = ({
  specialty,
  onSpecialtyChange,
  responseStyle,
  onResponseStyleChange,
  color,
  onColorChange,
  citationMode,
  onCitationModeChange,
  tags,
  onTagsChange,
  isPublic,
  onIsPublicChange,
  'data-testid': testId = 'every-expert-fields'
}) => {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="gba:text-base">🎓 Every Expert Configuration</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {/* Specialty */}
        <div className="gba:space-y-2">
          <Label htmlFor="specialty">Specialty / Expertise *</Label>
          <Input
            id="specialty"
            value={specialty}
            onChange={e => onSpecialtyChange(e.target.value)}
            placeholder="e.g., Contract review, compliance, NDA questions"
            data-testid={`${testId}-specialty-input`}
          />
          <p className="gba:text-xs gba:text-muted-foreground">
            Short description of this expert's area of expertise (shown in chat)
          </p>
        </div>

        {/* Response Style */}
        <div className="gba:space-y-2">
          <Label htmlFor="responseStyle">Response Style</Label>
          <Select value={responseStyle} onValueChange={v => onResponseStyleChange(v as ResponseStyle)}>
            <SelectTrigger id="responseStyle" data-testid={`${testId}-response-style-select`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conversational">Conversational - Friendly and approachable</SelectItem>
              <SelectItem value="formal">Formal - Professional and structured</SelectItem>
              <SelectItem value="technical">Technical - Detailed and precise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="gba:space-y-2">
          <Label htmlFor="color">Brand Color</Label>
          <div className="gba:flex gba:gap-2">
            <Input
              id="color"
              type="color"
              value={color}
              onChange={e => onColorChange(e.target.value)}
              className="gba:w-20 gba:h-10"
              data-testid={`${testId}-color-input`}
            />
            <Select value={color} onValueChange={onColorChange}>
              <SelectTrigger className="gba:flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_COLORS.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:w-4 gba:h-4 gba:rounded" style={{ backgroundColor: preset.value }} />
                      {preset.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            Color used for avatar and visual identification in chat
          </p>
        </div>

        {/* Citation Mode */}
        <div className="gba:space-y-2">
          <Label htmlFor="citationMode">Citation Mode</Label>
          <Select value={citationMode} onValueChange={v => onCitationModeChange(v as CitationMode)}>
            <SelectTrigger id="citationMode" data-testid={`${testId}-citation-mode-select`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always cite sources</SelectItem>
              <SelectItem value="when_needed">Cite when relevant</SelectItem>
              <SelectItem value="never">No citations</SelectItem>
            </SelectContent>
          </Select>
          <p className="gba:text-xs gba:text-muted-foreground">
            How the expert should reference knowledge sources in responses
          </p>
        </div>

        {/* Tags */}
        <div className="gba:space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tags.join(', ')}
            onChange={e =>
              onTagsChange(
                e.target.value
                  .split(',')
                  .map(t => t.trim())
                  .filter(Boolean)
              )
            }
            placeholder="legal, contracts, compliance"
            data-testid={`${testId}-tags-input`}
          />
          <p className="gba:text-xs gba:text-muted-foreground">Comma-separated tags for categorization and search</p>
        </div>

        {/* Public/Private Toggle */}
        <div className="gba:flex gba:items-start gba:gap-3 gba:p-3 gba:bg-muted/50 gba:rounded-lg">
          <input
            id="isPublic"
            type="checkbox"
            checked={isPublic}
            onChange={e => onIsPublicChange(e.target.checked)}
            className="gba:mt-1"
            data-testid={`${testId}-public-checkbox`}
          />
          <div className="gba:flex-1">
            <Label htmlFor="isPublic" className="gba:cursor-pointer">
              Make this expert public
            </Label>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
              {isPublic
                ? 'All users in your organization can add this expert to their chats'
                : 'Only you can use this expert in your conversations'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
