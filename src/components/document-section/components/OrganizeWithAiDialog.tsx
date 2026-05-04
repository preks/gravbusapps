import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
  Textarea
} from '@newwork/nw-design-system'
import { SparkleIcon, TreeStructureIcon, TextAaIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFolderTemplateData } from '@/common/components/common-relations/setting-pages/folder-templates/hooks/useFolderTemplateData'
import {
  ModuleType,
  EntityType,
  InvestmentCatalogType
} from '@/common/components/common-relations/setting-pages/folder-templates/types'
import { useInvestmentFolderTemplates } from '@/common/components/common-relations/setting-pages/folder-templates/hooks/useInvestmentFolderTemplates'
import type { DocumentItem, AiOrganizeConfig } from '../types'
import type { OrganizeState } from '../hooks/useDocumentOrganize'
import type { FolderNode } from '@/common/components/common-relations/setting-pages/folder-templates/types'
import { OrganizePreview } from './OrganizePreview'
import { TemplatePreviewSection, DocumentSelectionList } from './OrganizeDialogParts'

interface OrganizeWithAiDialogProps {
  open: boolean
  onClose: () => void
  fileDocuments: DocumentItem[]
  aiOrganizeConfig: AiOrganizeConfig
  accessToken: string
  state: OrganizeState
  onOrganizeByTemplate: (selectedDocIds: string[], template: { folders: FolderNode[] }) => void
  onOrganizeByDescription: (selectedDocIds: string[], description: string) => void
  onApply: () => void
  onReset: () => void
  dataTestId?: string
}

const DATA_TEST_ID = 'organize-with-ai'

const ENTITY_TYPE_MAP: Record<AiOrganizeConfig['entityType'], EntityType> = {
  LEAD: EntityType.LEAD,
  CONTACT: EntityType.CONTACT,
  ACCOUNT: EntityType.ACCOUNT,
  OPPORTUNITY: EntityType.OPPORTUNITY,
  INVESTMENT: EntityType.INVESTMENT
}

const INVESTMENT_CATALOG_TYPE_MAP: Record<
  NonNullable<NonNullable<AiOrganizeConfig['investmentTemplate']>['catalogType']>,
  InvestmentCatalogType
> = {
  GROUP: InvestmentCatalogType.GROUP,
  TYPE: InvestmentCatalogType.TYPE,
  LIQUID_FUND_TYPE: InvestmentCatalogType.LIQUID_FUND_TYPE
}

export const OrganizeWithAiDialog: React.FC<OrganizeWithAiDialogProps> = ({
  open,
  onClose,
  fileDocuments,
  aiOrganizeConfig,
  accessToken,
  state,
  onOrganizeByTemplate,
  onOrganizeByDescription,
  onApply,
  onReset,
  dataTestId = DATA_TEST_ID
}) => {
  const [activeTab, setActiveTab] = useState<'template' | 'description'>('template')
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() => fileDocuments.map(d => d.id))
  const [description, setDescription] = useState('')

  const moduleType = aiOrganizeConfig.moduleType === 'IRM' ? ModuleType.IRM : ModuleType.CRM
  const entityType = ENTITY_TYPE_MAP[aiOrganizeConfig.entityType]
  const isInvestmentEntity = moduleType === ModuleType.IRM && entityType === EntityType.INVESTMENT

  const genericTemplateData = useFolderTemplateData(isInvestmentEntity ? '' : accessToken, moduleType, entityType)
  const investmentCatalogType = INVESTMENT_CATALOG_TYPE_MAP[aiOrganizeConfig.investmentTemplate?.catalogType ?? 'GROUP']
  const investmentTemplateData = useInvestmentFolderTemplates(
    isInvestmentEntity ? accessToken : '',
    investmentCatalogType
  )
  const investmentTemplateEntry = useMemo(() => {
    if (!isInvestmentEntity) return null

    const entryId = aiOrganizeConfig.investmentTemplate?.entryId
    if (entryId) {
      const byId = investmentTemplateData.entries.find(entry => entry.id === entryId)
      if (byId) return byId
    }

    const entryCode = aiOrganizeConfig.investmentTemplate?.entryCode?.toLowerCase()
    if (entryCode) {
      const byCode = investmentTemplateData.entries.find(entry => entry.code?.toLowerCase() === entryCode)
      if (byCode) return byCode
    }

    return null
  }, [
    isInvestmentEntity,
    aiOrganizeConfig.investmentTemplate?.entryId,
    aiOrganizeConfig.investmentTemplate?.entryCode,
    investmentTemplateData.entries
  ])
  const templateFolders = isInvestmentEntity
    ? (investmentTemplateEntry?.objectValue?.initFolders ?? [])
    : genericTemplateData.folders
  const templateLoading = isInvestmentEntity ? investmentTemplateData.isLoading : genericTemplateData.isLoading

  const allSelected = selectedDocIds.length === fileDocuments.length

  const toggleDocument = (docId: string) => {
    setSelectedDocIds(prev => (prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]))
  }

  const toggleAll = () => {
    setSelectedDocIds(allSelected ? [] : fileDocuments.map(d => d.id))
  }

  const handleOrganize = () => {
    if (selectedDocIds.length === 0) return
    if (activeTab === 'template') {
      onOrganizeByTemplate(selectedDocIds, { folders: templateFolders })
    } else {
      onOrganizeByDescription(selectedDocIds, description)
    }
  }

  const canOrganize = useMemo(() => {
    if (selectedDocIds.length === 0) return false
    if (activeTab === 'template') return templateFolders.length > 0
    return description.trim().length > 0
  }, [selectedDocIds, activeTab, templateFolders, description])

  const isProcessing = state.phase === 'loading' || state.phase === 'applying'
  const showPreview = state.phase === 'preview'
  const showError = state.phase === 'error'

  return (
    <Dialog open={open} onOpenChange={val => !val && onClose()}>
      <DialogContent className="gba:w-full gba:max-w-2xl gba:max-h-screen gba:overflow-y-auto" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <SparkleIcon weight="fill" className="gba:h-5 gba:w-5 gba:text-primary" />
            {getTranslationFromI18nKeyAndLabel('document.ai.organize.title', 'Organize with AI')}
          </DialogTitle>
        </DialogHeader>

        {isProcessing && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:gap-4">
            <Spinner size="lg" />
            <p className="gba:text-sm gba:text-muted-foreground gba:animate-pulse">
              {state.phase === 'applying'
                ? getTranslationFromI18nKeyAndLabel('document.ai.organize.applying', 'Applying changes...')
                : getTranslationFromI18nKeyAndLabel(
                    'document.ai.organize.analyzing',
                    'AI is analyzing your documents...'
                  )}
            </p>
          </div>
        )}

        {showError && (
          <div className="gba:py-6">
            <div className="gba:rounded-lg gba:bg-destructive/10 gba:p-4 gba:text-sm gba:text-destructive gba:text-center">
              {state.errorMessage || 'An error occurred'}
            </div>
            <div className="gba:flex gba:justify-center gba:mt-4">
              <Button variant="outline" size="sm" onClick={onReset} data-testid={`${dataTestId}-retry`}>
                {getTranslationFromI18nKeyAndLabel('document.ai.organize.tryAgain', 'Try Again')}
              </Button>
            </div>
          </div>
        )}

        {showPreview && (
          <OrganizePreview
            decisions={state.decisions}
            suggestedFolders={state.suggestedFolders}
            warnings={state.warnings}
            reasoning={state.reasoning}
            fileDocuments={fileDocuments}
            dataTestId={dataTestId}
          />
        )}

        {state.phase === 'idle' && (
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'template' | 'description')}>
            <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
              <TabsTrigger
                value="template"
                className="gba:gap-1.5"
                startIcon={<TreeStructureIcon size={16} />}
                data-testid={`${dataTestId}-tab-template`}
              >
                {getTranslationFromI18nKeyAndLabel('document.ai.organize.byTemplate', 'By Template')}
              </TabsTrigger>
              <TabsTrigger
                value="description"
                className="gba:gap-1.5"
                startIcon={<TextAaIcon size={16} />}
                data-testid={`${dataTestId}-tab-description`}
              >
                {getTranslationFromI18nKeyAndLabel('document.ai.organize.byDescription', 'By Description')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="gba:space-y-4 gba:mt-4">
              <TemplatePreviewSection isLoading={templateLoading} folders={templateFolders} dataTestId={dataTestId} />
            </TabsContent>

            <TabsContent value="description" className="gba:space-y-4 gba:mt-4">
              <Textarea
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'document.ai.organize.descriptionPlaceholder',
                  'Describe how you want your documents organized...'
                )}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                data-testid={`${dataTestId}-description-input`}
              />
            </TabsContent>

            <DocumentSelectionList
              fileDocuments={fileDocuments}
              selectedDocIds={selectedDocIds}
              allSelected={allSelected}
              toggleDocument={toggleDocument}
              toggleAll={toggleAll}
              dataTestId={dataTestId}
            />
          </Tabs>
        )}

        <DialogFooter>
          {state.phase === 'done' ? (
            <Button onClick={onClose} data-testid={`${dataTestId}-close`}>
              {getTranslationFromI18nKeyAndLabel('document.ai.organize.close', 'Close')}
            </Button>
          ) : showPreview ? (
            <>
              <Button variant="outline" onClick={onReset} data-testid={`${dataTestId}-back`}>
                {getTranslationFromI18nKeyAndLabel('document.ai.organize.back', 'Back')}
              </Button>
              <Button onClick={onApply} data-testid={`${dataTestId}-confirm`}>
                <SparkleIcon weight="fill" className="gba:h-4 gba:w-4 gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('document.ai.organize.confirm', 'Confirm & Apply')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} data-testid={`${dataTestId}-cancel`}>
                {getTranslationFromI18nKeyAndLabel('document.ai.organize.cancel', 'Cancel')}
              </Button>
              {state.phase === 'idle' && (
                <Button onClick={handleOrganize} disabled={!canOrganize} data-testid={`${dataTestId}-organize`}>
                  <SparkleIcon weight="fill" className="gba:h-4 gba:w-4 gba:mr-1" />
                  {activeTab === 'template'
                    ? getTranslationFromI18nKeyAndLabel('document.ai.organize.organizeBtn', 'Organize')
                    : getTranslationFromI18nKeyAndLabel('document.ai.organize.suggestBtn', 'Suggest & Apply')}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
