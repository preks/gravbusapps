import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Button, DataTable } from '@newwork/nw-design-system'
import { ColumnDef, Row } from '@tanstack/react-table'
import { ChatCircleDots } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { PrefilledMessageDialog } from './PrefilledMessageDialog'
import { DashboardViewHeader } from './DashboardViewHeader'
import { NextMonthToggle } from './NextMonthToggle'
import { useSendGreetingMessage } from '../../hooks/useSendGreetingMessage'

interface MomentsPerson {
  id: string
  userId?: string
  firstName: string
  lastName: string
  fullName: string
}

interface MessageConfig<T extends MomentsPerson> {
  buildMessage: (person: T) => string
  isTodayCheck: (person: T, today: dayjs.Dayjs) => boolean
  todayTooltip: string
  dialogTitle: string
  dialogDescription: string
}

export interface PeopleMomentsListViewProps<T extends MomentsPerson> {
  currentData: T[]
  nextMonthData: T[]
  loading: boolean
  accessToken: string
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
  greetingType: 'birthday-greeting' | 'anniversary-greeting'
  columns: ColumnDef<T>[]
  title: string
  emptyMessage: string
  categoryLabel: string
  testIdPrefix: string
  messageConfig: MessageConfig<T>
}

export function PeopleMomentsListView<T extends MomentsPerson>({
  currentData,
  nextMonthData,
  loading,
  accessToken,
  onNavigateBack,
  onNavigateToEmployee,
  greetingType,
  columns,
  title,
  emptyMessage,
  categoryLabel,
  testIdPrefix,
  messageConfig
}: Readonly<PeopleMomentsListViewProps<T>>) {
  const [includeNextMonth, setIncludeNextMonth] = useState(false)
  const today = useMemo(() => dayjs(), [])
  const nextMonthName = useMemo(() => today.add(1, 'month').format('MMMM'), [today])

  const { sendingToUserId, messageDraft, setMessageDraft, sendMessage } = useSendGreetingMessage<T>({
    accessToken,
    greetingType
  })

  const displayedData = useMemo(
    () => (includeNextMonth ? [...currentData, ...nextMonthData] : currentData),
    [includeNextMonth, currentData, nextMonthData]
  )

  const renderActions = (row: Row<T>) => {
    const person = row.original
    const userKey = person.userId || person.id
    const isSending = sendingToUserId === userKey
    const isToday = messageConfig.isTodayCheck(person, today)

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={event => {
          event.stopPropagation()
          if (!isToday) return
          setMessageDraft({ person, message: messageConfig.buildMessage(person) })
        }}
        disabled={isSending || !isToday}
        title={isToday ? '' : messageConfig.todayTooltip}
        data-testid={`${testIdPrefix}-chat-${person.id}`}
      >
        <ChatCircleDots size={16} className="gba:mr-1" />
        {isSending
          ? getTranslationFromI18nKeyAndLabel('master-data:sending', 'Sending...')
          : getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.send_message', 'Send Message')}
      </Button>
    )
  }

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
      <DashboardViewHeader
        title={title}
        badgeText={`${currentData.length} this month`}
        backTestId={`${testIdPrefix}-back-button`}
        onNavigateBack={onNavigateBack}
      />

      <div className="gba:flex-1 gba:overflow-auto">
        <DataTable<T>
          data={displayedData}
          columns={columns}
          loading={loading}
          emptyMessage={emptyMessage}
          enableSorting={true}
          onRowClick={person => onNavigateToEmployee(person.id)}
          actions={renderActions}
        />

        <NextMonthToggle
          includeNextMonth={includeNextMonth}
          onToggle={() => setIncludeNextMonth(true)}
          nextMonthCount={nextMonthData.length}
          nextMonthName={nextMonthName}
          categoryLabel={categoryLabel}
          testIdPrefix={testIdPrefix}
        />
      </div>

      <PrefilledMessageDialog
        open={Boolean(messageDraft)}
        onOpenChange={open => {
          if (!open) setMessageDraft(null)
        }}
        title={messageConfig.dialogTitle}
        description={messageConfig.dialogDescription}
        recipientName={messageDraft?.person.fullName || ''}
        defaultMessage={messageDraft?.message || ''}
        confirmLabel="Send message"
        sending={sendingToUserId === (messageDraft?.person.userId || messageDraft?.person.id)}
        onConfirm={async message => {
          if (!messageDraft) return
          await sendMessage(messageDraft.person, message)
        }}
      />
    </div>
  )
}
