import React from 'react'
import { EmployeeReferenceCard } from './EmployeeReferenceCard'
import { AccountReferenceCard } from './AccountReferenceCard'
import { ContactReferenceCard } from './ContactReferenceCard'
import { LeadReferenceCard } from './LeadReferenceCard'
import { OpportunityReferenceCard } from './OpportunityReferenceCard'
import { GenericReferenceCard } from './GenericReferenceCard'
import { isEmphasized, resolveEffectiveType, type ReferenceCardProps } from './referenceCardUtils'

/**
 * Dispatcher for a single entity reference card. Resolves the reference
 * protocol to an effective type (applying relation -> parent redirects, the
 * same way inline chips do) and renders the matching rich card, falling back to
 * a generic card for everything else.
 *
 * Each specialized card calls exactly one by-id GraphQL hook, so dispatching by
 * type (rather than calling all hooks) keeps the network fan-out to one request
 * per rendered card.
 */
const pickCard = (effectiveType: string): React.FC<ReferenceCardProps> => {
  switch (effectiveType) {
    case 'employee':
      return EmployeeReferenceCard
    case 'account':
    case 'company':
    case 'customer_account':
      return AccountReferenceCard
    case 'contact':
    case 'customer_contact':
    case 'business_partner_person':
      return ContactReferenceCard
    case 'lead':
      return LeadReferenceCard
    case 'opportunity':
      return OpportunityReferenceCard
    default:
      return GenericReferenceCard
  }
}

export const EntityReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const effectiveType = resolveEffectiveType(reference.type)
  const Card = pickCard(effectiveType)
  const card = <Card reference={reference} accessToken={accessToken} />

  if (isEmphasized(reference)) {
    // Answer-focus entries get a quiet sky ring matching the card radius —
    // visible emphasis without any glow.
    return <div className="gba:rounded-xl gba:ring-1 gba:ring-sky-400/60">{card}</div>
  }
  return card
}

export default EntityReferenceCard
