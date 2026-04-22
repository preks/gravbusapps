import React, { ReactNode, useEffect, useRef } from 'react'
import { Button } from '@newwork/nw-design-system'
import { formatDataTestId } from '../../../shims/formatDataTestId'
import { useSetupTranslation } from '../../../useSetupTranslation'
import PlatformShellLayout from './PlatformShellLayout'
import { AnimatePresence, motion } from 'framer-motion'
import { SetupFlowSteps } from '../../SetupFlowSteps'

/** Decorative header background (avoids bundling a large JPEG in the remote bundle). */
const ONBOARDING_HEADER_BG = 'linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 40%, #e0f2fe 100%)'

export interface OnboardingStepLayoutProps {
  readonly children: ReactNode
  readonly currentStep: number
  readonly dataTestId: string
  readonly onNext?: () => void
  readonly onBack?: () => void
  readonly nextLabel?: string
  readonly backLabel?: string
  readonly disableNext?: boolean
  readonly hideBackButton?: boolean
  readonly hideSteps?: boolean
  readonly hideStepsOnWelcome?: boolean
}

const stepVariants = {
  hidden: {
    opacity: 0,
    x: -30,
    scale: 0.9,
    filter: 'blur(4px)'
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 25,
      duration: 0.4
    }
  },
  exit: {
    opacity: 0,
    x: 30,
    scale: 0.9,
    filter: 'blur(4px)',
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  }
}

const OnboardingStepLayout: React.FC<OnboardingStepLayoutProps> = ({
  children,
  currentStep,
  dataTestId,
  onNext,
  onBack,
  nextLabel,
  backLabel,
  disableNext = false,
  hideBackButton = false,
  hideSteps = false,
  hideStepsOnWelcome = false
}) => {
  const { t } = useSetupTranslation()
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (imageRef.current) {
      const imageElement = imageRef.current
      imageElement.style.transform = 'translateZ(0)'
      imageElement.style.webkitTransform = 'translateZ(0)'
      imageElement.style.backfaceVisibility = 'hidden'
      imageElement.style.webkitBackfaceVisibility = 'hidden'
      imageElement.style.perspective = '1000px'
      imageElement.style.webkitPerspective = '1000px'
    }
  }, [])

  const steps = [
    { title: t('steps-welcome') },
    { title: t('steps-company') },
    { title: t('steps-position') },
    { title: t('steps-description') }
  ]

  const onboardingBody = (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-[calc(100vh-48px)] gba:w-full gba:bg-[#F5F5F5] gba:overflow-hidden">
      <div
        className="gba:flex gba:flex-col gba:items-center gba:w-[720px] gba:min-h-[calc(100vh-48px)] gba:bg-white gba:relative gba:overflow-hidden"
        data-testid={formatDataTestId(dataTestId, 'container')}
      >
        <div
          ref={imageRef}
          className="gba:w-full gba:h-[230px] gba:bg-cover gba:bg-center"
          style={{
            backgroundImage: ONBOARDING_HEADER_BG,
            willChange: 'transform',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
          aria-hidden="true"
        />

        <div className="gba:flex gba:flex-col gba:items-center gba:w-full gba:p-12 gba:gap-8">
          {!(hideSteps || (hideStepsOnWelcome && currentStep === 0)) && (
            <div className="gba:flex gba:w-full gba:justify-center">
              <SetupFlowSteps current={currentStep} items={steps} data-testid={formatDataTestId(dataTestId, 'steps')} />
            </div>
          )}

          <div className="gba:flex gba:flex-col gba:items-center gba:w-full gba:overflow-visible gba:mb-32">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                className="gba:w-[576px] gba:max-w-full"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="gba:absolute gba:bottom-12 gba:left-0 gba:right-0 gba:flex gba:flex-col gba:items-center">
          <div className="gba:flex gba:w-[576px] gba:max-w-full gba:flex-col gba:gap-4">
            {!hideBackButton && onBack && (
              <Button variant="outline" size="lg" className="gba:w-full" onClick={onBack} data-testid={formatDataTestId(dataTestId, 'back-button')}>
                {backLabel ?? t('buttons-back')}
              </Button>
            )}
            {onNext && (
              <Button variant="default" size="lg" className="gba:w-full" onClick={onNext} disabled={disableNext} data-testid={formatDataTestId(dataTestId, 'next-button')}>
                {nextLabel ?? t('buttons-continue')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <PlatformShellLayout layoutVariant="onboarding" customBody={onboardingBody} dataTestIdPrefix={dataTestId} hideSteps>
      {children}
    </PlatformShellLayout>
  )
}

export default OnboardingStepLayout
