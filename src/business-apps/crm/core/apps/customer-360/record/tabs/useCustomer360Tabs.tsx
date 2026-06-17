import { useMemo } from 'react'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import {
  ClockCounterClockwiseIcon,
  CoinsIcon,
  FileTextIcon,
  FoldersIcon,
  LifebuoyIcon,
  ReceiptIcon,
  RobotIcon,
  SquaresFourIcon
} from '@phosphor-icons/react'
import { CustomerInvoicesPanel } from '@/business-apps/fin/billing/common/invoices/components/CustomerInvoicesPanel'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customer360I18n from '../../_i18n'
import type { Customer360Snapshot, Customer360Subject } from '../../data/types'
import AgentView from './agent/AgentView'
import ContractsView from './contracts/ContractsView'
import JournalView from './journal/JournalView'
import OverviewView from './overview/OverviewView'
import ServiceCasesView from './service-cases/ServiceCasesView'
import ServiceTicketsView from './service-tickets/ServiceTicketsView'
import TransactionsView from './transactions-fibu/TransactionsView'

interface UseCustomer360TabsParams {
  context: BusinessAppContextProps
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading: boolean
}

export function useCustomer360Tabs({ context, subject, snapshot, loading }: UseCustomer360TabsParams) {
  const { t } = useFluentTranslation(customer360I18n)

  return useMemo(() => {
    const shared = { ...context, subject, snapshot, loading }

    return [
      {
        value: 'overview',
        label: t('tab-overview'),
        icon: <SquaresFourIcon className="gba:mr-2" />,
        content: <OverviewView {...shared} />
      },
      {
        value: 'contracts',
        label: t('tab-contracts'),
        icon: <FileTextIcon className="gba:mr-2" />,
        content: <ContractsView {...shared} />
      },
      {
        value: 'service-tickets',
        label: t('tab-service-tickets'),
        icon: <LifebuoyIcon className="gba:mr-2" />,
        content: <ServiceTicketsView {...shared} />
      },
      {
        value: 'service-cases',
        label: t('tab-service-cases'),
        icon: <FoldersIcon className="gba:mr-2" />,
        content: <ServiceCasesView {...shared} />
      },
      {
        value: 'transactions-fibu',
        label: t('tab-transactions-fibu'),
        icon: <ReceiptIcon className="gba:mr-2" />,
        content: <TransactionsView {...shared} />
      },
      {
        value: 'invoices',
        label: t('tab-invoices'),
        icon: <CoinsIcon className="gba:mr-2" />,
        content: (
          <div className="gba:col-span-12" data-testid="customer-360-invoices-view">
            <CustomerInvoicesPanel {...context} crmAccountId={subject.id} crmAccountName={subject.displayName} />
          </div>
        )
      },
      {
        value: 'journal',
        label: t('tab-journal'),
        icon: <ClockCounterClockwiseIcon className="gba:mr-2" />,
        content: <JournalView {...shared} />
      },
      {
        value: 'agent',
        label: t('tab-agent'),
        icon: <RobotIcon className="gba:mr-2" />,
        content: <AgentView {...shared} />
      }
    ]
  }, [context, loading, snapshot, subject, t])
}
