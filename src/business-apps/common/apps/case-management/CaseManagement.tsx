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
  const [previousView, setPreviousView] = useState<ViewState>(defaultView)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [recentCases, setRecentCases] = useState<Case[]>([])
  const [_isLoadingRecent, setIsLoadingRecent] = useState(false)
  // Suppress unused variable warning - isLoadingRecent reserved for future loading indicator
  void _isLoadingRecent

  // Let CaseApiClient handle the URL resolution (it has production-safe fallbacks)
  const client = new CaseApiClient(undefined, context.accessToken)

  // Parse URL parameters on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const viewFromUrl = searchParams.get('view')
    const caseIdFromUrl = searchParams.get('caseId')

    if (caseIdFromUrl) {
      setSelectedCaseId(caseIdFromUrl)
      setActiveView('detail')
      // Set previous view to list for direct URL navigation to a case
      setPreviousView('list')
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
    setPreviousView(activeView)
    setSelectedCaseId(caseId)
    setActiveView('detail')
  }

  const handleBack = () => {
    setSelectedCaseId(null)
    // Return to previous view (list or dashboard)
    setActiveView(previousView)
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
    try {
      await client.addNoteToCase(caseId, {
        content,
        visibility,
        createdBy: context.userInfo?.id || 'system'
      })
    } catch (error) {
      console.error('Failed to add note:', error)
      throw error
    }
  }

  const handleLinkEntity = async (caseId: string, entity: LinkedEntity) => {
    try {
      await client.linkEntity(caseId, entity, context.userInfo?.id)
    } catch (error) {
      console.error('Failed to link entity:', error)
      throw error
    }
  }

  const handleUnlinkEntity = async (caseId: string, entityId: string) => {
    try {
      await client.unlinkEntity(caseId, entityId)
    } catch (error) {
      console.error('Failed to unlink entity:', error)
      throw error
    }
  }

  const handleLinkCase = async (caseId: string, targetCaseId: string, relationship: 'parent' | 'child' | 'related') => {
    try {
      await client.linkCase(caseId, targetCaseId, relationship, context.userInfo?.id)
    } catch (error) {
      console.error('Failed to link case:', error)
      throw error
    }
  }

  const handleUnlinkCase = async (caseId: string, targetCaseId: string) => {
    try {
      await client.unlinkCase(caseId, targetCaseId)
    } catch (error) {
      console.error('Failed to unlink case:', error)
      throw error
    }
  }

  const handleNavigateToCase = (navigateCaseId: string) => {
    setSelectedCaseId(navigateCaseId)
    setActiveView('detail')
  }

  const handleUpdateCase = async (
    caseId: string,
    updates: {
      title?: string
      description?: string
      priority?: 'low' | 'medium' | 'high' | 'critical'
      assignedTo?: string
    }
  ) => {
    try {
      await client.updateCase(caseId, updates)
      loadRecentCases()
    } catch (error) {
      console.error('Failed to update case:', error)
      throw error
    }
  }

  // Render case detail view
  if (activeView === 'detail' && selectedCaseId) {
    return (
      <CaseDetails
        caseId={selectedCaseId}
        context={context}
        appTag={appTag}
        headerCategory={appName}
        onBack={handleBack}
        onCompleteCase={handleCompleteCase}
        onAddFlow={handleAddFlow}
        onRemoveFlow={handleRemoveFlow}
        onAddNote={handleAddNote}
        onLinkEntity={handleLinkEntity}
        onUnlinkEntity={handleUnlinkEntity}
        onLinkCase={handleLinkCase}
        onUnlinkCase={handleUnlinkCase}
        onNavigateToCase={handleNavigateToCase}
        onUpdateCase={handleUpdateCase}
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
            onBack={handleBack}
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
          accessToken={context.accessToken}
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
        accessToken={context.accessToken}
      />
    </>
  )
}

export default CaseManagement
