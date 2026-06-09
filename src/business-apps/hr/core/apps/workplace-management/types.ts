import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface Room {
  id: string
  version: number
  code: string
  name: string
}

export interface RoomFormValues {
  code: string
  name: string
}

export interface RoomMutationPayload {
  room: {
    id?: string
    version?: number
    code?: string
    name?: string
  }
}

export interface WorkplaceManagementProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}
