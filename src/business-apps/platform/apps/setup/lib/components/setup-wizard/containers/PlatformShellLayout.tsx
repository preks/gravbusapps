'use client'

import React, { ReactNode } from 'react'
import { Button } from '@newwork/nw-design-system'
import { LogOut } from 'lucide-react'
import { formatDataTestId } from '../../../shims/formatDataTestId'
import { resolveGravityPlatformWordmarkUrl } from '@/common/utils/serviceResolver'
import { useSetupTranslation } from '../../../useSetupTranslation'
import { SetupFlowSteps } from '../../SetupFlowSteps'

interface PlatformShellLayoutProps {
  readonly children: ReactNode
  readonly customBody?: ReactNode
  readonly title?: string
  readonly description?: string
  readonly icon?: React.ReactNode
  readonly currentStep?: number
  readonly dataTestIdPrefix?: string
  readonly onNext?: () => void
  readonly onBack?: () => void
  readonly disableNext?: boolean
  readonly hideBackButton?: boolean
  readonly hideSteps?: boolean
  readonly nextButtonText?: string
  readonly className?: string
  readonly contentClassName?: string
  readonly backgroundColorIcon?: string
  readonly layoutVariant?: 'standard' | 'onboarding'
  readonly stepItems?: Array<{ title: string }>
  readonly frameClassName?: string
  readonly frameMinHeightClassName?: string
}

/** Must match `REMOTE_HOST_LOGOUT_MESSAGE_TYPE` in gravity-platform `remoteHostMessages.ts`. */
const REMOTE_HOST_LOGOUT_MESSAGE_TYPE = 'com.newwork.auth.logout' as const

/**
 * Federated remotes run in the platform document but cannot import `useAuth`.
 * Ask the host (RenderRemoteComponent) to run Keycloak logout with the same redirect contract as in-platform setup.
 */
function requestHostLogout() {
  if (typeof window === 'undefined') return
  const redirectTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
  const data = { type: REMOTE_HOST_LOGOUT_MESSAGE_TYPE, redirectTo }
  const origin = window.location.origin
  try {
    window.postMessage(data, origin)
  } catch {
    /* ignore invalid targetOrigin */
  }
  try {
    if (window.parent !== window) {
      window.parent.postMessage(data, origin)
    }
  } catch {
    /* cross-origin parent */
  }
}

const PlatformShellLayout: React.FC<PlatformShellLayoutProps> = ({
  children,
  title,
  description,
  icon,
  currentStep = 0,
  dataTestIdPrefix = 'SetupHeader',
  onNext,
  onBack,
  disableNext = false,
  hideBackButton = false,
  hideSteps = false,
  nextButtonText,
  className = 'gba:w-[576px]',
  contentClassName = '',
  backgroundColorIcon = 'gba:bg-[#E5E7EB]',
  customBody,
  layoutVariant = 'standard',
  stepItems,
  frameClassName = 'gba:max-w-[980px]',
  frameMinHeightClassName = 'gba:min-h-[calc(100vh-112px)]'
}) => {
  const { t } = useSetupTranslation()
  const isOnboardingVariant = layoutVariant === 'onboarding'

  const handleLogout = () => {
    requestHostLogout()
  }

  const wordmarkSrc = resolveGravityPlatformWordmarkUrl()

  return (
    <div
      className={`gba:h-screen gba:flex gba:flex-col ${isOnboardingVariant ? 'gba:bg-[#F5F5F5]' : 'gba:bg-[#F5F5F4]'}`}
    >
      <header
        className="gba:bg-white gba:flex gba:h-[48px] gba:items-center gba:px-5 gba:justify-between gba:w-full gba:shadow-sm gba:z-10 gba:shrink-0"
        data-testid={formatDataTestId(dataTestIdPrefix, 'header')}
      >
        <div className="gba:flex gba:items-center gba:justify-start">
          <img src={wordmarkSrc} alt="" width={120} height={32} className="gba:h-8 gba:w-auto" />
        </div>

        <div className="gba:flex gba:items-center gba:justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:px-2 gba:py-1.5 gba:text-sm gba:font-medium gba:text-[#57534E] gba:transition-colors gba:hover:bg-[#F5F5F4] gba:hover:text-[#0F172A] gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-[#CBD5E1]"
            data-testid={formatDataTestId(dataTestIdPrefix, 'logout-btn')}
          >
            <LogOut className="gba:h-4 gba:w-4" aria-hidden />
            <span>{t('dashboard-logout')}</span>
          </button>
        </div>
      </header>

      {customBody ? (
        <div className="gba:flex-1 gba:overflow-hidden">{customBody}</div>
      ) : (
        <div className="gba:flex-1 gba:overflow-y-auto gba:px-6 gba:py-8">
          <div
            className={`gba:mx-auto gba:flex gba:w-full ${frameMinHeightClassName} ${frameClassName} gba:flex-col gba:rounded-[28px] gba:border gba:border-[#E7E5E4] gba:bg-white gba:px-8 gba:py-10 gba:shadow-[0_12px_40px_rgba(15,23,42,0.06)] gba:md:px-12`}
          >
            <div className={`gba:mx-auto gba:flex gba:w-full gba:flex-col gba:flex-1 ${className} gba:box-border`}>
              {icon && (
                <div className="gba:flex gba:justify-center gba:items-center gba:mb-6 gba:shrink-0">
                  <div
                    className={`${backgroundColorIcon} gba:p-3 gba:rounded-lg gba:flex gba:items-center gba:justify-center`}
                  >
                    {icon}
                  </div>
                </div>
              )}

              {title && (
                <h1
                  className="gba:text-2xl gba:font-bold gba:mb-2 gba:text-center gba:shrink-0"
                  data-testid={formatDataTestId(dataTestIdPrefix, 'heading')}
                >
                  {title}
                </h1>
              )}

              {description && (
                <p
                  className="gba:text-sm gba:text-gray-600 gba:mb-6 gba:text-center gba:shrink-0"
                  data-testid={formatDataTestId(dataTestIdPrefix, 'description')}
                >
                  {description}
                </p>
              )}

              {currentStep !== undefined && !hideSteps && (stepItems?.length ?? 0) > 0 && (
                <div className="gba:mb-8 gba:flex gba:w-full gba:shrink-0 gba:justify-center gba:px-1">
                  <SetupFlowSteps
                    current={currentStep}
                    items={stepItems ?? []}
                    data-testid={formatDataTestId(dataTestIdPrefix, 'steps')}
                  />
                </div>
              )}

              <div
                className={`gba:flex gba:flex-col gba:flex-1 gba:box-border gba:overflow-visible ${contentClassName}`}
              >
                <div className="gba:w-full">{children}</div>
              </div>

              {(onNext || onBack) && (
                <div className="gba:flex gba:flex-col gba:items-center gba:w-full gba:mt-auto gba:gap-4 gba:pt-10">
                  <div className="gba:w-[576px] gba:max-w-full">
                    {!hideBackButton && onBack && (
                      <Button
                        variant="outline"
                        size="lg"
                        className="gba:w-full"
                        onClick={onBack}
                        data-testid={formatDataTestId(dataTestIdPrefix, 'back-btn')}
                      >
                        {t('buttons-back')}
                      </Button>
                    )}
                    {onNext && (
                      <Button
                        variant="default"
                        size="lg"
                        className="gba:mt-4 gba:w-full"
                        onClick={onNext}
                        disabled={disableNext}
                        data-testid={formatDataTestId(dataTestIdPrefix, 'next-btn')}
                      >
                        {nextButtonText || t('buttons-continue')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlatformShellLayout
