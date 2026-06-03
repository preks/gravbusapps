import React from 'react'
import { Checkbox } from '@newwork/nw-design-system'
import type { IcpScoringCandidate } from '../types/icpScoringCandidateTypes'

interface IcpScoringCandidateRowProps {
  candidate: IcpScoringCandidate
  checked: boolean
  onToggle: (id: string, checked: boolean) => void
  dataTestIdPrefix: string
}

export const IcpScoringCandidateRow: React.FC<IcpScoringCandidateRowProps> = ({
  candidate,
  checked,
  onToggle,
  dataTestIdPrefix
}) => (
  <div
    className="gba:flex gba:items-center gba:gap-3 gba:p-3"
    data-testid={`${dataTestIdPrefix}-candidate-${candidate.id}`}
  >
    <Checkbox checked={checked} onCheckedChange={value => onToggle(candidate.id, value === true)} />
    <div className="gba:flex-1 gba:min-w-0">
      <div className="gba:text-sm gba:font-medium gba:truncate" title={candidate.title}>
        {candidate.title}
      </div>
      {candidate.subtitle ? (
        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{candidate.subtitle}</div>
      ) : null}
    </div>
  </div>
)
