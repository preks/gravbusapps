import React from 'react'
import { BriefcaseIcon } from '@phosphor-icons/react'

interface RecruitingPortalBannerProps {
  userInfo?: any
  jobPostingCount: number
}

export const RecruitingPortalBanner: React.FC<RecruitingPortalBannerProps> = ({ userInfo, jobPostingCount }) => {
  const userName = userInfo?.givenName || userInfo?.userName || 'Candidate'
  const currentHour = new Date().getHours()

  let greeting: string
  if (currentHour < 12) {
    greeting = 'Good Morning'
  } else if (currentHour < 18) {
    greeting = 'Good Afternoon'
  } else {
    greeting = 'Good Evening'
  }

  return (
    <div className="gba:w-full gba:relative gba:h-[240px] gba:overflow-hidden gba:shadow-lg gba:bg-gradient-to-br gba:from-blue-700 gba:via-blue-600 gba:to-blue-400">
      {/* Background pattern */}
      <div className="gba:absolute gba:inset-0 gba:opacity-10">
        <div className="gba:absolute gba:top-0 gba:right-0 gba:w-96 gba:h-96 gba:bg-white gba:rounded-full gba:blur-3xl gba:transform gba:translate-x-1/2 gba:-translate-y-1/2" />
        <div className="gba:absolute gba:bottom-0 gba:left-0 gba:w-96 gba:h-96 gba:bg-white gba:rounded-full gba:blur-3xl gba:transform gba:-translate-x-1/2 gba:translate-y-1/2" />
      </div>

      {/* Content */}
      <div className="gba:relative gba:h-full gba:flex gba:flex-col gba:justify-center gba:px-8 gba:max-w-[1440px] gba:mx-auto">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex-1">
            {/* Greeting */}
            <p className="gba:text-white/80 gba:text-base gba:mb-2 gba:font-medium gba:m-0">
              {greeting}, {userName}
            </p>

            {/* Main Title */}
            <h1 className="gba:text-4xl gba:md:text-5xl gba:font-bold gba:text-white gba:mb-3 gba:drop-shadow-lg gba:m-0">
              Career Opportunities
            </h1>

            {/* Subtitle with stats */}
            <div className="gba:flex gba:items-center gba:gap-6 gba:text-white/90">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-white/20 gba:backdrop-blur-sm gba:flex gba:items-center gba:justify-center">
                  <BriefcaseIcon size={20} className="gba:text-white" weight="duotone" />
                </div>
                <div>
                  <p className="gba:text-2xl gba:font-bold gba:leading-none gba:m-0">{jobPostingCount}</p>
                  <p className="gba:text-xs gba:text-white/70 gba:m-0">Open Positions</p>
                </div>
              </div>

              <div className="gba:h-12 gba:w-px gba:bg-white/20" />

              <p className="gba:text-sm gba:max-w-md gba:m-0">
                Explore available positions and apply to opportunities that match your career goals
              </p>
            </div>
          </div>

          {/* Decorative Icon */}
          <div className="gba:hidden gba:lg:block">
            <div className="gba:w-32 gba:h-32 gba:rounded-2xl gba:bg-white/10 gba:backdrop-blur-md gba:flex gba:items-center gba:justify-center gba:border gba:border-white/20 gba:shadow-2xl">
              <BriefcaseIcon size={64} className="gba:text-white" weight="duotone" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
