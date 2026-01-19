import React from 'react'
// Import Phosphor icons that might be used in tile configurations
import {
  Article,
  Note,
  TrendUp,
  ListChecks,
  HandCoins,
  Info,
  ChartLineUp,
  Target,
  Calendar,
  FileText,
  Lightbulb,
  Warning,
  CheckCircle,
  Star,
  Heart,
  Trophy,
  Gear,
  House,
  Factory,
  Buildings,
  TreeStructure,
  Graph,
  Coins,
  CurrencyDollar,
  Bank,
  ChartBar,
  TrendDown,
  Calculator,
  Receipt,
  Archive,
  FolderOpen,
  File,
  Users,
  User,
  Eye,
  PencilSimple,
  Trash
} from '@phosphor-icons/react'

// Type for icon components
export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

// Mapping from string icon names to Phosphor icon components
export const PHOSPHOR_ICON_MAP: Record<string, IconComponent> = {
  // Document and content icons
  ArticleIcon: Article,
  Article: Article,
  NoteIcon: Note,
  Note: Note,
  FileTextIcon: FileText,
  FileText: FileText,
  File: File,
  FolderOpen: FolderOpen,
  Archive: Archive,
  Receipt: Receipt,

  // Trend and analytics icons
  TrendUpIcon: TrendUp,
  TrendUp: TrendUp,
  TrendDown: TrendDown,
  ChartLineUp: ChartLineUp,
  ChartBar: ChartBar,
  Graph: Graph,

  // Task and action icons
  ListChecksIcon: ListChecks,
  ListChecks: ListChecks,
  CheckCircle: CheckCircle,
  Target: Target,
  Calendar: Calendar,

  // Financial icons
  HandCoinsIcon: HandCoins,
  HandCoins: HandCoins,
  Coins: Coins,
  CurrencyDollar: CurrencyDollar,
  Bank: Bank,
  Calculator: Calculator,

  // Information and status icons
  Info: Info,
  InfoIcon: Info,
  Lightbulb: Lightbulb,
  Warning: Warning,
  Star: Star,
  Heart: Heart,
  Trophy: Trophy,

  // Structure and organization icons
  House: House,
  Factory: Factory,
  Buildings: Buildings,
  TreeStructure: TreeStructure,

  // User and system icons
  Users: Users,
  User: User,
  Gear: Gear,
  Eye: Eye,
  PencilSimple: PencilSimple,
  Trash: Trash
}

/**
 * Get Phosphor icon component by name
 * @param iconName - Name of the icon (e.g., "ArticleIcon", "TrendUpIcon")
 * @returns React component for the icon, or fallback icon if not found
 */
export const getPhosphorIcon = (iconName: string): IconComponent => {
  // Try exact match first
  if (PHOSPHOR_ICON_MAP[iconName]) {
    return PHOSPHOR_ICON_MAP[iconName]
  }

  // Try without "Icon" suffix
  const nameWithoutIcon = iconName.replace(/Icon$/, '')
  if (PHOSPHOR_ICON_MAP[nameWithoutIcon]) {
    return PHOSPHOR_ICON_MAP[nameWithoutIcon]
  }

  // Try case variations
  const lowerName = iconName.toLowerCase()
  const foundKey = Object.keys(PHOSPHOR_ICON_MAP).find(key => key.toLowerCase() === lowerName)

  if (foundKey) {
    return PHOSPHOR_ICON_MAP[foundKey]
  }

  // Log warning for missing icons in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Phosphor icon not found: ${iconName}. Available icons:`, Object.keys(PHOSPHOR_ICON_MAP))
  }

  // Fallback to Info icon
  return Info
}

/**
 * Get all available icon names for debugging
 */
export const getAvailableIconNames = (): string[] => {
  return Object.keys(PHOSPHOR_ICON_MAP).sort()
}
