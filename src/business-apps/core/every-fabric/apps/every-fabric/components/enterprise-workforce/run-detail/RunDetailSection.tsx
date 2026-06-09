// Shared section heading for the run/session detail tabs. Extracted so each tab
// panel can render a consistent icon + title without duplicating markup.

import type { Icon } from '@phosphor-icons/react'
import React from 'react'

export const SectionTitle: React.FC<{ children: React.ReactNode; icon?: Icon; tone?: 'default' | 'warning' }> = ({
  children,
  icon: IconComponent,
  tone = 'default'
}) => (
  <div className="gba:mb-2.5 gba:flex gba:items-center gba:gap-2">
    {IconComponent && (
      <span
        className={`gba:inline-flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-md ${
          tone === 'warning'
            ? 'gba:bg-amber-500/10 gba:text-amber-600 gba:dark:text-amber-400'
            : 'gba:bg-primary/10 gba:text-primary'
        }`}
      >
        <IconComponent className="gba:h-3.5 gba:w-3.5" weight="bold" />
      </span>
    )}
    <h2
      className={`gba:text-sm gba:font-semibold ${
        tone === 'warning' ? 'gba:text-amber-600 gba:dark:text-amber-400' : 'gba:text-foreground'
      }`}
    >
      {children}
    </h2>
  </div>
)
