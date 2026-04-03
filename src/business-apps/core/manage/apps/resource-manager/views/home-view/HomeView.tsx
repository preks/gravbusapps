import React from 'react'
import {
  PackageIcon,
  LinkIcon,
  TreeStructureIcon,
  LightningIcon,
  FolderIcon,
  BugIcon,
  PlusCircleIcon,
  StackIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ScreenBundleDialog, ActionBundleDialog, UserTaskBundleDialog } from '../bundles-view'

export interface HomeViewProps extends BusinessAppContextProps {
  /** When false, bundle-related quick actions and the Bundles quick link are disabled (non-localhost). */
  localhostBundlesEnabled: boolean
  onViewChange: (view: string) => void
  onNavigateTo?: (view: string, params?: { tab?: string; subview?: string }) => void
  'data-testid'?: string
}

const QUICK_LINKS: Array<{
  label: string
  view: string
  tab?: string
  subview?: string
  icon: React.ElementType
  colSpan?: number
}> = [
  { label: 'Bundles', view: 'bundles', icon: StackIcon, colSpan: 2 },
  { label: 'Components', view: 'components', icon: PackageIcon },
  { label: 'Debug Components', view: 'components', tab: 'debug', icon: BugIcon },
  { label: 'Navigations', view: 'resources', tab: 'navigations', subview: 'items', icon: LinkIcon },
  { label: 'Menu', view: 'resources', tab: 'navigations', subview: 'menu', icon: TreeStructureIcon },
  { label: 'Actions', view: 'resources', tab: 'actions', subview: 'items', icon: LightningIcon },
  { label: 'Contexts', view: 'resources', tab: 'actions', subview: 'contexts', icon: FolderIcon },
  { label: 'Debug Contexts', view: 'resources', tab: 'debug', icon: BugIcon }
]

export const HomeView: React.FC<HomeViewProps> = ({
  localhostBundlesEnabled,
  onViewChange,
  onNavigateTo,
  'data-testid': dataTestId = 'home-view',
  ...context
}) => {
  const [registerNativeScreenOpen, setRegisterNativeScreenOpen] = React.useState(false)
  const [registerActionOpen, setRegisterActionOpen] = React.useState(false)
  const [registerUserTaskOpen, setRegisterUserTaskOpen] = React.useState(false)

  const visibleQuickLinks = React.useMemo(
    () => (localhostBundlesEnabled ? QUICK_LINKS : QUICK_LINKS.filter(link => link.view !== 'bundles')),
    [localhostBundlesEnabled]
  )
  const quickLinksMain = visibleQuickLinks.slice(0, 5)
  const quickLinksBottomRow = visibleQuickLinks.slice(5, 8)

  const devActionTileClass =
    'gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-1.5 gba:py-3 gba:px-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:transition-colors gba:min-h-[72px]'
  const devActionTileInteractive = 'hover:gba:bg-muted/50 hover:gba:border-muted-foreground/20'
  const devActionTileDisabled = 'gba:opacity-50 gba:cursor-not-allowed gba:pointer-events-none'

  const handleQuickLink = React.useCallback(
    (view: string, tab?: string, subview?: string) => {
      if (onNavigateTo && (tab || subview)) {
        onNavigateTo(view, { tab, subview })
      } else {
        onViewChange(view)
      }
    },
    [onViewChange, onNavigateTo]
  )

  return (
    <div className="gba:p-6 gba:space-y-8" data-testid={dataTestId}>
      <section>
        <h2 className="gba:text-lg gba:font-semibold gba:mb-3">Quick Actions</h2>
        <div className="gba:grid gba:grid-cols-3 gba:gap-3">
          <button
            type="button"
            disabled={!localhostBundlesEnabled}
            onClick={() => localhostBundlesEnabled && setRegisterNativeScreenOpen(true)}
            className={`${devActionTileClass} ${localhostBundlesEnabled ? devActionTileInteractive : devActionTileDisabled}`}
            data-testid={`${dataTestId}-register-native-screen-button`}
          >
            <PlusCircleIcon size={22} className="gba:text-muted-foreground" weight="duotone" />
            <span className="gba:text-xs gba:font-medium gba:text-center">Create Screen</span>
          </button>
          <button
            type="button"
            disabled={!localhostBundlesEnabled}
            onClick={() => localhostBundlesEnabled && setRegisterActionOpen(true)}
            className={`${devActionTileClass} ${localhostBundlesEnabled ? devActionTileInteractive : devActionTileDisabled}`}
            data-testid={`${dataTestId}-register-new-action-button`}
          >
            <PlusCircleIcon size={22} className="gba:text-muted-foreground" weight="duotone" />
            <span className="gba:text-xs gba:font-medium gba:text-center">Create Action</span>
          </button>
          <button
            type="button"
            disabled={!localhostBundlesEnabled}
            onClick={() => localhostBundlesEnabled && setRegisterUserTaskOpen(true)}
            className={`${devActionTileClass} ${localhostBundlesEnabled ? devActionTileInteractive : devActionTileDisabled}`}
            data-testid={`${dataTestId}-register-new-user-task-button`}
          >
            <PlusCircleIcon size={22} className="gba:text-muted-foreground" weight="duotone" />
            <span className="gba:text-xs gba:font-medium gba:text-center">Create User Task</span>
          </button>
        </div>
      </section>

      <section>
        <h2 className="gba:text-lg gba:font-semibold gba:mb-3">Quick Links</h2>
        <div className="gba:space-y-3">
          <div className="gba:grid gba:grid-cols-2 sm:gba:grid-cols-3 lg:gba:grid-cols-6 gba:gap-3">
            {quickLinksMain.map(link => {
              const Icon = link.icon
              return (
                <button
                  type="button"
                  key={`${link.view}-${link.tab ?? ''}-${link.subview ?? ''}`}
                  onClick={() => handleQuickLink(link.view, link.tab, link.subview)}
                  className={`gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:py-5 gba:px-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:text-card-foreground gba:shadow-sm hover:gba:bg-muted/50 hover:gba:border-muted-foreground/20 gba:transition-colors gba:min-h-[88px] ${link.colSpan === 2 ? 'gba:col-span-2' : ''}`}
                  data-testid={`${dataTestId}-quicklink-${link.view}${link.tab ? `-${link.tab}` : ''}${link.subview ? `-${link.subview}` : ''}`}
                >
                  <Icon size={28} className="gba:text-muted-foreground" weight="duotone" />
                  <span className="gba:text-sm gba:font-medium gba:text-center">{link.label}</span>
                </button>
              )
            })}
          </div>
          <div className="gba:grid gba:grid-cols-3 gba:gap-3">
            {quickLinksBottomRow.map(link => {
              const Icon = link.icon
              return (
                <button
                  type="button"
                  key={`${link.view}-${link.tab ?? ''}-${link.subview ?? ''}`}
                  onClick={() => handleQuickLink(link.view, link.tab, link.subview)}
                  className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:py-5 gba:px-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:text-card-foreground gba:shadow-sm hover:gba:bg-muted/50 hover:gba:border-muted-foreground/20 gba:transition-colors gba:min-h-[88px]"
                  data-testid={`${dataTestId}-quicklink-${link.view}${link.tab ? `-${link.tab}` : ''}${link.subview ? `-${link.subview}` : ''}`}
                >
                  <Icon size={28} className="gba:text-muted-foreground" weight="duotone" />
                  <span className="gba:text-sm gba:font-medium gba:text-center">{link.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {localhostBundlesEnabled ? (
        <>
          <ScreenBundleDialog
            open={registerNativeScreenOpen}
            onOpenChange={setRegisterNativeScreenOpen}
            onSuccess={() => setRegisterNativeScreenOpen(false)}
            {...context}
          />
          <ActionBundleDialog
            open={registerActionOpen}
            onOpenChange={setRegisterActionOpen}
            onSuccess={() => setRegisterActionOpen(false)}
            {...context}
          />
          <UserTaskBundleDialog
            open={registerUserTaskOpen}
            onOpenChange={setRegisterUserTaskOpen}
            onSuccess={() => setRegisterUserTaskOpen(false)}
            {...context}
          />
        </>
      ) : null}
    </div>
  )
}
