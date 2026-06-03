import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Spinner, RecordLayout, IconAvatar, HeaderSlot } from '@newwork/nw-design-system'
import {
  FolderIcon,
  UserIcon,
  TargetIcon,
  EnvelopeIcon,
  PhoneIcon,
  CakeIcon,
  GlobeIcon,
  CheckCircleIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerNotes } from '@/common/data/customer/hooks/useCustomerNotes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { APPROVAL_TASK_TYPE_REF } from '@/common/data/customer/constants/customerConstants'
import { AiActions } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { useContactAiSummary } from './hooks/useContactAiSummary'
import { HomeView } from './views/home-view/HomeView'
import { OpportunityView } from './views/opportunity-view/OpportunityView'
import { DocumentView } from './views/document-view/DocumentView'
import { getEmailChannel, getPhoneChannel } from '@/common/data/common/utils/communicationChannelHelpers'
import ComplianceSection from '@/common/components/common-relations/record-sections/compliance-section/ComplianceSection'
import SectionWrapper from '@/common/components/common-relations/record-sections/section-card/SectionCard'

interface ContactRecordContentProps extends BusinessAppContextProps {
  contactId: string
  onBack: () => void
  fromEntity?: string | null
}

const ContactRecordContent: React.FC<ContactRecordContentProps> = ({ contactId, onBack, fromEntity, ...props }) => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'overview'
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || 'overview'
  })

  // Use new declarative hook for contact data
  const {
    contact: contactData,
    loading,
    error,
    refetch: refetchContactData
  } = useCustomerContact(props.accessToken, contactId)

  // AI Summary hook - must be called before any conditional returns
  // Pass already-fetched contactData to avoid a duplicate GetContactById query
  const aiSummaryHook = useContactAiSummary(contactId, props.accessToken, contactData)

  // Data fetching hooks for sections - using central hooks
  const { fetchCustomerActivitiesByContactId } = useCustomerActivities(props)
  const { fetchCustomerTasksByContactId } = useCustomerTasks(props)
  const { fetchCustomerNotesByContactId } = useCustomerNotes(props)

  // State for section data
  const [activities, setActivities] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState<string | null>(null)

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    window.history.replaceState(null, '', url.toString())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.get('tab')) {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', activeTab)
      window.history.replaceState(null, '', url.toString())
    }
    const onPop = () => {
      const next = new URLSearchParams(window.location.search).get('tab') || 'overview'
      setActiveTab(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [activeTab])

  // Load section data
  const loadSectionData = useCallback(async () => {
    if (!contactId || !props.accessToken) return

    setSectionsLoading(true)
    setSectionsError(null)

    try {
      const [activitiesData, notesData, tasksData] = await Promise.all([
        fetchCustomerActivitiesByContactId(contactId),
        fetchCustomerNotesByContactId(contactId),
        fetchCustomerTasksByContactId(contactId)
      ])

      const sortedNotes = (notesData || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const sortedTasks = (tasksData || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      // Separate regular tasks from approvals based on taskType
      const regularTasks = sortedTasks.filter((task: any) => {
        const taskTypeCode = task?.type?.code || task?.taskType?.code || ''
        const taskTypeValue = task?.type?.value || task?.taskType?.value || ''
        return taskTypeCode?.toUpperCase() !== 'APPROVAL' && taskTypeValue?.toUpperCase() !== 'APPROVAL'
      })
      const approvalTasks = sortedTasks.filter((task: any) => {
        const taskTypeCode = task?.type?.code || task?.taskType?.code || ''
        const taskTypeValue = task?.type?.value || task?.taskType?.value || ''
        return taskTypeCode?.toUpperCase() === 'APPROVAL' || taskTypeValue?.toUpperCase() === 'APPROVAL'
      })

      setActivities(activitiesData || [])
      setNotes(sortedNotes)
      setTasks(regularTasks)
      setApprovals(approvalTasks)
    } catch (error) {
      console.error('Error loading section data:', error)
      setSectionsError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setSectionsLoading(false)
    }
  }, [
    contactId,
    props.accessToken,
    fetchCustomerActivitiesByContactId,
    fetchCustomerNotesByContactId,
    fetchCustomerTasksByContactId
  ])

  // Load section data on mount
  useEffect(() => {
    loadSectionData()
  }, [loadSectionData])

  // Fetch contact data
  const fetchContactData = useCallback(async () => {
    await refetchContactData()
  }, [refetchContactData])

  // Memoized callback for process completion
  const handleProcessSuccess = useCallback(() => {
    fetchContactData()
    loadSectionData()
  }, [fetchContactData, loadSectionData])

  // Listen for process completion events to refresh contact data
  useProcessCompletion({
    onSuccess: handleProcessSuccess
  })

  const getBackButtonText = () => {
    if (fromEntity === 'leads') {
      return getTranslationFromI18nKeyAndLabel('crm.customers.navigation.backToLeads', 'Back to Customer Leads')
    }
    if (fromEntity === 'accounts') {
      return getTranslationFromI18nKeyAndLabel('crm.customers.navigation.backToAccounts', 'Back to Customer Accounts')
    }
    if (fromEntity === 'salesPerformance') {
      return getTranslationFromI18nKeyAndLabel('crm.navigation.backToSalesPerformance', 'Back to Sales Performance')
    }
    return getTranslationFromI18nKeyAndLabel('crm.customers.navigation.backToContacts', 'Back to Customer Contacts')
  }

  // Memoize header data - must be called before conditional returns
  const headerDetailGroups = useMemo(
    () => [
      {
        id: 'contact-details',
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.email', 'Email'),
            value:
              getEmailChannel(contactData?.communicationChannels)?.value ||
              getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: EnvelopeIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.phone', 'Phone'),
            value:
              getPhoneChannel(contactData?.communicationChannels)?.value ||
              getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: PhoneIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.birthday', 'Birthday'),
            value: contactData?.birthDate
              ? new Date(contactData.birthDate).toLocaleDateString('en-GB')
              : getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: CakeIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.language', 'Language'),
            value: contactData?.language?.value || getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: GlobeIcon
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.owner', 'Owner'),
            value:
              contactData?.ownerEmployee?.displayName ||
              (contactData?.ownerEmployee?.firstName && contactData?.ownerEmployee?.lastName
                ? `${contactData.ownerEmployee.firstName} ${contactData.ownerEmployee.lastName}`.trim()
                : getTranslationFromI18nKeyAndLabel('crm.common.notAssigned', 'Not assigned')),
            icon: UserIcon
          }
        ]
      }
    ],
    [contactData]
  )

  const headerActions = (
    <AiActions
      entityType="contact"
      entityId={contactId}
      features={['summary', 'meeting-planner']}
      hooks={{ summary: aiSummaryHook, meetingPlanner: aiSummaryHook }}
    />
  )

  // Calculate fullName early for use in headerActionButton
  const fullName =
    `${contactData?.firstName || ''} ${contactData?.lastName || ''}`.trim() ||
    getTranslationFromI18nKeyAndLabel('crm.common.unnamedContact', 'Unnamed Contact')

  const headerActionButton = useMemo(
    () => (
      <AppAction
        data-testid="customer-contact-record-action-button"
        variant="header"
        contexts={[
          {
            context: FlowContextName.customerContactEntity,
            contextData: { contactId }
          }
        ]}
        shareContext={{
          entityType: 'contact',
          entityId: contactId,
          entityName: fullName,
          entityUrl: `/platform/crm/contact-record?contactId=${contactId}`
        }}
        prefixDataTestId="customer-contact-record-action"
        accessToken={props.accessToken}
      />
    ),
    [contactId, fullName, props.accessToken]
  )

  // Action props for sections - must be defined before subViews
  const activityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerActivityCreate],
      externalContextData: {
        contactId,
        // Set current user as default owner
        ...(props.userInfo?.employeeDetails?.employeeId && {
          ownerEmployeeId: props.userInfo.employeeDetails.employeeId
        })
      },
      prefixDataTestId: 'contact-activity'
    }),
    [contactId, props.userInfo?.employeeDetails?.employeeId]
  )

  const noteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerNoteCreate],
      externalContextData: { contactId },
      prefixDataTestId: 'contact-note'
    }),
    [contactId]
  )

  const taskActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerTaskCreate],
      externalContextData: { contactId },
      prefixDataTestId: 'contact-task'
    }),
    [contactId]
  )

  const approvalActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerTaskCreate],
      externalContextData: {
        contactId,
        typeRef: APPROVAL_TASK_TYPE_REF,
        salesTask: { contact: contactId, type: APPROVAL_TASK_TYPE_REF }
      },
      prefixDataTestId: 'contact-approval'
    }),
    [contactId]
  )

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('crm.common.overview', 'Overview'),
          icon: <UserIcon className="gba:mr-2" />,
          content: (
            <HomeView
              contactId={contactId}
              contact={contactData!}
              activities={activities}
              notes={notes}
              tasks={tasks}
              approvals={approvals}
              sectionsLoading={sectionsLoading}
              sectionsError={sectionsError}
              loadSectionData={loadSectionData}
              activityActionProps={activityActionProps}
              noteActionProps={noteActionProps}
              taskActionProps={taskActionProps}
              approvalActionProps={approvalActionProps}
              {...props}
            />
          )
        },
        {
          value: 'opportunities',
          label: getTranslationFromI18nKeyAndLabel('crm.common.opportunities', 'Opportunities'),
          icon: <TargetIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <OpportunityView contactId={contactId} {...props} />
            </div>
          )
        },
        {
          value: 'documents',
          label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
          icon: <FolderIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <DocumentView contactId={contactId} {...props} />
            </div>
          )
        },
        {
          value: 'compliance',
          label: getTranslationFromI18nKeyAndLabel('crm.common.compliance', 'Compliance'),
          icon: <CheckCircleIcon className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <SectionWrapper
                className="gba:min-h-96"
                sections={[
                  {
                    id: 'compliance-section',
                    component: ComplianceSection,
                    props: {
                      entity: contactData,
                      accessToken: props.accessToken,
                      actionButtonConfig: {
                        type: 'AppAction',
                        config: {
                          contextsArray: [FlowContextName.contactUpdateComplianceData],
                          externalContextData: { contactId },
                          prefixDataTestId: 'contact-compliance-update',
                          emptyStateBehavior: 'enable',
                          deferMainContextRequestsUntilClick: true,
                          variant: 'custom',
                          children: (
                            <Button data-testid="contact-compliance-update-button" variant="default" size="sm">
                              {getTranslationFromI18nKeyAndLabel(
                                'crm.compliance.updateAction',
                                'Update Compliance Data'
                              )}
                            </Button>
                          )
                        }
                      },
                      'data-testid': 'contact-compliance-section'
                    }
                  }
                ]}
                data-testid="contact-compliance-section-wrapper"
              />
            </div>
          )
        }
      ]
    }),
    [
      activeTab,
      handleTabChange,
      contactData,
      contactId,
      props,
      tasks,
      approvals,
      notes,
      activities,
      sectionsLoading,
      sectionsError,
      loadSectionData,
      taskActionProps,
      approvalActionProps,
      noteActionProps,
      activityActionProps
    ]
  )

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !contactData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" style={{ color: 'var(--nw-color-destructive-600)' }}>
            {error || getTranslationFromI18nKeyAndLabel('crm.customers.contact.notFound', 'Customer Contact not found')}
          </p>
          <Button
            onClick={onBack}
            style={{ marginTop: 'var(--nw-spacing-sm)' }}
            variant="default"
            data-testid="customer-contact-error-back-button"
          >
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    )
  }

  // Header title without contact type badge (contact type shown in Account Section)
  const headerTitle = fullName

  return (
    <RecordLayout
      data-testid="customer-contact-detail"
      headerOrientation="horizontal"
      headerAvatar={<IconAvatar icon={UserIcon} variant="decorative" size="xl" />}
      headerOverline={getTranslationFromI18nKeyAndLabel('crm.common.contact', 'CONTACT')}
      onBack={onBack}
      headerTitle={headerTitle}
      headerSlotMain={<HeaderSlot headerSlotItemGroups={headerDetailGroups} orientation="horizontal" />}
      headerActions={headerActions}
      headerActionButton={headerActionButton}
      views={subViewsConfig.items}
      defaultView={subViewsConfig.defaultValue}
      onViewChange={subViewsConfig.onValueChange}
    />
  )
}

interface ContactRecordProps extends BusinessAppContextProps {
  contactId?: string
  source?: string
  onBack?: () => void
}

const ContactRecord: React.FC<ContactRecordProps> = props => {
  const contactId = useMemo(() => {
    return props.contactId || new URLSearchParams(window.location.search).get('contactId')
  }, [props.contactId])

  const fromEntity = useMemo(() => {
    return new URLSearchParams(window.location.search).get('fromEntity')
  }, [])

  const handleBack = () => {
    if (props.onBack) {
      props.onBack()
    } else {
      // Navigate back based on fromEntity first, then source
      switch (fromEntity) {
        case 'salesPerformance':
          // Check if there's an employee ID to navigate back to specific employee performance
          const employeeId = new URLSearchParams(window.location.search).get('employeeId')
          const salesPerformanceUrl = employeeId
            ? `/platform/crm/sales-performance?employeeId=${employeeId}`
            : '/platform/crm/sales-performance'
          navigateTo(salesPerformanceUrl)
          break
        default:
          // Default back navigation based on source
          navigateTo(buildPlatformUrl('/platform/crm/customer-relations', { view: 'contacts' }))
          break
      }
    }
  }

  if (!contactId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p
            className="gba:text-lg"
            style={{ color: 'var(--nw-color-destructive-600)' }}
            data-testid="customer-contact-no-id-message"
          >
            {getTranslationFromI18nKeyAndLabel('crm.customers.contact.idRequired', 'Contact ID is required')}
          </p>
          <Button
            onClick={handleBack}
            style={{ marginTop: 'var(--nw-spacing-sm)' }}
            variant="default"
            data-testid="customer-contact-no-id-back-button"
          >
            {getTranslationFromI18nKeyAndLabel('crm.customers.navigation.backToContacts', 'Back to Customer Contacts')}
          </Button>
        </div>
      </div>
    )
  }

  return <ContactRecordContent {...props} contactId={contactId} onBack={handleBack} fromEntity={fromEntity} />
}

export { ContactRecord, ContactRecordContent }

export default ContactRecord
