import React from 'react'
import { Checkbox } from '@newwork/nw-design-system'
import type { LeadScoringCandidate } from '../hooks/useLeadScoringCandidates'

interface LeadScoringCandidateRowProps {
  candidate: LeadScoringCandidate
  checked: boolean
  onToggle: (id: string, checked: boolean) => void
}

function getCandidateTitle(candidate: LeadScoringCandidate): string {
  const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ').trim()
  return name || 'Unnamed lead'
}

export const LeadScoringCandidateRow: React.FC<LeadScoringCandidateRowProps> = ({ candidate, checked, onToggle }) => {
  const title = getCandidateTitle(candidate)

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:p-3" data-testid={`lead-scoring-candidate-${candidate.id}`}>
      <Checkbox checked={checked} onCheckedChange={value => onToggle(candidate.id, value === true)} />
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:text-sm gba:font-medium gba:truncate" title={title}>
          {title}
        </div>
        {candidate.companyName ? (
          <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{candidate.companyName}</div>
        ) : null}
      </div>
    </div>
  )
}
