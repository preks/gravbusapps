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
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { SparkleIcon, TreeStructureIcon, TextAaIcon } from '@phosphor-icons/react'
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
import translations from '../_i18n'

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

const ENTITY_TYPE_MAP: Partial<Record<AiOrganizeConfig['entityType'], EntityType>> = {
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

function getTemplateFolders(
  isInvestmentEntity: boolean,
  investmentFolders: FolderNode[] | undefined,
  mappedEntityType: EntityType | undefined,
  genericFolders: FolderNode[]
): FolderNode[] {
  if (isInvestmentEntity) {
    return investmentFolders ?? []
  }

  if (mappedEntityType) {
    return genericFolders
  }

  return []
}

function getTemplateLoading(isInvestmentEntity: boolean, investmentLoading: boolean, genericLoading: boolean): boolean {
  if (isInvestmentEntity) {
    return investmentLoading
  }

  return genericLoading
}

function OrganizeDialogFooter({
  phase,
  showPreview,
  activeTab,
  canOrganize,
  onClose,
  onReset,
  onApply,
  onOrganize,
  dataTestId
}: Readonly<{
  phase: OrganizeState['phase']
  showPreview: boolean
  activeTab: 'template' | 'description'
  canOrganize: boolean
  onClose: () => void
  onReset: () => void
  onApply: () => void
  onOrganize: () => void
  dataTestId: string
}>) {
  const { t } = useTranslation(translations)

  if (phase === 'done') {
    return (
      <Button onClick={onClose} data-testid={`${dataTestId}-close`}>
        {t('document-ai-organize-close')}
      </Button>
    )
  }

  if (showPreview) {
    return (
      <>
        <Button variant="outline" onClick={onReset} data-testid={`${dataTestId}-back`}>
          {t('document-ai-organize-back')}
        </Button>
        <Button onClick={onApply} data-testid={`${dataTestId}-confirm`}>
          <SparkleIcon weight="fill" className="gba:h-4 gba:w-4 gba:mr-1" />
          {t('document-ai-organize-confirm')}
        </Button>
      </>
    )
  }

  const actionLabel =
    activeTab === 'template' ? t('document-ai-organize-organize-btn') : t('document-ai-organize-suggest-btn')

  return (
    <>
      <Button variant="outline" onClick={onClose} data-testid={`${dataTestId}-cancel`}>
        {t('document-ai-organize-cancel')}
      </Button>
      {phase === 'idle' && (
        <Button onClick={onOrganize} disabled={!canOrganize} data-testid={`${dataTestId}-organize`}>
          <SparkleIcon weight="fill" className="gba:h-4 gba:w-4 gba:mr-1" />
          {actionLabel}
        </Button>
      )}
    </>
  )
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
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<'template' | 'description'>('template')
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() => fileDocuments.map(d => d.id))
  const [description, setDescription] = useState('')

  const moduleType = aiOrganizeConfig.moduleType === 'IRM' ? ModuleType.IRM : ModuleType.CRM
  const mappedEntityType = ENTITY_TYPE_MAP[aiOrganizeConfig.entityType]
  const entityType = mappedEntityType ?? EntityType.INVESTMENT
  const isInvestmentEntity = moduleType === ModuleType.IRM && mappedEntityType === EntityType.INVESTMENT

  const genericTemplateData = useFolderTemplateData(
    mappedEntityType && !isInvestmentEntity ? accessToken : '',
    moduleType,
    entityType
  )
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
  const templateFolders = getTemplateFolders(
    isInvestmentEntity,
    investmentTemplateEntry?.objectValue?.initFolders,
    mappedEntityType,
    genericTemplateData.folders
  )
  const templateLoading = getTemplateLoading(
    isInvestmentEntity,
    investmentTemplateData.isLoading,
    genericTemplateData.isLoading
  )

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
            {t('document-ai-organize-title')}
          </DialogTitle>
        </DialogHeader>

        {isProcessing && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:gap-4">
            <Spinner size="lg" />
            <p className="gba:text-sm gba:text-muted-foreground gba:animate-pulse">
              {state.phase === 'applying' ? t('document-ai-organize-applying') : t('document-ai-organize-analyzing')}
            </p>
          </div>
        )}

        {showError && (
          <div className="gba:py-6">
            <div className="gba:rounded-lg gba:bg-destructive/10 gba:p-4 gba:text-sm gba:text-destructive gba:text-center">
              {state.errorMessage || t('document-ai-organize-error')}
            </div>
            <div className="gba:flex gba:justify-center gba:mt-4">
              <Button variant="outline" size="sm" onClick={onReset} data-testid={`${dataTestId}-retry`}>
                {t('document-ai-organize-try-again')}
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
                {t('document-ai-organize-by-template')}
              </TabsTrigger>
              <TabsTrigger
                value="description"
                className="gba:gap-1.5"
                startIcon={<TextAaIcon size={16} />}
                data-testid={`${dataTestId}-tab-description`}
              >
                {t('document-ai-organize-by-description')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="gba:space-y-4 gba:mt-4">
              <TemplatePreviewSection isLoading={templateLoading} folders={templateFolders} dataTestId={dataTestId} />
            </TabsContent>

            <TabsContent value="description" className="gba:space-y-4 gba:mt-4">
              <Textarea
                placeholder={t('document-ai-organize-description-placeholder')}
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
          <OrganizeDialogFooter
            phase={state.phase}
            showPreview={showPreview}
            activeTab={activeTab}
            canOrganize={canOrganize}
            onClose={onClose}
            onReset={onReset}
            onApply={onApply}
            onOrganize={handleOrganize}
            dataTestId={dataTestId}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
