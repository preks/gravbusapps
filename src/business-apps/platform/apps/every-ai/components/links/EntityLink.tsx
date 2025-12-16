import React from 'react'
import EmployeeLinkChip from './EmployeeLinkChip'
import SandboxFileLinkChip from './SandboxFileLinkChip'
import { BaseEntityLinkChip } from './BaseEntityLinkChip'

export const SUPPORTED_PROTOCOLS = [
  'employee',
  'account',
  'lead',
  'opportunity',
  'contact',
  'company',
  'intranet',
  'content_entry',
  'investment_opportunity',
  'investment_account',
  'investment_lead',
  'investment_contact',
  'sales_activity',
  'service_ticket',
  'expense_request',
  'employee_absence',
  'employee_position',
  'employee_salary',
  'employee_benefit',
  'employee_bonus',
  'employee_certificate',
  'employee_capability',
  'employee_hobby',
  'employee_note',
  'employee_feedback',
  'employee_payslip',
  'employee_time_log',
  'employee_document',
  'employee_attendance',
  'employee_feedback_request',
  'employee_feedback_review',
  'sandbox'
]

export function markdownUrlTransform(url: string): string {
  // If the URL is one of the supported protocols, leave it as is
  if (SUPPORTED_PROTOCOLS.some(p => url.startsWith(`${p}://`))) {
    return url
  }

  // For http/https, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // Default return
  return url
}

function splitLink(rawUrl: string): [string, string] | null {
  if (!rawUrl) return null
  const match = rawUrl.match(/^([a-zA-Z0-9_]+):\/\/(.*)$/i)
  if (!match) return null
  const protocol = match[1].toLowerCase()
  const rest = (match[2] || '').trim()
  return [protocol, rest]
}

// Helper function to create icon components
const createIcon = (type: 'emoji' | 'svg', content: string | React.ReactElement) => {
  if (type === 'emoji') {
    return React.createElement('span', null, content)
  }
  return content
}

// Helper function to create SVG icons
const createSvgIcon = (pathD: string) => () =>
  React.createElement(
    'svg',
    { className: 'gba:h-4 gba:w-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 2,
      d: pathD
    })
  )

// Configuration for static entity chips (no data fetching needed)
const ENTITY_CHIP_CONFIG: Record<
  string,
  {
    urlTemplate: string
    icon: () => React.ReactNode
    variant?: 'default' | 'ai' | 'success' | 'info'
    showBorder?: boolean
  }
> = {
  account: {
    urlTemplate: '/platform/crm/account-record?accountId={id}',
    icon: () => createIcon('emoji', '🏢')
  },
  company: {
    urlTemplate: '/platform/crm/account-record?accountId={id}',
    icon: () => createIcon('emoji', '🏢')
  },
  lead: {
    urlTemplate: '/platform/crm/lead-record?leadId={id}',
    icon: () => createIcon('emoji', '⚡')
  },
  contact: {
    urlTemplate: '/platform/crm/contact-record?contactId={id}',
    icon: () => createIcon('emoji', '👥')
  },
  opportunity: {
    urlTemplate: '/platform/crm/opportunity-record?opportunityId={id}',
    icon: () => createIcon('emoji', '💰')
  },
  intranet: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: () =>
      React.createElement(
        'svg',
        { className: 'gba:h-4 gba:w-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        })
      )
  },
  content_entry: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: () =>
      React.createElement(
        'svg',
        { className: 'gba:h-4 gba:w-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        })
      )
  },
  investment_account: {
    urlTemplate: '/platform/irm/account-record?accountId={id}',
    icon: createSvgIcon(
      'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
    )
  },
  investment_opportunity: {
    urlTemplate: '/platform/irm/opportunity-record?opportunityId={id}',
    icon: createSvgIcon(
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    )
  },
  investment_lead: {
    urlTemplate: '/platform/irm/lead-record?leadId={id}',
    icon: createSvgIcon('M13 10V3L4 14h7v7l9-11h-7z')
  },
  investment_contact: {
    urlTemplate: '/platform/irm/contact-record?contactId={id}',
    icon: () => createIcon('emoji', '👥')
  },
  sales_activity: {
    urlTemplate: '/platform/crm/customer-relations?view=activities&activityId={id}',
    icon: createSvgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')
  },
  service_ticket: {
    urlTemplate: '/platform/sales-demo/service-launcher?view=myRequests&requestId={id}',
    icon: createSvgIcon(
      'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z'
    )
  },
  expense_request: {
    urlTemplate: '/platform/fin/expenses/expense-request-record?expenseRequestId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  employee_absence: {
    urlTemplate: '/platform/hr/absences/manager-absences?absenceId={id}',
    icon: createSvgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')
  },
  employee_position: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: createSvgIcon(
      'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
    )
  },
  employee_salary: {
    urlTemplate: '/platform/employee-record?tab=compensation&entityId={id}',
    icon: createSvgIcon(
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    )
  },
  employee_benefit: {
    urlTemplate: '/platform/employee-record?tab=compensation&subView=benefits&entityId={id}',
    icon: createSvgIcon(
      'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
    )
  },
  employee_bonus: {
    urlTemplate: '/platform/employee-record?tab=compensation&subView=bonuses&entityId={id}',
    icon: createSvgIcon(
      'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
    )
  },
  employee_certificate: {
    urlTemplate: '/platform/employee-record?tab=skills&subView=certificates&entityId={id}',
    icon: createSvgIcon(
      'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
    )
  },
  employee_capability: {
    urlTemplate: '/platform/employee-record?tab=skills&entityId={id}',
    icon: createSvgIcon(
      'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
    )
  },
  employee_hobby: {
    urlTemplate: '/platform/employee-record?tab=skills&subView=hobbies&entityId={id}',
    icon: createSvgIcon('M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z')
  },
  employee_note: {
    urlTemplate: '/platform/employee-record?tab=hrAdmin&subView=hrNotes&entityId={id}',
    icon: createSvgIcon(
      'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
    )
  },
  employee_feedback: {
    urlTemplate: '/platform/employee-record?tab=feedback&entityId={id}',
    icon: createSvgIcon('M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z')
  },
  employee_payslip: {
    urlTemplate: '/platform/employee-record?tab=compensation&subView=payslips&entityId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  employee_time_log: {
    urlTemplate: '/platform/employee-record?tab=timeTracking&entityId={id}',
    icon: createSvgIcon('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z')
  },
  employee_document: {
    urlTemplate: '/platform/employee-record?tab=documents&entityId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  employee_attendance: {
    urlTemplate: '/platform/employee-record?tab=timeTracking&entityId={id}',
    icon: createSvgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')
  },
  employee_feedback_request: {
    urlTemplate: '/platform/employee-record?tab=feedback&entityId={id}',
    icon: createSvgIcon(
      'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
    )
  },
  employee_feedback_review: {
    urlTemplate: '/platform/employee-record?tab=feedback&entityId={id}',
    icon: createSvgIcon(
      'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
    )
  }
}

interface EntityLinkProps {
  href?: string
  accessToken: string
  children: React.ReactNode
}

const EntityLink: React.FC<EntityLinkProps> = ({ href, accessToken, children }) => {
  const [protocol, url] = splitLink(href || '') || [null, null]

  // Employee protocol: needs data fetching, use special component
  if (protocol === 'employee' && url) {
    return (
      <EmployeeLinkChip employeeId={url} token={accessToken}>
        {children}
      </EmployeeLinkChip>
    )
  }

  // Sandbox file protocol: special download button
  if (protocol === 'sandbox' && url) {
    return (
      <SandboxFileLinkChip filePath={url} token={accessToken}>
        {children}
      </SandboxFileLinkChip>
    )
  }

  // All other protocols: use configuration-based approach
  if (protocol && url) {
    const config = ENTITY_CHIP_CONFIG[protocol]
    if (config) {
      const chipUrl = config.urlTemplate.replace('{id}', url)
      return (
        <BaseEntityLinkChip url={chipUrl} icon={config.icon()} variant={config.variant} showBorder={config.showBorder}>
          {children}
        </BaseEntityLinkChip>
      )
    }
  }

  // Regular links
  if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
    return (
      <a
        href={href}
        className="gba:text-primary gba:underline hover:gba:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  }

  return <span>{children}</span>
}

export default EntityLink
