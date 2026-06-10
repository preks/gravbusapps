import { RestClient } from '@/common/network/rest/RestClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { env } from '@/common/env/EnvUtils'
import type { RoomMutationPayload, Room } from '../types'

const CREATE_ROOM_PROCESS_PATH = '/processes/employee/createRoom'
const UPDATE_ROOM_PROCESS_PATH = '/processes/employee/updateRoom'
const DELETE_ROOM_PROCESS_PATH = '/processes/employee/deleteRoom'

function createRoomClient(accessToken: string) {
  return new RestClient(env('NEXT_PUBLIC_BASE_URL') ?? '', {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
}

function postRoom(accessToken: string, path: string, payload: RoomMutationPayload): Promise<Room> {
  return createRoomClient(accessToken).post<Room>(path, payload, {
    headers: { 'Content-Type': 'application/json' }
  })
}

export function createRoom(accessToken: string, payload: RoomMutationPayload): Promise<Room> {
  return postRoom(accessToken, CREATE_ROOM_PROCESS_PATH, payload)
}

export function updateRoom(accessToken: string, payload: RoomMutationPayload): Promise<Room> {
  return postRoom(accessToken, UPDATE_ROOM_PROCESS_PATH, payload)
}

export function deleteRoom(accessToken: string, payload: RoomMutationPayload): Promise<Room> {
  return postRoom(accessToken, DELETE_ROOM_PROCESS_PATH, payload)
}
