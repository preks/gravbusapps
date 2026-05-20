import React from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import type { LeadScoringProfileOption } from '../hooks/useLeadScoringProfiles'

type LeadScoringMode = 'single' | 'bulk' | 'both'

export interface LeadScoringProfilesCardProps {
  testId: string
  mode: LeadScoringMode
  activeMode: 'single' | 'bulk'
  variant: 'page' | 'embedded'
  icpId: string
  onIcpIdChange: (value: string) => void
  profileOptions: LeadScoringProfileOption[]
  profilesLoading: boolean
  profilesError: string | null
  onActiveModeChange: (mode: 'single' | 'bulk') => void
  labels: {
    title: string
    pageDescription: string
    embeddedDescription: string
    singleMode: string
    bulkMode: string
    icpSelect: string
    loading: string
    icpPlaceholder: string
    noProfilesTitle: string
    noProfilesDescription: string
  }
}

export const LeadScoringProfilesCard: React.FC<LeadScoringProfilesCardProps> = ({
  testId,
  mode,
  activeMode,
  variant,
  icpId,
  onIcpIdChange,
  profileOptions,
  profilesLoading,
  profilesError,
  onActiveModeChange,
  labels
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{labels.title}</CardTitle>
      <CardDescription>{variant === 'page' ? labels.pageDescription : labels.embeddedDescription}</CardDescription>
    </CardHeader>
    <CardContent className="gba:space-y-4">
      {mode === 'both' ? (
        <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={`${testId}-mode-switch`}>
          <Button
            type="button"
            variant={activeMode === 'single' ? 'default' : 'outline'}
            onClick={() => onActiveModeChange('single')}
            data-testid={`${testId}-single-mode`}
          >
            {labels.singleMode}
          </Button>
          <Button
            type="button"
            variant={activeMode === 'bulk' ? 'default' : 'outline'}
            onClick={() => onActiveModeChange('bulk')}
            data-testid={`${testId}-bulk-mode`}
          >
            {labels.bulkMode}
          </Button>
        </div>
      ) : null}

      <div className="gba:space-y-2">
        <Label>{labels.icpSelect}</Label>
        <Select
          value={icpId || undefined}
          onValueChange={onIcpIdChange}
          disabled={profilesLoading || profileOptions.length === 0}
          data-testid={`${testId}-icp-select`}
        >
          <SelectTrigger className="gba:w-full" data-testid={`${testId}-icp-select-trigger`}>
            <SelectValue placeholder={profilesLoading ? labels.loading : labels.icpPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {profileOptions.map(option => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {profilesLoading ? <Spinner size="sm" /> : null}
      {profilesError ? (
        <Alert variant="destructive" data-testid={`${testId}-profiles-error`}>
          <AlertDescription>{profilesError}</AlertDescription>
        </Alert>
      ) : null}
      {profilesLoading || profileOptions.length > 0 ? null : (
        <EmptyState title={labels.noProfilesTitle} description={labels.noProfilesDescription} />
      )}
    </CardContent>
  </Card>
)
