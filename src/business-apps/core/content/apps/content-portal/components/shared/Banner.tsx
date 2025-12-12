import React from 'react'

export enum BannerVariant {
  NEWS = 'news',
  KNOWLEDGE = 'knowledge',
  INTRANET = 'intranet',
  DOCUMENT = 'document',
  QUESTION = 'question',
  GLOSSARY = 'glossary'
}

export interface BannerConfig {
  variant: BannerVariant
  title: string
  subtitle?: string
  children?: React.ReactNode
}

interface BannerProps extends BannerConfig {
  className?: string
}

interface BannerCarouselProps {
  configs: BannerConfig[]
  activeIndex: number
  className?: string
}

// Gradient configurations with light/dark theme support and animation
export const gradients = {
  [BannerVariant.INTRANET]: {
    className:
      'gba:bg-gradient-to-r gba:from-pink-500 gba:via-red-500 gba:to-orange-500 gba:dark:from-red-500 gba:dark:via-orange-500 gba:dark:to-yellow-500',
    textColor: 'gba:text-white'
  },
  [BannerVariant.NEWS]: {
    className:
      'gba:bg-gradient-to-r gba:from-cyan-400 gba:via-blue-400 gba:to-indigo-400 gba:dark:from-cyan-700 gba:dark:via-blue-500 gba:dark:to-indigo-600',
    textColor: 'gba:text-white'
  },
  [BannerVariant.KNOWLEDGE]: {
    className:
      'gba:bg-gradient-to-r gba:from-emerald-500 gba:via-teal-500 gba:to-cyan-500 gba:dark:from-blue-500 gba:dark:via-cyan-500 gba:dark:to-teal-500',
    textColor: 'gba:text-white'
  },
  [BannerVariant.DOCUMENT]: {
    className:
      'gba:bg-gradient-to-r gba:from-yellow-200 gba:via-yellow-400 gba:to-yellow-600 gba:dark:from-yellow-400 gba:dark:via-orange-500 gba:dark:to-yellow-600',
    textColor: 'gba:text-white'
  },
  [BannerVariant.QUESTION]: {
    className:
      'gba:bg-gradient-to-r gba:from-purple-500 gba:via-violet-500 gba:to-fuchsia-500 gba:dark:from-purple-600 gba:dark:via-violet-600 gba:dark:to-fuchsia-600',
    textColor: 'gba:text-white'
  },
  [BannerVariant.GLOSSARY]: {
    className:
      'gba:bg-gradient-to-r gba:from-amber-500 gba:via-orange-500 gba:to-rose-500 gba:dark:from-amber-600 gba:dark:via-orange-600 gba:dark:to-rose-600',
    textColor: 'gba:text-white'
  }
}

const Banner: React.FC<BannerProps> = ({ title, subtitle, className = '', variant = BannerVariant.NEWS, children }) => {
  const isIntranet = variant === BannerVariant.INTRANET
  const variantConfig = gradients[variant]

  return (
    <div
      className={`gba:w-full gba:h-[200px] gba:shrink-0 gba:relative ${variantConfig.className} gba:shadow-md ${className}`}
      data-testid={`banner-${variant}`}
    >
      {isIntranet ? (
        <div
          className={`gba:absolute gba:inset-0 gba:p-6 gba:flex gba:items-center gba:justify-center ${variantConfig.textColor}`}
        >
          <div className="gba:max-w-[1440px] gba:w-full gba:flex gba:flex-row gba:items-center gba:justify-between">
            <div className="gba:flex gba:flex-col gba:mr-4">
              <h1 className="gba:text-2xl gba:md:text-3xl gba:lg:text-4xl gba:mb-2 gba:drop-shadow-sm gba:font-bold">
                {title}
              </h1>
              {subtitle && <p className="gba:text-sm gba:md:text-base gba:max-w-lg gba:opacity-90">{subtitle}</p>}
            </div>
            {children && <div className="gba:shrink-0">{children}</div>}
          </div>
        </div>
      ) : (
        <div
          className={`gba:absolute gba:inset-0 gba:p-6 gba:flex gba:items-center gba:justify-center ${variantConfig.textColor}`}
        >
          <div className="gba:max-w-[1440px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center">
            <h1 className="gba:text-2xl gba:md:text-3xl gba:lg:text-4xl gba:mb-2 gba:drop-shadow-sm gba:font-bold">
              {title}
            </h1>
            {subtitle && (
              <p className="gba:text-sm gba:md:text-base gba:max-w-lg gba:mx-auto gba:opacity-90">{subtitle}</p>
            )}
            {children && <div className="gba:mt-4">{children}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ configs, activeIndex, className = '' }) => {
  return (
    <div className={`gba:w-full gba:h-[200px] gba:shrink-0 gba:relative gba:shadow-md ${className}`}>
      {/* All Banner Backgrounds - Stacked with Opacity Transition */}
      {configs.map((config, index) => (
        <div
          key={`${config.variant}-${index}`}
          className={`gba:absolute gba:inset-0 gba:transition-opacity gba:duration-700 gba:ease-in-out ${gradients[config.variant].className} ${
            index === activeIndex ? 'gba:opacity-100' : 'gba:opacity-0'
          }`}
        />
      ))}

      {/* Text Content with Carousel Slide */}
      <div className="gba:absolute gba:inset-0 gba:overflow-x-hidden">
        <div
          className="gba:flex gba:transition-transform gba:duration-700 gba:ease-in-out gba:h-full"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {configs.map((config, index) => {
            const isIntranet = config.variant === BannerVariant.INTRANET
            return (
              <div
                key={`${config.variant}-${index}`}
                className="gba:min-w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:px-6"
              >
                <div className="gba:max-w-[1440px] gba:w-full">
                  {isIntranet ? (
                    <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:text-white">
                      <div className="gba:flex gba:flex-col gba:mr-4">
                        <h1 className="gba:text-2xl gba:md:text-3xl gba:lg:text-4xl gba:mb-2 gba:drop-shadow-sm gba:font-bold">
                          {config.title}
                        </h1>
                        {config.subtitle && (
                          <p className="gba:text-sm gba:md:text-base gba:max-w-lg gba:opacity-90">{config.subtitle}</p>
                        )}
                      </div>
                      {config.children && <div className="gba:shrink-0">{config.children}</div>}
                    </div>
                  ) : (
                    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:text-white">
                      <h1 className="gba:text-2xl gba:md:text-3xl gba:lg:text-4xl gba:mb-2 gba:drop-shadow-sm gba:font-bold">
                        {config.title}
                      </h1>
                      {config.subtitle && (
                        <p className="gba:text-sm gba:md:text-base gba:max-w-lg gba:mx-auto gba:opacity-90">
                          {config.subtitle}
                        </p>
                      )}
                      {config.children && <div className="gba:mt-4">{config.children}</div>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Banner
