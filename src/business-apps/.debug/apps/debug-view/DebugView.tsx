import React from 'react'

import { navigateTo } from '@/common/utils/navigationUtils'

interface DebugViewProps {
  componentName?: string
  [key: string]: any // Allows any other props
}

export const DebugView: React.FC<DebugViewProps> = props => {
  const { componentName } = props
  // Get build info if available
  const buildInfo =
    typeof globalThis !== 'undefined' && globalThis.__APP_BUILD_INFO__ ? globalThis.__APP_BUILD_INFO__ : null

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        margin: 0,
        backgroundColor: 'var(--nw-card)',
        border: '1px solid var(--nw-border)',
        borderRadius: '2px',
        boxShadow: 'var(--nw-shadow-md)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--nw-border)',
          backgroundColor: 'var(--nw-muted)'
        }}
      >
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--nw-card-foreground)' }}>
          Debug View {componentName ? `- ${componentName}` : ''}
        </h4>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '24px'
        }}
      >
        <button onClick={() => navigateTo('/platform/mobile/every-ai')}>Navigate to EveryAI</button>
        <h2 style={{ color: 'var(--nw-card-foreground)' }}>Props:</h2>
        <pre
          style={{
            backgroundColor: 'var(--nw-muted)',
            color: 'var(--nw-card-foreground)',
            padding: '12px',
            borderRadius: '4px',
            flex: 1,
            overflow: 'auto',
            margin: 0
          }}
        >
          {JSON.stringify(props, null, 2)}
        </pre>

        {buildInfo && (
          <>
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--nw-border)' }} />
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--nw-muted-foreground)', fontSize: '14px' }}>
                Built: {new Date(buildInfo.publishTime).toLocaleString()} by {buildInfo.gitUser || 'N/A'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DebugView
