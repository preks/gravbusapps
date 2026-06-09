import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface RoomOption {
  id: string
  name: string
}

interface RoomsResponse {
  room?: RoomOption[]
  Room?: RoomOption[]
}

const GET_ACTIVE_ROOMS = `
  query GetActiveRooms {
    room: Room(
      where: { isDeleted: { _eq: false } }
      orderBy: { name: ASC }
    ) {
      id
      name
    }
  }
`

export function useRoomOptions(accessToken: string, enabled: boolean, errorMessage: string) {
  const graphqlClient = useGraphQLClient(accessToken)
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !accessToken) {
      return
    }

    let isActive = true
    setIsLoading(true)
    setError(null)

    graphqlClient
      .request<RoomsResponse>(GET_ACTIVE_ROOMS)
      .then(result => {
        if (!isActive) {
          return
        }

        setRooms(result.room ?? result.Room ?? [])
      })
      .catch(err => {
        if (!isActive) {
          return
        }

        setRooms([])
        setError(err instanceof Error ? err.message : errorMessage)
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [accessToken, enabled, errorMessage, graphqlClient])

  return {
    rooms,
    isLoading,
    error
  }
}
