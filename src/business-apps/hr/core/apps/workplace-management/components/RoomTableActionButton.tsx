import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import type { Room } from '../types'

type TranslationFn = (key: string) => string

interface RoomTableActionButtonProps {
  room: Room
  t: TranslationFn
  onUpdateRoom: (room: Room) => void
  onDeleteRoom: (room: Room) => void
}

export const RoomTableActionButton: React.FC<RoomTableActionButtonProps> = ({
  room,
  t,
  onUpdateRoom,
  onDeleteRoom
}) => {
  const handleUpdate = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onUpdateRoom(room)
  }

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onDeleteRoom(room)
  }

  return (
    <div className="gba:flex gba:items-center gba:justify-center" data-testid={`workplace-room-actions-${room.id}`}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleUpdate}
        aria-label={t('workplace-room-update')}
        data-testid={`workplace-room-update-${room.id}`}
      >
        <PencilSimpleIcon className="gba:h-4 gba:w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        aria-label={t('workplace-room-delete')}
        data-testid={`workplace-room-delete-${room.id}`}
      >
        <TrashIcon className="gba:h-4 gba:w-4" />
      </Button>
    </div>
  )
}
