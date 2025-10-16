import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Button,
  Spinner,
  RecordLayout,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { Users, FileText, User, CurrencyDollar } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useContactData } from './hooks/useContactData'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AiActions, AiAction } from '@/common/components/common-relations/record-sections/header-section/ai-actions'
import { getContactTypeDisplayValue, getLanguageDisplayValue, getContactFullName } from './utils'
import { useContactAiSummary } from './hooks/useContactAiSummary'
import { Bot } from 'lucide-react'
import {
  useGetInvestmentActivitiesByContactId,
  useGetInvestmentNotesByContactId,
  useGetInvestmentTasksByContactId
} from '@/common/data/investment/hooks/useInvestmentContacts'
import { HomeView } from './views/home-view/HomeView'
import { OpportunityView } from './views/opportunity-view/OpportunityView'
import { DocumentView } from './views/document-view/DocumentView'

interface ContactRecordContentProps extends BusinessAppContextProps {
  contactId: string
  onBack: () => void
  fromEntity?: string | null
}

const InvestmentContactRecordContent: React.FC<ContactRecordContentProps> = ({
  contactId,
  onBack,
  fromEntity,
  ...props
}) => {
  const [contact, setContact] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'overview'
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || 'overview'
  })

  const {
    contact: contactData,
    rawContactData,
    loading: dataLoading,
    error: dataError,
    refetch: refetchContactData
  } = useContactData(contactId, props.accessToken)

  // AI Summary hook - must be called before any conditional returns
  const aiSummaryHook = useContactAiSummary(contactId, props.accessToken)

  // Data fetching hooks for sections
  const { fetchInvestmentActivitiesByContactId } = useGetInvestmentActivitiesByContactId(props)
  const { fetchInvestmentNotesByContactId } = useGetInvestmentNotesByContactId(props)
  const { fetchInvestmentTasksByContactId } = useGetInvestmentTasksByContactId(props)

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
        fetchInvestmentActivitiesByContactId(contactId),
        fetchInvestmentNotesByContactId(contactId),
        fetchInvestmentTasksByContactId(contactId)
      ])

      const sortedActivities = (activitiesData || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const sortedNotes = (notesData || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const sortedTasks = (tasksData || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      // Separate regular tasks from approvals based on taskType catalog entry
      const regularTasks = sortedTasks.filter((task: any) => {
        const taskTypeCode = task?.taskType?.code || ''
        const taskTypeValue = task?.taskType?.value || ''
        return taskTypeCode?.toUpperCase() !== 'APPROVAL' && taskTypeValue?.toUpperCase() !== 'APPROVAL'
      })
      const approvalTasks = sortedTasks.filter((task: any) => {
        const taskTypeCode = task?.taskType?.code || ''
        const taskTypeValue = task?.taskType?.value || ''
        return taskTypeCode?.toUpperCase() === 'APPROVAL' || taskTypeValue?.toUpperCase() === 'APPROVAL'
      })

      setActivities(sortedActivities)
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
    fetchInvestmentActivitiesByContactId,
    fetchInvestmentNotesByContactId,
    fetchInvestmentTasksByContactId
  ])

  // Load section data on mount
  useEffect(() => {
    loadSectionData()
  }, [loadSectionData])

  // Listen for process completion events to refresh contact data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          refetchContactData()
          loadSectionData() // Also refresh section data
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.contact) {
          refetchContactData()
          loadSectionData() // Also refresh section data
        }
      } catch (err) {
        console.error('Error handling process completion in ContactRecord:', err)
      }
    }

    // Listen to multiple possible event names for contact updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })
    }
  }, [contactId, refetchContactData, loadSectionData])

  // Get source from URL parameters to determine back navigation text
  const source = useMemo(() => {
    return new URLSearchParams(window.location.search).get('source')
  }, [])

  const getBackButtonText = () => {
    if (source === 'investment-relations') {
      return getTranslationFromI18nKeyAndLabel(
        'crm.investments.navigation.backToRelations',
        'Back to Investment Relations'
      )
    }
    if (fromEntity === 'leads') {
      return getTranslationFromI18nKeyAndLabel('crm.investments.navigation.backToLeads', 'Back to Investment Leads')
    }
    if (fromEntity === 'accounts') {
      return getTranslationFromI18nKeyAndLabel(
        'crm.investments.navigation.backToAccounts',
        'Back to Investment Accounts'
      )
    }
    return getTranslationFromI18nKeyAndLabel('crm.investments.navigation.backToContacts', 'Back to Investment Contacts')
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
              contactData?.email || contact?.email || getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: Users
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.phone', 'Phone'),
            value:
              contactData?.phone || contact?.phone || getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: Users
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.birthday', 'Birthday'),
            value:
              contactData?.birthDate || contact?.birthDate
                ? new Date(contactData?.birthDate || contact?.birthDate || '').toLocaleDateString('en-GB')
                : getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set'),
            icon: Users
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.language', 'Language'),
            value: getLanguageDisplayValue(contactData, contact),
            icon: Users
          },
          {
            label: getTranslationFromI18nKeyAndLabel('crm.common.owner', 'Owner'),
            value:
              contactData?.ownerEmployee?.displayName ||
              contact?.ownerEmployee?.displayName ||
              getTranslationFromI18nKeyAndLabel('crm.common.notAssigned', 'Not assigned'),
            icon: User
          }
        ]
      }
    ],
    [contactData, contact]
  )

  const headerActions = useMemo(() => {
    const actions: AiAction[] = [
      {
        key: 'ai-summary',
        label: getTranslationFromI18nKeyAndLabel('crm.ai.summary', 'AI Summary'),
        icon: <Bot size={16} />,
        hook: aiSummaryHook,
        config: {
          entityType: 'contact',
          loadingMessage: getTranslationFromI18nKeyAndLabel('crm.ai.summary.loading', 'Generating AI Summary...'),
          loadingSubtitle: getTranslationFromI18nKeyAndLabel(
            'crm.ai.summary.contact.subtitle',
            'Analyzing contact data and activities'
          )
        }
      }
    ]

    return (
      <AiActions
        actions={actions}
        dataTestId={`contact-update-button-${contactId}`}
        buttonText={getTranslationFromI18nKeyAndLabel('crm.ai.summary', 'AI Summary')}
      />
    )
  }, [aiSummaryHook, contactId])

  const headerActionButton = useMemo(
    () => (
      <AppActionButton
        data-testid="investment-contact-record-action-button"
        size="icon"
        contextsArray={[FlowContextName.investmentContactEntity]}
        externalContextData={{
          contactId: contactId
        }}
        prefixDataTestId="investment-contact-record-action"
        accessToken={props.accessToken}
        emptyStateBehavior="hide"
        deferMainContextRequestsUntilClick={false}
      />
    ),
    [contactId, props.accessToken]
  )

  // Action props for sections - must be defined before subViewsConfig
  const activityActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.createInvestmentActivity],
      externalContextData: { contactId },
      prefixDataTestId: 'contact-activity'
    }),
    [contactId]
  )

  const noteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentNoteCreate],
      externalContextData: { contactId },
      prefixDataTestId: 'contact-note'
    }),
    [contactId]
  )

  const taskActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentTaskCreate],
      externalContextData: { contactId },
      prefixDataTestId: 'contact-task'
    }),
    [contactId]
  )

  const approvalActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentTaskCreate],
      externalContextData: {
        contactId,
        typeRef: 'InvestmentTaskType:v1:APPROVAL',
        investmentTask: { contact: contactId, type: 'InvestmentTaskType:v1:APPROVAL' }
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
          icon: <User className="gba:mr-2" />,
          content: (
            <HomeView
              contactId={contactId}
              contact={contact}
              rawContactData={rawContactData}
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
          icon: <CurrencyDollar className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <OpportunityView contactId={contactId} {...props} />
            </div>
          )
        },
        {
          value: 'documents',
          label: getTranslationFromI18nKeyAndLabel('crm.common.documents', 'Documents'),
          icon: <FileText className="gba:mr-2" />,
          content: (
            <div className="gba:col-span-12">
              <DocumentView contactId={contactId} {...props} />
            </div>
          )
        }
      ]
    }),
    [
      activeTab,
      handleTabChange,
      contact,
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

  useEffect(() => {
    const fetchContactData = async () => {
      if (!contactId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        if (contactData) {
          setContact(contactData)
        } else if (dataError) {
          setError(dataError)
        }
      } catch (err) {
        console.error('Error fetching investment contact:', err)
        setError(err instanceof Error ? err.message : 'Failed to load investment contact')
      } finally {
        setLoading(false)
      }
    }

    if (!dataLoading) {
      fetchContactData()
    }
  }, [contactId, contactData, dataLoading, dataError])

  // Update loading state based on data loading
  useEffect(() => {
    setLoading(dataLoading)
  }, [dataLoading])

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" style={{ color: 'var(--nw-color-destructive-600)' }}>
            {error ||
              getTranslationFromI18nKeyAndLabel('crm.investments.contact.notFound', 'Investment Contact not found')}
          </p>
          <Button
            onClick={onBack}
            style={{ marginTop: 'var(--nw-spacing-sm)' }}
            variant="default"
            data-testid="investment-contact-error-back-button"
          >
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    )
  }

  const fullName = getContactFullName(contactData, contact)

  // Create header title with contact type badge
  const contactType = contactData?.contactType || contact?.contactType
  const contactTypeLabel = getContactTypeDisplayValue(contactData, contact)

  const headerTitle = (
    <div className="gba:flex gba:items-center gba:gap-2">
      <span>{fullName}</span>
      {contactType && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge data-testid="contact-type-badge" variant="outline" className="gba:text-sm">
                {contactTypeLabel}
              </Badge>
            </TooltipTrigger>
            <TooltipContent data-testid="contact-type-tooltip">
              {getTranslationFromI18nKeyAndLabel('crm.common.contactType', 'Contact Type')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )

  return (
    <div data-testid="investment-contact-detail">
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={User}
        headerCategory={getTranslationFromI18nKeyAndLabel('crm.common.contact', 'CONTACT')}
        onBack={onBack}
        headerTitle={headerTitle}
        headerDetailGroups={headerDetailGroups}
        headerActions={headerActions}
        headerActionButton={headerActionButton}
        subViews={subViewsConfig}
      />
    </div>
  )
}

interface InvestmentContactRecordProps extends BusinessAppContextProps {
  contactId?: string
}

const ContactRecord: React.FC<InvestmentContactRecordProps> = ({ contactId: propContactId, ...props }) => {
  const contactId = useMemo(() => {
    return propContactId || new URLSearchParams(window.location.search).get('contactId')
  }, [propContactId])
  const handleBack = () => {
    // Always navigate to investment relations
    navigateTo(buildPlatformUrl('/platform/irm/investment-relations', { view: 'contacts' }))
  }

  if (!contactId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p
            className="gba:text-lg"
            style={{ color: 'var(--nw-color-destructive-600)' }}
            data-testid="investment-contact-no-id-message"
          >
            {getTranslationFromI18nKeyAndLabel('crm.investments.contact.idRequired', 'Contact ID is required')}
          </p>
          <Button
            onClick={handleBack}
            style={{ marginTop: 'var(--nw-spacing-sm)' }}
            variant="default"
            data-testid="investment-contact-no-id-back-button"
          >
            {getTranslationFromI18nKeyAndLabel(
              'crm.investments.navigation.backToContacts',
              'Back to Investment Contacts'
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <InvestmentContactRecordContent
      contactId={contactId}
      onBack={handleBack}
      fromEntity={new URLSearchParams(window.location.search).get('fromEntity')}
      {...props}
    />
  )
}

export { ContactRecord }
export default ContactRecord
