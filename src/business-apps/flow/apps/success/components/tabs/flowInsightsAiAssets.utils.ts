import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  EventHandlerType,
  type EventSubscription,
  type FlowStep,
  type FlowTemplate
} from '@/common/network/flows/FlowTemplateClient'

type AssetType = 'policy' | 'task-expert' | 'function'

export interface FlowInsightAssetItem {
  key: string
  label: string
  versionLabel?: string
  href?: string
  usages: string[]
}

export interface FlowInsightsAiAssets {
  policies: FlowInsightAssetItem[]
  taskExperts: FlowInsightAssetItem[]
  functions: FlowInsightAssetItem[]
}

export interface FlowInsightReliabilityHotspot {
  stepReference?: string | null
  stepTitle?: string | null
  taskType?: string | null
}

const TASK_EXPERT_APP_URL = '/platform/create/prompt-manager'
const FUNCTION_APP_URL = '/platform/create/function-manager'
const POLICY_APP_URL = '/platform/content/intranet/content-record'

const sortAssets = (items: FlowInsightAssetItem[]) =>
  [...items].sort((left, right) => left.label.localeCompare(right.label))

const pushUsage = (items: string[], usage: string) => {
  if (usage && !items.includes(usage)) items.push(usage)
}

const isFunctionTaskType = (value?: string | null) =>
  String(value || '')
    .trim()
    .toUpperCase() === 'FUNCTION'

const resolveUsageLabel = (value?: string | null, fallback?: string | null, emptyLabel?: string) => {
  const normalizedValue = String(value || '').trim()
  const normalizedFallback = String(fallback || '').trim()
  const normalizedEmptyLabel = String(emptyLabel || '').trim()
  return normalizedValue || normalizedFallback || normalizedEmptyLabel
}

const hasFunctionAssetForHotspot = (
  map: Map<string, FlowInsightAssetItem>,
  hotspot: FlowInsightReliabilityHotspot,
  usage: string
) => {
  const normalizedUsage = String(usage || '').trim()
  const normalizedStepTitle = String(hotspot.stepTitle || '').trim()
  const normalizedStepReference = String(hotspot.stepReference || '').trim()

  return Array.from(map.values()).some(item => {
    const normalizedLabel = String(item.label || '').trim()

    if (
      normalizedLabel &&
      [normalizedUsage, normalizedStepTitle, normalizedStepReference].filter(Boolean).includes(normalizedLabel)
    ) {
      return true
    }

    return item.usages.some(existingUsage =>
      [normalizedUsage, normalizedStepTitle, normalizedStepReference]
        .filter(Boolean)
        .includes(String(existingUsage || '').trim())
    )
  })
}

const upsertAsset = (
  map: Map<string, FlowInsightAssetItem>,
  {
    assetType,
    assetId,
    label,
    versionLabel,
    usage,
    href
  }: {
    assetType: AssetType
    assetId?: string | null
    label?: string | null
    versionLabel?: string
    usage: string
    href?: string
  }
) => {
  const normalizedId = String(assetId || '').trim()
  const normalizedLabel = String(label || '').trim()
  const resolvedLabel = normalizedLabel || normalizedId

  if (!resolvedLabel) return

  const itemKey = `${assetType}:${normalizedId || resolvedLabel}:${versionLabel || 'latest'}`
  const existing = map.get(itemKey)

  if (existing) {
    pushUsage(existing.usages, usage)
    return
  }

  map.set(itemKey, {
    key: itemKey,
    label: resolvedLabel,
    versionLabel,
    href,
    usages: usage ? [usage] : []
  })
}

const collectFromSubscriptions = (
  mapByType: Record<AssetType, Map<string, FlowInsightAssetItem>>,
  subscriptions: EventSubscription[] | undefined,
  ownerLabel?: string,
  emptyLabel?: string
) => {
  for (const subscription of subscriptions || []) {
    const usage = resolveUsageLabel(subscription.description, ownerLabel || subscription.eventType, emptyLabel)

    if (subscription.handler.type === EventHandlerType.TASK_EXPERT) {
      upsertAsset(mapByType['task-expert'], {
        assetType: 'task-expert',
        assetId: String(subscription.handler.promptId || ''),
        label: String(subscription.handler.promptId || ''),
        usage,
        href: subscription.handler.promptId
          ? buildPlatformUrl(TASK_EXPERT_APP_URL, { expertId: String(subscription.handler.promptId) })
          : buildPlatformUrl(TASK_EXPERT_APP_URL)
      })
    }

    if (subscription.handler.type === EventHandlerType.FUNCTION) {
      upsertAsset(mapByType.function, {
        assetType: 'function',
        assetId: String(subscription.handler.functionId || ''),
        label: String(subscription.handler.functionId || ''),
        usage,
        href: buildPlatformUrl(FUNCTION_APP_URL)
      })
    }
  }
}

export const collectFlowInsightsAiAssets = (
  template: FlowTemplate | null,
  emptyLabel: string,
  reliabilityHotspots: FlowInsightReliabilityHotspot[] = []
): FlowInsightsAiAssets => {
  const mapByType: Record<AssetType, Map<string, FlowInsightAssetItem>> = {
    policy: new Map<string, FlowInsightAssetItem>(),
    'task-expert': new Map<string, FlowInsightAssetItem>(),
    function: new Map<string, FlowInsightAssetItem>()
  }

  for (const step of template?.steps || []) {
    const usage = resolveUsageLabel(step.title, step.reference || step.id, emptyLabel)
    const agentConfig = (step.agentConfig || {}) as FlowStep['agentConfig'] & { promptName?: string }
    const functionConfig = (step.functionConfig || {}) as FlowStep['functionConfig'] & { functionName?: string }
    const aiConfig = (step.aiConfig || {}) as FlowStep['aiConfig'] & { promptName?: string }
    const stepType = String(step.type || '')
      .trim()
      .toUpperCase()

    if (agentConfig?.promptId) {
      upsertAsset(mapByType['task-expert'], {
        assetType: 'task-expert',
        assetId: agentConfig.promptId,
        label: agentConfig.promptName || usage,
        versionLabel: agentConfig.version != null ? `v${agentConfig.version}` : undefined,
        usage,
        href: buildPlatformUrl(TASK_EXPERT_APP_URL, { expertId: agentConfig.promptId })
      })
    }

    if (aiConfig?.promptId) {
      upsertAsset(mapByType['task-expert'], {
        assetType: 'task-expert',
        assetId: aiConfig.promptId,
        label: aiConfig.promptName || usage,
        usage,
        href: buildPlatformUrl(TASK_EXPERT_APP_URL, { expertId: aiConfig.promptId })
      })
    }

    if (aiConfig?.policyDocumentId || aiConfig?.policyDocumentTitle) {
      upsertAsset(mapByType.policy, {
        assetType: 'policy',
        assetId: aiConfig.policyDocumentId,
        label: aiConfig.policyDocumentTitle || usage,
        versionLabel: aiConfig.policyDocumentVersion || undefined,
        usage,
        href: aiConfig.policyDocumentId
          ? buildPlatformUrl(POLICY_APP_URL, { contentId: aiConfig.policyDocumentId, tab: 'policies' })
          : undefined
      })
    }

    if (functionConfig?.functionId) {
      upsertAsset(mapByType.function, {
        assetType: 'function',
        assetId: functionConfig.functionId,
        label: functionConfig.functionName || usage,
        versionLabel: functionConfig.version != null ? `v${functionConfig.version}` : undefined,
        usage,
        href: buildPlatformUrl(FUNCTION_APP_URL)
      })
    } else if (stepType === 'FUNCTION') {
      upsertAsset(mapByType.function, {
        assetType: 'function',
        assetId: step.reference || step.id || step.title,
        label: step.title || step.reference || step.id || emptyLabel,
        usage,
        href: buildPlatformUrl(FUNCTION_APP_URL)
      })
    }

    collectFromSubscriptions(mapByType, step.eventSubscriptions, usage, emptyLabel)
  }

  collectFromSubscriptions(mapByType, template?.eventSubscriptions, template?.name, emptyLabel)

  for (const hotspot of reliabilityHotspots) {
    if (!isFunctionTaskType(hotspot.taskType)) continue

    const usage = resolveUsageLabel(hotspot.stepTitle, hotspot.stepReference, emptyLabel)
    if (hasFunctionAssetForHotspot(mapByType.function, hotspot, usage)) continue

    upsertAsset(mapByType.function, {
      assetType: 'function',
      assetId: hotspot.stepReference || hotspot.stepTitle || usage,
      label: hotspot.stepTitle || hotspot.stepReference || usage,
      usage,
      href: buildPlatformUrl(FUNCTION_APP_URL)
    })
  }

  return {
    policies: sortAssets(Array.from(mapByType.policy.values())),
    taskExperts: sortAssets(Array.from(mapByType['task-expert'].values())),
    functions: sortAssets(Array.from(mapByType.function.values()))
  }
}
