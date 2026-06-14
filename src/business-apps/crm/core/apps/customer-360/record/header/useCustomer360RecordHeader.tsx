import { useCallback, useMemo } from 'react'
import {
  AiButton,
  Badge,
  HeaderSlot,
  IconAvatar,
  useTranslation as useFluentTranslation
} from '@newwork/nw-design-system'
import { BankIcon, CalendarIcon, EnvelopeIcon, PhoneIcon, UsersIcon } from '@phosphor-icons/react'
import { getEmailChannel, getPhoneChannel } from '@/common/data/common/utils/communicationChannelHelpers'
import { openEveryAI } from '@/common/utils/openEveryAI'
import customer360I18n from '../../_i18n'
import type { Customer360Snapshot, Customer360Subject } from '../../data/types'
import { buildCustomer360Handoff } from '../agent/agentHandoff'

interface UseCustomer360RecordHeaderParams {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  snapshotLoading: boolean
}

export function useCustomer360RecordHeader({ subject, snapshot, snapshotLoading }: UseCustomer360RecordHeaderParams) {
  const { t } = useFluentTranslation(customer360I18n)
  const account = subject.account

  const agentHandoff = useMemo(() => buildCustomer360Handoff(subject, snapshot), [subject, snapshot])

  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'account-details',
        items: [
          {
            label: 'Email',
            value: getEmailChannel(account?.communicationChannels)?.value || 'Not set',
            icon: EnvelopeIcon
          },
          {
            label: 'Phone',
            value: getPhoneChannel(account?.communicationChannels)?.value || 'Not set',
            icon: PhoneIcon
          },
          {
            label: 'Founded',
            value: account?.foundationDate ? new Date(account.foundationDate).toLocaleDateString() : 'Not set',
            icon: CalendarIcon
          },
          {
            label: 'Owner',
            value:
              account?.ownerEmployee?.displayName ||
              (account?.ownerEmployee?.firstName && account?.ownerEmployee?.lastName
                ? `${account.ownerEmployee.firstName} ${account.ownerEmployee.lastName}`.trim()
                : 'Not assigned'),
            icon: UsersIcon
          }
        ]
      }
    ],
    [account?.communicationChannels, account?.foundationDate, account?.ownerEmployee]
  )

  const handleAskAgent = useCallback(() => {
    openEveryAI({
      prompt: agentHandoff.prompt,
      additionInfo: agentHandoff.additionInfo,
      skills: agentHandoff.skills,
      newSession: true
    })
  }, [agentHandoff])

  const headerActions = useMemo(
    () => (
      <div className="gba:flex gba:items-center gba:gap-2">
        <Badge
          variant="success"
          size="sm"
          className="gba:bg-success gba:text-success-foreground"
          data-testid="customer-360-retention-badge"
        >
          {t('retention-badge')}
        </Badge>
        <AiButton
          variant="default"
          size="sm"
          onClick={handleAskAgent}
          disabled={snapshotLoading}
          data-testid="customer-360-header-ask-agent"
        >
          {t('agent-ask-button')}
        </AiButton>
      </div>
    ),
    [handleAskAgent, snapshotLoading, t]
  )

  return {
    headerAvatar: (
      <IconAvatar
        icon={BankIcon}
        variant="decorative"
        size="xl"
        className="gba:bg-success/10"
        iconClassName="gba:text-success"
      />
    ),
    headerOverline: t('overline-retention'),
    headerSlotMain: <HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />,
    headerActions
  }
}
