/**
 * Case Management Application
 *
 * Reusable case management application that can be embedded in any module
 * Filters cases by app tag and provides full CRUD + flow management capabilities
 */

import React, { useState, useEffect } from 'react'
import { CaseManagementProps } from './types'
import { Case, CreateCaseRequest, AddFlowRequest, LinkedEntity } from './types'
import { CaseApiClient } from './services'
import { CaseDashboard } from './components/CaseDashboard'
import { CaseList } from './components/CaseList'
import { CaseDetails } from './components/CaseDetails'
import { CreateCaseDialog } from './components/CreateCaseDialog'

const BASE_URL = import.meta.env.VITE_CFLOW_ENGINE_URL || window.location.origin

type ViewState = 'dashboard' | 'list' | 'detail'

export const CaseManagement: React.FC<CaseManagementProps> = ({
  appName,
  appDescription,
  appTag,
  allowCreate = true,
  allowEdit = true,
  allowDelete = false,
  showAnalytics = true,
  defaultView = 'dashboard',
  // These will be used in future entity linking features
  enableEntityLinking: _enableEntityLinking = true,
  entityTypes: _entityTypes = ['user', 'employee', 'organizationalUnit'],
  ...context
}) => {
  // Suppress unused variable warnings for future features
  void _enableEntityLinking
  void _entityTypes

  const [activeView, setActiveView] = useState<ViewState>(defaultView)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [recentCases, setRecentCases] = useState<Case[]>([])
  const [_isLoadingRecent, setIsLoadingRecent] = useState(false)
  // Suppress unused variable warning - isLoadingRecent reserved for future loading indicator
  void _isLoadingRecent

  const client = new CaseApiClient(BASE_URL, context.accessToken)

  // Parse URL parameters on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const viewFromUrl = searchParams.get('view')
    const caseIdFromUrl = searchParams.get('caseId')

    if (caseIdFromUrl) {
      setSelectedCaseId(caseIdFromUrl)
      setActiveView('detail')
    } else if (viewFromUrl === 'list') {
      setActiveView('list')
    }
  }, [])

  // Load recent cases for dashboard
  useEffect(() => {
    if (activeView === 'dashboard' && showAnalytics) {
      loadRecentCases()
    }
  }, [activeView, showAnalytics])

  // Update URL when view changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)

    if (activeView === 'list') {
      searchParams.set('view', 'list')
      searchParams.delete('caseId')
    } else if (activeView === 'detail' && selectedCaseId) {
      searchParams.set('view', 'detail')
      searchParams.set('caseId', selectedCaseId)
    } else {
      searchParams.delete('view')
      searchParams.delete('caseId')
    }

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [activeView, selectedCaseId])

  const loadRecentCases = async () => {
    try {
      setIsLoadingRecent(true)
      const response = await client.getCasesList({
        tags: { app: appTag }
      })
      setRecentCases(response.cases.slice(0, 5))
    } catch (error) {
      console.error('Failed to load recent cases:', error)
    } finally {
      setIsLoadingRecent(false)
    }
  }

  const handleCreateCase = async (data: CreateCaseRequest) => {
    const result = await client.createCase(data)
    // Navigate to the new case
    setSelectedCaseId(result.caseId)
    setActiveView('detail')
    // Refresh recent cases
    loadRecentCases()
  }

  const handleViewCase = (caseId: string) => {
    setSelectedCaseId(caseId)
    setActiveView('detail')
  }

  const handleBackToDashboard = () => {
    setSelectedCaseId(null)
    setActiveView('dashboard')
  }

  const handleCompleteCase = async (caseId: string) => {
    try {
      await client.completeCase(caseId)
      // Refresh the view
      if (activeView === 'detail') {
        const currentId = selectedCaseId
        setSelectedCaseId(null)
        setTimeout(() => setSelectedCaseId(currentId), 0)
      }
      loadRecentCases()
    } catch (error) {
      console.error('Failed to complete case:', error)
      throw error
    }
  }

  const handleAddFlow = async (caseId: string, request: AddFlowRequest) => {
    try {
      await client.addFlowToCase(caseId, request)
    } catch (error) {
      console.error('Failed to add flow:', error)
      throw error
    }
  }

  const handleRemoveFlow = async (caseId: string, workflowId: string) => {
    try {
      await client.removeFlowFromCase(caseId, workflowId)
    } catch (error) {
      console.error('Failed to remove flow:', error)
      throw error
    }
  }

  const handleAddNote = async (caseId: string, content: string, visibility: 'internal' | 'external') => {
    console.log('Add note:', { caseId, content, visibility })
  }

  const handleLinkEntity = async (caseId: string, entity: LinkedEntity) => {
    console.log('Link entity:', { caseId, entity })
  }

  const handleUnlinkEntity = async (caseId: string, entityId: string) => {
    console.log('Unlink entity:', { caseId, entityId })
  }

  // Render case detail view
  if (activeView === 'detail' && selectedCaseId) {
    return (
      <CaseDetails
        caseId={selectedCaseId}
        context={context}
        appTag={appTag}
        onBack={handleBackToDashboard}
        onCompleteCase={handleCompleteCase}
        onAddFlow={handleAddFlow}
        onRemoveFlow={handleRemoveFlow}
        onAddNote={handleAddNote}
        onLinkEntity={handleLinkEntity}
        onUnlinkEntity={handleUnlinkEntity}
        allowEdit={allowEdit}
      />
    )
  }

  // Render list view
  if (activeView === 'list') {
    return (
      <>
        <div className="gba:w-full gba:h-full">
          <CaseList
            context={context}
            appTag={appTag}
            onViewCase={handleViewCase}
            onCreateCase={() => setIsCreateDialogOpen(true)}
            onCompleteCase={handleCompleteCase}
            onBack={handleBackToDashboard}
            allowCreate={allowCreate}
            allowDelete={allowDelete}
          />
        </div>

        {/* Create Case Dialog */}
        <CreateCaseDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={handleCreateCase}
          appTag={appTag}
          userId={context.userInfo?.id}
        />
      </>
    )
  }

  // Render dashboard view (default)
  return (
    <>
      <div className="gba:w-full gba:h-full">
        <CaseDashboard
          context={context}
          appTag={appTag}
          appName={appName}
          appDescription={appDescription}
          onCreateCase={() => setIsCreateDialogOpen(true)}
          onViewAllCases={() => setActiveView('list')}
          onViewCase={handleViewCase}
          recentCases={recentCases}
          showAnalytics={showAnalytics}
        />
      </div>

      {/* Create Case Dialog */}
      <CreateCaseDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateCase}
        appTag={appTag}
        userId={context.userInfo?.id}
      />
    </>
  )
}

export default CaseManagement
