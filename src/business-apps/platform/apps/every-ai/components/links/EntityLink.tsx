import React from 'react'
import EmployeeLinkChip from './EmployeeLinkChip'
import AccountLinkChip from './AccountLinkChip'
import LeadLinkChip from './LeadLinkChip'
import OpportunityLinkChip from './OpportunityLinkChip'
import ContactLinkChip from './ContactLinkChip'
import IntranetLinkChip from './IntranetLinkChip'
import InvestmentOpportunityLinkChip from './InvestmentOpportunityLinkChip'
import InvestmentAccountLinkChip from './InvestmentAccountLinkChip'
import InvestmentLeadChip from './InvestmentLeadChip'
import SandboxFileLinkChip from './SandboxFileLinkChip'

export const SUPPORTED_PROTOCOLS = [
  'employee',
  'account',
  'lead',
  'opportunity',
  'contact',
  'company',
  'intranet',
  'investment_opportunity',
  'investment_account',
  'investment_lead',
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

interface EntityLinkProps {
  href?: string
  accessToken: string
  children: React.ReactNode
}

const EntityLink: React.FC<EntityLinkProps> = ({ href, accessToken, children }) => {
  const [protocol, url] = splitLink(href || '') || [null, null]

  // Employee protocol: return chip
  if (protocol === 'employee' && url) {
    return <EmployeeLinkChip employeeId={url} token={accessToken} />
  }

  // Account protocol: return chip
  if ((protocol === 'account' || protocol === 'company') && url) {
    return <AccountLinkChip accountId={url} token={accessToken} />
  }

  // Lead protocol: return chip
  if (protocol === 'lead' && url) {
    return <LeadLinkChip leadId={url} token={accessToken} />
  }

  // Opportunity protocol: return chip
  if (protocol === 'opportunity' && url) {
    return <OpportunityLinkChip opportunityId={url} token={accessToken} />
  }

  // Contact protocol: return chip
  if (protocol === 'contact' && url) {
    return <ContactLinkChip contactId={url} token={accessToken} />
  }

  // Intranet protocol: return chip
  if (protocol === 'intranet' && url) {
    return <IntranetLinkChip url={url} token={accessToken} />
  }

  // Investment opportunity protocol: return chip
  if (protocol === 'investment_opportunity' && url) {
    return <InvestmentOpportunityLinkChip investmentOpportunityId={url} token={accessToken} />
  }

  // Investment account protocol: return chip
  if (protocol === 'investment_account' && url) {
    return <InvestmentAccountLinkChip investmentAccountId={url} token={accessToken} />
  }

  // Investment lead protocol: return chip
  if (protocol === 'investment_lead' && url) {
    return <InvestmentLeadChip investmentLeadId={url} token={accessToken} />
  }

  // Sandbox file protocol: return download button
  if (protocol === 'sandbox' && url) {
    return (
      <SandboxFileLinkChip filePath={url} token={accessToken}>
        {children}
      </SandboxFileLinkChip>
    )
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
