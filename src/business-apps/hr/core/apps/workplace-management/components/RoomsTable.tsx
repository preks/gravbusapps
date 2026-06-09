import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import { RoomTableActionButton } from './RoomTableActionButton'
import type { Room } from '../types'

type TranslationFn = (key: string) => string

interface RoomsTableProps {
  rooms: Room[]
  t: TranslationFn
  onEditRoom: (room: Room) => void
  onDeleteRoom: (room: Room) => void
}

export const RoomsTable: React.FC<RoomsTableProps> = ({ rooms, t, onEditRoom, onDeleteRoom }) => {
  return (
    <div className="gba:space-y-4" data-testid="workplace-room-table-container">
      <div className="gba:rounded-lg gba:border" data-testid="workplace-rooms-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:pl-6">{t('workplace-room-code-column')}</TableHead>
              <TableHead>{t('workplace-room-name-column')}</TableHead>
              <TableHead className="gba:w-32 gba:text-center">{t('workplace-room-actions-column')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="gba:h-32 gba:text-center gba:text-muted-foreground">
                  {t('workplace-room-empty-table')}
                </TableCell>
              </TableRow>
            ) : (
              rooms.map(room => (
                <TableRow key={room.id} data-testid={`workplace-room-row-${room.id}`}>
                  <TableCell className="gba:pl-6">{room.code || '-'}</TableCell>
                  <TableCell>{room.name || '-'}</TableCell>
                  <TableCell className="gba:py-4 gba:px-6 gba:text-center">
                    <RoomTableActionButton room={room} t={t} onUpdateRoom={onEditRoom} onDeleteRoom={onDeleteRoom} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
