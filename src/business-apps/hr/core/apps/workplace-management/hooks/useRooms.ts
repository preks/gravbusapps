import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ACTIVE_ROOMS } from '../queries/roomQueries'
import { createRoom, deleteRoom, updateRoom } from '../services/roomApi'
import type { Room, RoomFormValues, RoomMutationPayload } from '../types'

interface RoomsResponse {
  room?: Room[]
  Room?: Room[]
}

function toRoomMutationPayload(values: RoomFormValues, room?: Room): RoomMutationPayload {
  if (room) {
    return {
      room: {
        id: room.id,
        version: room.version,
        code: values.code.trim(),
        name: values.name.trim()
      }
    }
  }

  return {
    room: {
      code: values.code.trim(),
      name: values.name.trim()
    }
  }
}

function toDeleteRoomPayload(room: Room): RoomMutationPayload {
  return {
    room: {
      id: room.id,
      version: room.version,
      code: room.code,
      name: room.name
    }
  }
}

export function useRooms(accessToken: string) {
  const graphqlClient = useGraphQLClient(accessToken)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchRooms = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<RoomsResponse>(GET_ACTIVE_ROOMS)
      setRooms(result.room ?? result.Room ?? [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load rooms'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  const saveRoomValues = useCallback(
    async (values: RoomFormValues, room?: Room) => {
      setIsSaving(true)

      try {
        const payload = toRoomMutationPayload(values, room)
        if (room) {
          await updateRoom(accessToken, payload)
        } else {
          await createRoom(accessToken, payload)
        }
        await fetchRooms()
      } finally {
        setIsSaving(false)
      }
    },
    [accessToken, fetchRooms]
  )

  const deleteRoomValue = useCallback(
    async (room: Room) => {
      setIsSaving(true)

      try {
        await deleteRoom(accessToken, toDeleteRoomPayload(room))
        await fetchRooms()
      } finally {
        setIsSaving(false)
      }
    },
    [accessToken, fetchRooms]
  )

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  return {
    rooms,
    isLoading,
    isSaving,
    error,
    refetch: fetchRooms,
    saveRoomValues,
    deleteRoomValue
  }
}
