import React, { useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  PageLayout,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowsClockwise, Buildings, Plus } from '@phosphor-icons/react'

import { MODULE_COLORS } from '@/common/constants/ui'
import { BackofficeDataDisplay } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeDataDisplay'
import { DeleteRoomDialog } from './components/DeleteRoomDialog'
import { RoomDialog } from './components/RoomDialog'
import { RoomsTable } from './components/RoomsTable'
import { useRooms } from './hooks/useRooms'
import translations from './_i18n'
import type { Room, RoomFormValues, WorkplaceManagementProps } from './types'

const moduleColor = MODULE_COLORS.HR

function roomMatchesSearch(room: Room, searchTerm: string): boolean {
  const normalizedSearch = searchTerm.trim().toLowerCase()

  if (!normalizedSearch) {
    return true
  }

  return [room.code, room.name].some(value => value?.toLowerCase().includes(normalizedSearch))
}

export const WorkplaceManagement: React.FC<WorkplaceManagementProps> = ({
  accessToken,
  prefixDataTestId = 'workplace-management'
}) => {
  const { t } = useTranslation(translations)
  const { rooms, isLoading, isSaving, error, refetch, saveRoomValues, deleteRoomValue } = useRooms(accessToken)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [roomPendingDelete, setRoomPendingDelete] = useState<Room | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRooms = useMemo(
    () =>
      rooms
        .filter(room => roomMatchesSearch(room, searchTerm))
        .sort((first, second) => first.code.localeCompare(second.code)),
    [rooms, searchTerm]
  )

  const openCreateDialog = () => {
    setSelectedRoom(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (room: Room) => {
    setSelectedRoom(room)
    setIsDialogOpen(true)
  }

  const handleSubmitRoom = (values: RoomFormValues, room?: Room) => saveRoomValues(values, room)
  const openDeleteDialog = (room: Room) => {
    setRoomPendingDelete(room)
  }
  const handleConfirmDelete = async () => {
    if (!roomPendingDelete) {
      return
    }

    await deleteRoomValue(roomPendingDelete)
    setRoomPendingDelete(null)
  }
  const primaryAction = (
    <Button
      onClick={openCreateDialog}
      data-testid={`${prefixDataTestId}-create-button`}
      className="gba:gap-2 gba:shrink-0"
    >
      <Plus size={20} />
      {t('workplace-room-create-button')}
    </Button>
  )
  const content = () => {
    if (!accessToken) {
      return (
        <div
          className="gba:flex gba:min-h-80 gba:items-center gba:justify-center gba:gap-3"
          data-testid={`${prefixDataTestId}-no-auth`}
        >
          <Spinner size="lg" />
          <span className="gba:text-muted-foreground">{t('workplace-no-auth')}</span>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div
          className="gba:flex gba:min-h-80 gba:items-center gba:justify-center gba:gap-3"
          data-testid={`${prefixDataTestId}-loading`}
        >
          <Spinner size="lg" />
          <span className="gba:text-muted-foreground">{t('workplace-loading')}</span>
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
          <AlertTitle>{t('workplace-load-error-title')}</AlertTitle>
          <AlertDescription className="gba:space-y-3">
            <p>{t('workplace-load-error-description')}</p>
            <Button variant="outline" onClick={refetch} data-testid={`${prefixDataTestId}-retry-button`}>
              <ArrowsClockwise className="gba:mr-2 gba:h-4 gba:w-4" />
              {t('workplace-room-refresh-button')}
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="gba:flex gba:h-full gba:w-full gba:min-w-0 gba:flex-col" data-testid={prefixDataTestId}>
        <div className="gba:min-h-96 gba:overflow-auto gba:bg-white">
          <div className="gba:p-4">
            <BackofficeDataDisplay
              titleSections={[
                {
                  id: 'list',
                  label: t('workplace-room-list-title'),
                  metadata: { count: filteredRooms.length, isLoading }
                }
              ]}
              currentSection="list"
              searchValue={searchTerm}
              searchPlaceholder={t('workplace-room-search-placeholder')}
              onSearchChange={setSearchTerm}
              primaryAction={primaryAction}
              data-testid="workplace-room-data-display"
            >
              <RoomsTable rooms={filteredRooms} t={t} onEditRoom={openEditDialog} onDeleteRoom={openDeleteDialog} />
            </BackofficeDataDisplay>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageLayout
        headerIcon={Buildings}
        headerTitle={t('workplace-page-title')}
        headerDescription={t('workplace-page-description')}
        onBack={null as unknown as (() => void) | undefined}
        variant={moduleColor}
        className="gba:min-h-screen"
      >
        {content()}
      </PageLayout>

      <RoomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        room={selectedRoom}
        isSaving={isSaving}
        t={t}
        onSubmit={handleSubmitRoom}
      />
      <DeleteRoomDialog
        open={Boolean(roomPendingDelete)}
        room={roomPendingDelete}
        isDeleting={isSaving}
        t={t}
        onOpenChange={open => {
          if (!open) {
            setRoomPendingDelete(null)
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

export default WorkplaceManagement
