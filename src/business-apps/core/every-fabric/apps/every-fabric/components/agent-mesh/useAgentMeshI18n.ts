import { useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { MeshNodeKind } from '../../utils/traceModel'
import translations from '../../_i18n'
import { MESH_LAYERS, type MeshLayerKey } from './meshLayers'
import { MESH_SCOPES, type MeshScope } from './meshScopes'

export function useAgentMeshI18n() {
  const { t } = useTranslation(translations)

  const getScopeTitle = useCallback(
    (scope: MeshScope, userName?: string): string => {
      switch (scope) {
        case 'company':
          return t('agent-mesh-scope-title-company')
        case 'user':
          return userName
            ? t('agent-mesh-scope-title-user-named', { name: userName })
            : t('agent-mesh-scope-title-user')
        case 'me':
          return t('agent-mesh-scope-title-me')
        case 'session':
          return t('agent-mesh-scope-title-session')
      }
    },
    [t]
  )

  const getScopeSubtitle = useCallback(
    (scope: MeshScope): string => {
      switch (scope) {
        case 'company':
          return t('agent-mesh-scope-subtitle-company')
        case 'user':
          return t('agent-mesh-scope-subtitle-user')
        case 'me':
          return t('agent-mesh-scope-subtitle-me')
        case 'session':
          return t('agent-mesh-scope-subtitle-session')
      }
    },
    [t]
  )

  const scopeLabel = useCallback((scope: MeshScope) => t(`agent-mesh-scope-${scope}`), [t])

  const layerLabel = useCallback((key: MeshLayerKey) => t(`agent-mesh-layer-${key}`), [t])

  const nodeCategoryLabel = useCallback(
    (kind: MeshNodeKind): string => {
      switch (kind) {
        case 'orchestrator':
          return t('agent-mesh-node-orchestrator')
        case 'subagent':
        case 'expert':
          return t('agent-mesh-node-agent')
        case 'skill':
          return t('agent-mesh-node-skill')
        case 'tool':
          return t('agent-mesh-node-tool')
        default:
          return ''
      }
    },
    [t]
  )

  const edgeKindLabel = useCallback((kind: string) => t(`agent-mesh-edge-kind-${kind.replace(/_/g, '-')}`), [t])

  return {
    t,
    getScopeTitle,
    getScopeSubtitle,
    scopeLabel,
    layerLabel,
    nodeCategoryLabel,
    edgeKindLabel,
    meshScopes: MESH_SCOPES,
    meshLayers: MESH_LAYERS
  }
}
