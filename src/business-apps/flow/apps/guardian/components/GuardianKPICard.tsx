import React from 'react'

// CSS for spinner animation
const spinnerKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

// Inject CSS if not already present
if (!document.querySelector('#guardian-kpi-animations')) {
  const style = document.createElement('style')
  style.id = 'guardian-kpi-animations'
  style.textContent = spinnerKeyframes
  document.head.appendChild(style)
}

interface GuardianKPICardProps {
  title: string
  value: string | number
  description: string
  trend?: 'up' | 'down' | 'neutral'
  color?: string
  isLoading?: boolean
  'data-testid'?: string
}

export const GuardianKPICard: React.FC<GuardianKPICardProps> = ({
  title,
  value,
  description,
  color = 'var(--color-primary-500)',
  isLoading = false,
  'data-testid': dataTestId
}) => {
  if (isLoading) {
    return (
      <div
        data-testid={dataTestId}
        style={{
          background: 'var(--guardian-card)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--guardian-border)',
          borderRadius: '12px',
          padding: '20px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--guardian-border)',
            borderTop: `3px solid ${color}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      </div>
    )
  }

  return (
    <div
      data-testid={dataTestId}
      style={{
        background: 'var(--guardian-card)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--guardian-border)',
        borderRadius: '12px',
        padding: '20px',
        height: '120px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* Gradient accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 50%, transparent))`
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            marginBottom: '8px'
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--guardian-text-muted)',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {title}
          </h3>
        </div>

        <div
          style={{
            fontSize: '32px',
            fontWeight: '700',
            color: 'var(--guardian-text)',
            marginBottom: '8px',
            lineHeight: '1'
          }}
        >
          {value}
        </div>

        <p
          style={{
            fontSize: '12px',
            color: 'var(--guardian-text-muted)',
            margin: 0,
            lineHeight: '1.4'
          }}
        >
          {description}
        </p>
      </div>

      {/* Background pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '60px',
          background: `radial-gradient(circle, color-mix(in srgb, ${color} 12%, transparent) 0%, transparent 70%)`,
          borderRadius: '50%',
          transform: 'translate(20px, -20px)'
        }}
      />
    </div>
  )
}
