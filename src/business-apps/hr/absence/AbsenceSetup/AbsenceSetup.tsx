'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardContent, PageHeader, useTranslation } from '@newwork/nw-design-system'
import { LayoutGrid } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'
import { AbsenceSetupDeleteDialog } from './components/AbsenceSetupDeleteDialog'
import AbsenceSetupSectionCard from './components/AbsenceSetupSectionCard'
import { useAbsenceSetupController } from './hooks/useAbsenceSetupController'
import { AbsenceEntitlementModal, type AbsenceEntitlementModalValues } from './modals/AbsenceEntitlementModal'
import { GenericCatalogEntryModal, type GenericCatalogEntryModalValues } from './modals/GenericCatalogEntryModal'
import { AbsenceTypeModal, type AbsenceTypeModalValues } from './modals/AbsenceTypeModal'
import { AbsenceTypeVersionModal } from './modals/AbsenceTypeVersionModal'

type AbsenceSetupProps = BusinessAppContextProps
const emptyItems: { id: string; title: string; description: string }[] = []

const AbsenceSetup: React.FC<AbsenceSetupProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const controller = useAbsenceSetupController(accessToken || '', t)
  const [activeSectionId, setActiveSectionId] = useState(controller.sectionCards[0]?.cardTestId || '')
  const totalEntries = controller.sectionCards.reduce((count, section) => count + (section.items?.length || 0), 0)
  const activeSection = useMemo(
    () => controller.sectionCards.find(section => section.cardTestId === activeSectionId) || controller.sectionCards[0],
    [activeSectionId, controller.sectionCards]
  )

  useEffect(() => {
    if (!controller.sectionCards.length) {
      return
    }

    if (!controller.sectionCards.some(section => section.cardTestId === activeSectionId)) {
      setActiveSectionId(controller.sectionCards[0].cardTestId)
    }
  }, [activeSectionId, controller.sectionCards])

  return (
    <div className="gba:mx-auto gba:max-w-6xl gba:space-y-6 gba:p-6 gba:pb-10" data-testid="absence-setup-container">
      <PageHeader
        icon={LayoutGrid}
        title={t('page-title')}
        subtitle={t('page-description')}
        className="gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:px-6 gba:py-5"
        extra={
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <Badge variant="secondary" data-testid="absence-setup-sections-count">
              {controller.sectionCards.length}
            </Badge>
            <Badge variant="outline" data-testid="absence-setup-total-entries">
              {totalEntries}
            </Badge>
          </div>
        }
      />

      <div
        className="gba:grid gba:gap-6 gba:xl:grid-cols-[380px_minmax(0,1fr)] gba:xl:items-start"
        data-testid="absence-setup-sections"
      >
        <Card data-testid="absence-setup-navigation" className="gba:border gba:border-border gba:bg-card">
          <CardContent className="gba:space-y-2 gba:p-3">
            {controller.sectionCards.map(section => {
              const Icon = section.icon
              const isActive = section.cardTestId === activeSection?.cardTestId

              return (
                <div
                  key={`${section.cardTestId}-nav-item`}
                  className={`gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:border gba:p-2 ${
                    isActive ? 'gba:border-primary-ring gba:bg-muted/30' : 'gba:border-transparent gba:bg-background'
                  }`}
                  data-testid={`${section.cardTestId}-nav-item`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSectionId(section.cardTestId)}
                    className="gba:grid gba:min-w-0 gba:flex-1 gba:grid-cols-[2.5rem_minmax(0,1fr)_auto] gba:items-center gba:gap-3 gba:rounded-lg gba:px-2 gba:py-2 gba:text-left gba:outline-none hover:gba:bg-muted/40 focus-visible:gba:ring-2 focus-visible:gba:ring-ring"
                    data-testid={`${section.cardTestId}-nav-button`}
                  >
                    <div className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-muted">
                      <Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    </div>
                    <div className="gba:min-w-0">
                      <p className="gba:text-sm gba:font-medium gba:leading-5 gba:text-foreground">{section.title}</p>
                    </div>
                    <Badge variant="secondary" data-testid={`${section.cardTestId}-nav-count`} className="gba:shrink-0">
                      {section.items?.length || 0}
                    </Badge>
                  </button>

                  <Button
                    type="button"
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={section.onAdd}
                    data-testid={section.addButtonTestId}
                    className="gba:shrink-0"
                  >
                    {t('add-short-button')}
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {activeSection ? (
          <div className="gba:min-w-0 gba:w-full" data-testid="absence-setup-active-section">
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
          </div>
        ) : null}
      </div>

      <AbsenceTypeModal
        accessToken={accessToken || ''}
        open={controller.isAbsenceTypeModalOpen}
        onClose={controller.closeAbsenceTypeModal}
        onSave={controller.handleSaveAbsenceType as (values: AbsenceTypeModalValues) => Promise<void>}
        absenceType={controller.selectedAbsenceType}
      />

      <AbsenceTypeVersionModal
        open={controller.isAbsenceTypeVersionModalOpen}
        onClose={controller.closeAbsenceTypeVersionModal}
        onSave={controller.handleSaveAbsenceTypeVersion}
        entry={controller.selectedVersionEntry}
        absenceTypes={controller.absenceTypes}
      />

      <AbsenceEntitlementModal
        open={controller.isAbsenceEntitlementModalOpen}
        onClose={controller.closeAbsenceEntitlementModal}
        onSave={controller.handleSaveAbsenceEntitlement as (values: AbsenceEntitlementModalValues) => Promise<void>}
        entitlement={controller.selectedEntitlement}
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
        onCancel={controller.clearPendingDelete}
        onConfirm={controller.handleConfirmDelete}
      />
    </div>
  )
}

export default AbsenceSetup
