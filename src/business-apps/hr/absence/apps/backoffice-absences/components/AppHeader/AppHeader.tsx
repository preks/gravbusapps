import { Button, Typography, Space } from 'antd'
import { RiMenuLine, RiSearchLine } from '@remixicon/react'

export const AppHeader = () => {
  const { Title } = Typography;
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px',
      borderBottom: '1px solid #f0f0f0',
      backgroundColor: '#fff'
    }}>
      <Space size="middle">
        <RiMenuLine style={{ fontSize: '1.25rem' }} />
        <Title level={4} style={{ margin: 0 }}>Absence Hub</Title>
      </Space>
      <Button type="text" size="small" style={{ gap: '0.5rem' }}>
        <RiSearchLine style={{ fontSize: '1rem' }} />
        ACTIONS
      </Button>
    </header>
  )
}
