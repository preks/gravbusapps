export interface SalesTeamMember {
  id: string
  name: string
  position: string
  totalRevenue: number
  currencyId?: string
  avatar?: string | null
  pictureThumbnail?: string | null
  employeeId?: string
}
