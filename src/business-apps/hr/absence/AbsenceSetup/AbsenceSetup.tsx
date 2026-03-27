'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { LayoutGrid } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'
import { AbsenceSetupDeleteDialog } from './components/AbsenceSetupDeleteDialog'
import { AbsenceTypeManagementSection } from './components/AbsenceTypeManagementSection'
import AbsenceSetupSectionCard from './components/AbsenceSetupSectionCard'
import { useAbsenceSetupController } from './hooks/useAbsenceSetupController'
import { AbsenceEntitlementModal, type AbsenceEntitlementModalValues } from './modals/AbsenceEntitlementModal'
import { AbsencePolicyModal, type AbsencePolicyModalValues } from './modals/AbsencePolicyModal'
import { GenericCatalogEntryModal, type GenericCatalogEntryModalValues } from './modals/GenericCatalogEntryModal'
import { AbsenceTypeModal, type AbsenceTypeModalValues } from './modals/AbsenceTypeModal'
import { AbsenceTypeVersionModal } from './modals/AbsenceTypeVersionModal'

type AbsenceSetupProps = BusinessAppContextProps
const emptyItems: { id: string; title: string; description: string }[] = []
const TYPE_SECTION_CARD_ID = 'absence-setup-types-card'
const VERSION_SECTION_CARD_ID = 'absence-setup-versions-card'
const TYPE_MANAGEMENT_CARD_ID = 'absence-setup-type-management'

const AbsenceSetup: React.FC<AbsenceSetupProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const controller = useAbsenceSetupController(accessToken || '', t)
  const [activeSectionId, setActiveSectionId] = useState(TYPE_MANAGEMENT_CARD_ID)
  const [typeManagementTab, setTypeManagementTab] = useState<'types' | 'versions'>('types')
  const totalEntries = controller.sectionCards.reduce((count, section) => count + (section.items?.length || 0), 0)
  const typeSection = useMemo(
    () => controller.sectionCards.find(section => section.cardTestId === TYPE_SECTION_CARD_ID),
    [controller.sectionCards]
  )
  const versionSection = useMemo(
    () => controller.sectionCards.find(section => section.cardTestId === VERSION_SECTION_CARD_ID),
    [controller.sectionCards]
  )
  const navigationSections = useMemo(() => {
    const sections = controller.sectionCards.filter(
      section => section.cardTestId !== TYPE_SECTION_CARD_ID && section.cardTestId !== VERSION_SECTION_CARD_ID
    )

    if (typeSection && versionSection) {
      sections.splice(1, 0, {
        ...typeSection,
        title: t('absence-type-management-title'),
        description: t('absence-type-management-description'),
        items: [...typeSection.items, ...versionSection.items],
        cardTestId: TYPE_MANAGEMENT_CARD_ID
      })
    }

    return sections
  }, [controller.sectionCards, t, typeSection, versionSection])
  const activeSection = useMemo(
    () => navigationSections.find(section => section.cardTestId === activeSectionId) || navigationSections[0],
    [activeSectionId, navigationSections]
  )

  useEffect(() => {
    if (!navigationSections.length) {
      return
    }

    if (!navigationSections.some(section => section.cardTestId === activeSectionId)) {
      setActiveSectionId(navigationSections[0].cardTestId)
    }
  }, [activeSectionId, navigationSections])

  return (
    <div className="gba:w-full gba:max-w-none gba:space-y-6 gba:p-6 gba:pb-10" data-testid="absence-setup-container">
      <Card className="gba:border gba:border-border gba:bg-card">
        <CardHeader className="gba:flex gba:flex-col gba:gap-4 gba:px-6 gba:py-5 gba:sm:flex-row gba:sm:items-start gba:sm:justify-between">
          <div className="gba:flex gba:min-w-0 gba:items-start gba:gap-4">
            <div className="gba:flex gba:h-11 gba:w-11 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-muted">
              <LayoutGrid className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
            </div>
            <div className="gba:min-w-0 gba:space-y-1">
              <CardTitle className="gba:text-2xl gba:font-semibold">{t('page-title')}</CardTitle>
              <CardDescription>{t('page-description')}</CardDescription>
            </div>
          </div>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <Badge variant="secondary" data-testid="absence-setup-sections-count">
              {t('header-sections-count', { count: String(navigationSections.length) })}
            </Badge>
            <Badge variant="outline" data-testid="absence-setup-total-entries">
              {t('header-entries-count', { count: String(totalEntries) })}
            </Badge>
            <Badge variant="outline" data-testid="absence-setup-current-view">
              {t('header-current-view', { view: activeSection?.title || t('page-title') })}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="gba:space-y-6" data-testid="absence-setup-sections">
        <Card data-testid="absence-setup-navigation" className="gba:border gba:border-border gba:bg-card">
          <CardContent className="gba:p-3">
            <div className="gba:flex gba:gap-2 gba:overflow-x-auto gba:pb-1">
              {navigationSections.map(section => {
                const Icon = section.icon
                const isActive = section.cardTestId === activeSection?.cardTestId

                return (
                  <button
                    key={`${section.cardTestId}-nav-button`}
                    type="button"
                    onClick={() => setActiveSectionId(section.cardTestId)}
                    className={`gba:flex gba:min-w-fit gba:items-center gba:gap-3 gba:rounded-xl gba:border gba:px-4 gba:py-3 gba:text-left gba:transition-colors gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring ${
                      isActive
                        ? 'gba:border-primary gba:bg-primary/10 gba:text-primary'
                        : 'gba:border-border gba:bg-background hover:gba:bg-muted/40'
                    }`}
                    data-testid={`${section.cardTestId}-nav-button`}
                  >
                    <div
                      className={`gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg ${
                        isActive ? 'gba:bg-primary/15' : 'gba:bg-muted'
                      }`}
                    >
                      <Icon className="gba:h-4 gba:w-4" />
                    </div>
                    <span className="gba:whitespace-nowrap gba:text-sm gba:font-medium">{section.title}</span>
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      data-testid={`${section.cardTestId}-nav-count`}
                      className="gba:shrink-0"
                    >
                      {section.items?.length || 0}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {activeSection ? (
          <div className="gba:min-w-0 gba:w-full" data-testid="absence-setup-active-section">
            {activeSection.cardTestId === TYPE_MANAGEMENT_CARD_ID && typeSection && versionSection ? (
              <AbsenceTypeManagementSection
                typeSection={typeSection}
                versionSection={versionSection}
                activeTab={typeManagementTab}
                onTabChange={setTypeManagementTab}
              />
            ) : (
              <AbsenceSetupSectionCard
                key={activeSection.cardTestId}
                icon={activeSection.icon}
                title={activeSection.title}
                description={activeSection.description}
                addLabel={t('add-catalog-entry-button', { entity: activeSection.entityLabel })}
                editLabel={t('edit-button')}
                deleteLabel={t('delete-button')}
                loadingLabel={t('loading-catalog-entries', { entity: activeSection.title })}
                emptyLabel={t('empty-catalog-entries', { entity: activeSection.title })}
                errorTitle={t('load-error-title')}
                errorMessage={activeSection.errorMessage}
                items={activeSection.items || emptyItems}
                isLoading={activeSection.isLoading}
                onAdd={activeSection.onAdd}
                onEdit={activeSection.onEdit}
                onDelete={activeSection.onDelete}
                addButtonTestId={activeSection.addButtonTestId}
                cardTestId={activeSection.cardTestId}
              />
            )}
          </div>
        ) : null}
      </div>

      <AbsenceTypeModal
        open={controller.isAbsenceTypeModalOpen}
        onClose={controller.closeAbsenceTypeModal}
        onSave={controller.handleSaveAbsenceType as (values: AbsenceTypeModalValues) => Promise<void>}
        absenceType={controller.selectedAbsenceType}
        groups={controller.absenceGroups}
      />

      <AbsenceTypeVersionModal
        open={controller.isAbsenceTypeVersionModalOpen}
        onClose={controller.closeAbsenceTypeVersionModal}
        onSave={controller.handleSaveAbsenceTypeVersion}
        entry={controller.selectedVersionEntry}
        absenceTypes={controller.absenceTypes}
        absenceTypeVersions={controller.absenceTypeVersions}
      />

      <AbsenceEntitlementModal
        open={controller.isAbsenceEntitlementModalOpen}
        onClose={controller.closeAbsenceEntitlementModal}
        onSave={controller.handleSaveAbsenceEntitlement as (values: AbsenceEntitlementModalValues) => Promise<void>}
        entitlement={controller.selectedEntitlement}
        absenceTypes={controller.absenceTypes}
        absenceTypeVersions={controller.absenceTypeVersions}
      />

      <AbsencePolicyModal
        open={controller.isAbsencePolicyModalOpen}
        onClose={controller.closeAbsencePolicyModal}
        onSave={controller.handleSaveAbsencePolicy as (values: AbsencePolicyModalValues) => Promise<void>}
        policy={controller.selectedPolicy}
        absenceTypes={controller.absenceTypes}
      />

      <GenericCatalogEntryModal
        open={controller.isGenericCatalogModalOpen}
        onClose={controller.closeGenericCatalogModal}
        onSave={controller.handleSaveGenericCatalogEntry as (values: GenericCatalogEntryModalValues) => Promise<void>}
        entry={controller.selectedGenericEntry}
        entityLabel={controller.genericEntityLabel}
      />

      <AbsenceSetupDeleteDialog
        open={Boolean(controller.pendingDelete)}
        entityLabel={controller.pendingDelete?.entityLabel || ''}
        name={controller.pendingDelete?.name || ''}
        isDeleting={controller.isDeleting}
        blockedReason={controller.pendingDelete?.blockedReason}
        errorMessage={controller.deleteErrorMessage}
        onCancel={controller.clearPendingDelete}
        onConfirm={controller.handleConfirmDelete}
      />
    </div>
  )
}

export default AbsenceSetup
