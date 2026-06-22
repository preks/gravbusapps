// Unified marketplace catalog item — from API packages or legacy mock templates.

import type { Icon } from '@phosphor-icons/react'
import {
  BriefcaseIcon,
  ChartLineUpIcon,
  CoinsIcon,
  HeadsetIcon,
  PackageIcon,
  ShoppingCartIcon,
  UserPlusIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import type { AgentPackageV1, MarketplacePackageSummary } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { MarketplaceAgentTemplate, MarketplaceValuePack } from './marketplaceAgents'

export interface MarketplaceBundleDetails {
  skills: string[]
  tools: string[]
}

export interface MarketplaceCatalogItem {
  id: string
  packageId: string
  version: string
  displayName: string
  role: string
  department: string
  valuePack: MarketplaceValuePack | 'general'
  icon: Icon
  iconEmoji?: string | null
  tagline: string
  description: string
  skills: string[]
  tools: string[]
  skillCount: number
  toolCount: number
  installCount: number
  rating: number
  publisher: string
  isLegacyTemplate: boolean
  legacyTemplate?: MarketplaceAgentTemplate
}

const CATEGORY_ICONS: Record<string, Icon> = {
  hr: UserPlusIcon,
  crm: BriefcaseIcon,
  service: HeadsetIcon,
  finance: CoinsIcon,
  erp: ShoppingCartIcon,
  general: UsersThreeIcon,
  procurement: PackageIcon,
  sales: ChartLineUpIcon
}

export function categoryIcon(category: string): Icon {
  return CATEGORY_ICONS[category.toLowerCase()] ?? UsersThreeIcon
}

export function packageSummaryToCatalogItem(row: MarketplacePackageSummary): MarketplaceCatalogItem {
  const category = (row.category || 'general').toLowerCase()
  const valuePack = (['hr', 'crm', 'service', 'finance', 'erp'].includes(category) ? category : 'general') as
    | MarketplaceValuePack
    | 'general'

  return {
    id: row.package_id,
    packageId: row.package_id,
    version: row.version,
    displayName: row.name,
    role: row.category || 'Agent',
    department: row.publisher || 'NEWWORK',
    valuePack,
    icon: categoryIcon(category),
    iconEmoji: row.icon,
    tagline: row.description.slice(0, 120),
    description: row.description,
    skills: Array.from({ length: row.skill_count }, (_, index) => `Skill ${index + 1}`),
    tools: Array.from({ length: row.tool_count }, (_, index) => `Tool ${index + 1}`),
    skillCount: row.skill_count,
    toolCount: row.tool_count,
    installCount: row.install_count,
    rating: row.rating ?? 4.5,
    publisher: row.publisher,
    isLegacyTemplate: false
  }
}

export function legacyTemplateToCatalogItem(template: MarketplaceAgentTemplate): MarketplaceCatalogItem {
  return {
    id: template.id,
    packageId: template.id,
    version: 'legacy',
    displayName: template.displayName,
    role: template.role,
    department: template.department,
    valuePack: template.valuePack,
    icon: template.icon,
    tagline: template.tagline,
    description: template.description,
    skills: template.skills,
    tools: template.tools,
    skillCount: template.skills.length,
    toolCount: template.tools.length,
    installCount: template.hires,
    rating: template.rating,
    publisher: 'newwork',
    isLegacyTemplate: true,
    legacyTemplate: template
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}

/**
 * Derive human-readable skill names and the provider tool refs they wire from a
 * fetched Agent Package v1 bundle. Used to replace `Skill 1` / `Tool 1`
 * placeholders in the marketplace detail view with the package's real contents.
 */
export function bundleToDetails(bundle: AgentPackageV1): MarketplaceBundleDetails {
  const skills: string[] = []
  const tools = new Set<string>()

  for (const skill of bundle.skills ?? []) {
    const name = typeof skill.name === 'string' && skill.name.trim() ? skill.name.trim() : null
    const skillId = typeof skill.skill_id === 'string' ? skill.skill_id : null
    const label = name ?? skillId
    if (label) skills.push(label)
    for (const ref of toStringArray(skill.tool_refs)) {
      tools.add(ref)
    }
  }

  const requirements = bundle.requirements ?? {}
  const requirementBuckets = [
    requirements.flowbot_tool_refs,
    requirements.builtin_tool_refs,
    requirements.prompt_manager_tool_refs,
    requirements.mcp_tool_refs,
    requirements.platform_native_functions
  ]
  for (const bucket of requirementBuckets) {
    for (const ref of toStringArray(bucket)) {
      tools.add(ref)
    }
  }

  return { skills, tools: Array.from(tools).sort((a, b) => a.localeCompare(b)) }
}

export function valuePackLabel(pack: MarketplaceValuePack | 'general'): string {
  switch (pack) {
    case 'hr':
      return 'Human Resources'
    case 'crm':
      return 'Customer Relationship'
    case 'service':
      return 'Customer Service'
    case 'finance':
      return 'Finance'
    case 'erp':
      return 'ERP & Procurement'
    default:
      return 'General'
  }
}

export function searchCatalogItems(items: MarketplaceCatalogItem[], query: string): MarketplaceCatalogItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return items
  return items.filter(item => {
    const haystack = [
      item.displayName,
      item.role,
      item.department,
      item.description,
      item.tagline,
      ...item.skills,
      ...item.tools
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(needle)
  })
}

export function catalogItemsByPack(
  items: MarketplaceCatalogItem[],
  pack: MarketplaceValuePack | 'general' | 'all'
): MarketplaceCatalogItem[] {
  if (pack === 'all') return items
  return items.filter(item => item.valuePack === pack)
}
