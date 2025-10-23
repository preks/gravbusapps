import React from 'react'
import { Card, Typography, Divider } from 'antd'

const { Title, Text } = Typography

interface DebugFormProps {
  componentName?: string
  [key: string]: any // Allows any other props
}

export const DebugForm: React.FC<DebugFormProps> = props => {
  const { componentName } = props

  // Get build info if available
  const buildInfo =
    typeof globalThis !== 'undefined' && globalThis.__APP_BUILD_INFO__ ? globalThis.__APP_BUILD_INFO__ : null

  return (
    <Card
      title={
        <Title level={4} style={{ margin: 0 }}>
          Debug View {componentName ? `- ${componentName}` : ''}
        </Title>
      }
      bordered={false}
      style={{
        width: '100%',
        height: '100vh',
        margin: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}
      bodyStyle={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <h2>Props:</h2>
      <pre
        style={{
          backgroundColor: 'var(--nw-color-muted)',
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
          <Divider />
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary">
              Built: {new Date(buildInfo.publishTime).toLocaleString()} by {buildInfo.gitUser || 'N/A'}
            </Text>
          </div>
        </>
      )}
    </Card>
  )
}

export default DebugForm
