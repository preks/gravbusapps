import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AccountSection from '@/common/components/common-relations/record-sections/account-section/AccountSection'
import ContactSection from '@/common/components/common-relations/record-sections/contact-section/ContactSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildEntityNavigationUrl } from '@/business-apps/platform/apps/every-ai/components/entities/utils/entityNavigation'
import type { Customer360Snapshot, Customer360Subject } from '../../data/types'
import RelationshipsSection from './RelationshipsSection'

export interface DetailsViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

/**
 * Details tab — master data, addresses and communication channels reusing the
 * shared common-relations Account/Contact sections, plus the relationship graph.
 *
 * The shared sections expose an edit AppAction (via `actionButtonProps`) and a
 * clickable title that deep-links to the full Account/Contact record (via
 * `recordUrl`); both are wired here so users can edit master data in place.
 */
const DetailsView: React.FC<DetailsViewProps> = ({ subject, ...context }) => {
  const isAccount = subject.type === 'account'
  const recordUrl = buildEntityNavigationUrl(subject.type, subject.id, 'customer-360')

  return (
    <div
      className="gba:col-span-12 gba:grid gba:grid-cols-1 gba:gap-4 gba:items-start gba:lg:grid-cols-2"
      data-testid="customer-360-details-view"
    >
      {isAccount ? (
        <SectionWrapper
          className="gba:min-h-96"
          sections={[
            {
              id: 'account-master-data',
              component: AccountSection as React.ComponentType<Record<string, unknown>>,
              props: {
                ...context,
                account: subject.account,
                accountId: subject.id,
                recordUrl,
                actionButtonProps: {
                  contextsArray: [FlowContextName.customerAccountEntity],
                  externalContextData: { accountId: subject.id },
                  prefixDataTestId: 'customer-360-account-edit'
                }
              }
            }
          ]}
          data-testid="customer-360-master-data-wrapper"
        />
      ) : (
        <SectionWrapper
          className="gba:min-h-96"
          sections={[
            {
              id: 'contact-master-data',
              component: ContactSection as React.ComponentType<Record<string, unknown>>,
              props: {
                ...context,
                contact: subject.contact,
                contactId: subject.id,
                recordUrl,
                actionButtonProps: {
                  contextsArray: [FlowContextName.customerContactEntity],
                  externalContextData: { contactId: subject.id },
                  prefixDataTestId: 'customer-360-contact-edit'
                }
              }
            }
          ]}
          data-testid="customer-360-master-data-wrapper"
        />
      )}
      <RelationshipsSection subject={subject} />
    </div>
  )
}

export default DetailsView
export { DetailsView }
