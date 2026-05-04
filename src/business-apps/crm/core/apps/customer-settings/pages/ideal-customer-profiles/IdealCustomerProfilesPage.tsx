import React from 'react'
import { FunnelSimpleIcon } from '@phosphor-icons/react'
import { Alert, PageLayout, Spinner, useTranslation } from '@newwork/nw-design-system'
import customerSettingsI18n from '../../_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IcpProfileEditorPanel } from './IcpProfileEditorPanel'
import { IcpProfileListSidebar } from './IcpProfileListSidebar'
import { IcpSettingsDialogs } from './IcpSettingsDialogs'
import { useIdealCustomerProfilesCatalog } from './useIdealCustomerProfilesCatalog'

const DATA_TEST_ID = 'ideal-customer-profiles'

export interface IdealCustomerProfilesPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

export const IdealCustomerProfilesPage: React.FC<IdealCustomerProfilesPageProps> = ({
  accessToken,
  userInfo,
  additionalData,
  className,
  prefixDataTestId,
  onBack
}) => {
  const { t } = useTranslation(customerSettingsI18n)
  const testId = `${prefixDataTestId ?? 'CustomerIcp'}-${DATA_TEST_ID}`

  const catalog = useIdealCustomerProfilesCatalog({ accessToken, userInfo, additionalData })

  const headerTitle = t('icp-page-title')
  const headerDescription = t('icp-page-description')
  const headerPhosphorIcon = {
    icon: FunnelSimpleIcon,
    variant: 'info' as const,
    size: 'lg' as const,
    label: headerTitle
  }

  if (catalog.listLoading) {
    return (
      <PageLayout
        className={className}
        headerPhosphorIcon={headerPhosphorIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
        onBack={onBack}
        data-testid={testId}
      >
        <div className="gba:flex gba:items-center gba:justify-center gba:min-h-96">
          <Spinner size="lg" />
        </div>
      </PageLayout>
    )
  }

  if (catalog.listError) {
    return (
      <PageLayout
        className={className}
        headerPhosphorIcon={headerPhosphorIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
        onBack={onBack}
        data-testid={testId}
      >
        <Alert variant="destructive" data-testid={`${testId}-list-error`}>
          {catalog.listError}
        </Alert>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      className={className}
      headerPhosphorIcon={headerPhosphorIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      data-testid={testId}
    >
      <div className="gba:flex gba:flex-col gba:gap-4">
        {catalog.saveError && (
          <Alert variant="destructive" data-testid={`${testId}-save-error`}>
            {catalog.saveError}
          </Alert>
        )}

        <div className="gba:flex gba:gap-6 gba:h-full gba:min-h-96">
          <IcpProfileListSidebar
            filteredProfiles={catalog.filteredProfiles}
            selectedId={catalog.selectedId}
            searchTerm={catalog.searchTerm}
            onSearchChange={catalog.setSearchTerm}
            onSelect={catalog.setSelectedId}
            onRequestDelete={catalog.setDeleteTarget}
            onRequestNew={() => catalog.setNewDialogOpen(true)}
            dataTestIdPrefix={testId}
          />

          <div className="gba:flex-1 gba:min-w-0">
            <IcpProfileEditorPanel
              accessToken={accessToken}
              selectedId={catalog.selectedId}
              detailLoading={catalog.detailLoading}
              selectedEntry={catalog.selectedEntry}
              profileName={catalog.profileName}
              onProfileNameChange={catalog.setProfileName}
              profileNameTranslations={catalog.profileNameTranslations}
              onProfileNameTranslationsChange={catalog.setProfileNameTranslations}
              formState={catalog.formState}
              onFormStateChange={catalog.setFormState}
              saving={catalog.saving}
              onSave={() => void catalog.handleSave()}
              dataTestIdPrefix={testId}
            />
          </div>
        </div>
      </div>

      <IcpSettingsDialogs
        dataTestIdPrefix={testId}
        newDialogOpen={catalog.newDialogOpen}
        onNewDialogOpenChange={catalog.setNewDialogOpen}
        newCode={catalog.newCode}
        newName={catalog.newName}
        newNameTranslations={catalog.newNameTranslations}
        onNewCodeChange={catalog.setNewCode}
        onNewNameChange={catalog.setNewName}
        onNewNameTranslationsChange={catalog.setNewNameTranslations}
        creating={catalog.creating}
        onCreateSubmit={() => void catalog.handleCreate()}
        deleteTarget={catalog.deleteTarget}
        onDeleteTargetChange={catalog.setDeleteTarget}
        deleting={catalog.deleting}
        onDeleteConfirm={() => void catalog.confirmDelete()}
      />
    </PageLayout>
  )
}

export default IdealCustomerProfilesPage
