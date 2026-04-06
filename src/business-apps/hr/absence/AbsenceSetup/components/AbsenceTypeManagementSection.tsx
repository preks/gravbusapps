import { Layers } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import type { AbsenceSetupSectionCardConfig } from '../utils/absenceSetupSectionCards'
import translations from '../_i18n'
import AbsenceSetupSectionCard from './AbsenceSetupSectionCard'

interface AbsenceTypeManagementSectionProps {
  typeSection: AbsenceSetupSectionCardConfig
  versionSection: AbsenceSetupSectionCardConfig
  activeTab: 'types' | 'versions'
  onTabChange: (value: 'types' | 'versions') => void
}

export function AbsenceTypeManagementSection({
  typeSection,
  versionSection,
  activeTab,
  onTabChange
}: Readonly<AbsenceTypeManagementSectionProps>) {
  const { t } = useTranslation(translations)

  return (
    <Card className="gba:border gba:border-border gba:bg-card" data-testid="absence-setup-type-management-card">
      <CardHeader className="gba:border-b gba:border-border gba:bg-muted/20">
        <div className="gba:flex gba:items-start gba:gap-4">
          <div className="gba:flex gba:h-11 gba:w-11 gba:items-center gba:justify-center gba:rounded-xl gba:bg-background">
            <Layers className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
          </div>
          <div className="gba:min-w-0 gba:flex-1">
            <CardTitle>{t('absence-type-management-title')}</CardTitle>
            <CardDescription>{t('absence-type-management-description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="gba:p-6">
        <Tabs
          value={activeTab}
          onValueChange={value => onTabChange(value as 'types' | 'versions')}
          data-testid="absence-setup-type-management-tabs"
        >
          <TabsList className="gba:w-full gba:justify-start">
            <TabsTrigger value="types" data-testid="absence-setup-type-management-types-tab">
              {typeSection.title}
            </TabsTrigger>
            <TabsTrigger value="versions" data-testid="absence-setup-type-management-versions-tab">
              {versionSection.title}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="types" className="gba:mt-4">
            <AbsenceSetupSectionCard
              icon={typeSection.icon}
              title={typeSection.title}
              description={typeSection.description}
              addLabel={t('add-catalog-entry-button', { entity: typeSection.entityLabel })}
              editLabel={t('edit-button')}
              deleteLabel={t('delete-button')}
              loadingLabel={t('loading-catalog-entries', { entity: typeSection.title })}
              emptyLabel={t('empty-catalog-entries', { entity: typeSection.title })}
              errorTitle={t('load-error-title')}
              errorMessage={typeSection.errorMessage}
              items={typeSection.items}
              isLoading={typeSection.isLoading}
              onAdd={typeSection.onAdd}
              onEdit={typeSection.onEdit}
              onDelete={typeSection.onDelete}
              addButtonTestId={typeSection.addButtonTestId}
              cardTestId={typeSection.cardTestId}
              showAddAction={typeSection.showAddAction}
              showDeleteAction={typeSection.showDeleteAction}
            />
          </TabsContent>
          <TabsContent value="versions" className="gba:mt-4">
            <AbsenceSetupSectionCard
              icon={versionSection.icon}
              title={versionSection.title}
              description={versionSection.description}
              addLabel={t('add-catalog-entry-button', { entity: versionSection.entityLabel })}
              editLabel={t('edit-button')}
              deleteLabel={t('delete-button')}
              loadingLabel={t('loading-catalog-entries', { entity: versionSection.title })}
              emptyLabel={t('empty-catalog-entries', { entity: versionSection.title })}
              errorTitle={t('load-error-title')}
              errorMessage={versionSection.errorMessage}
              items={versionSection.items}
              isLoading={versionSection.isLoading}
              onAdd={versionSection.onAdd}
              onEdit={versionSection.onEdit}
              onDelete={versionSection.onDelete}
              addButtonTestId={versionSection.addButtonTestId}
              cardTestId={versionSection.cardTestId}
              showAddAction={versionSection.showAddAction}
              showDeleteAction={versionSection.showDeleteAction}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
