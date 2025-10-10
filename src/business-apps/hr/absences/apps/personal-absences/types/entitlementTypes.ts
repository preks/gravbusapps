export interface EntitlementCardProps {
  entitlement: Entitlement
}

export interface Entitlement {
  type: string
  color: string // for icon or bar
  used?: number
  total?: number
  pending?: number
  available?: number
  year?: number
  icon?: React.ReactNode
  checkEntitlement?: boolean // Optional flag for entitlement display logic
}
