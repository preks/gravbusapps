// Sample inbound emails for the insurance Workforce demo.
//
// Kept in sync with ``DEMO_INBOUND_EMAILS`` in
// prompt-manager/scripts/seed_insurance_demo.py so operators can
// rehearse the same scenarios from the Test run dialog without
// hand-pasting headers and bodies.

export interface DemoInboundEmail {
  id: string
  scenario: string
  expected_path: string
  from_address: string
  subject: string
  body: string
}

export const DEFAULT_INSURANCE_DEMO_MAILBOX = 'claims@insurance-demo.local'

export const INSURANCE_DEMO_INBOUND_EMAILS: readonly DemoInboundEmail[] = [
  {
    id: 'status_update',
    scenario: 'Routine status update with policy number',
    expected_path: 'Draft reply for human approval (high confidence status_update)',
    from_address: 'maria.schmidt@example.com',
    subject: 'Claim status for policy NW-2024-88421',
    body: [
      'Hi,',
      '',
      "I'm following up on my water-damage claim from 12 March 2026.",
      'Policy number: NW-2024-88421',
      'Claim reference (if you have it): CLM-2026-004812',
      '',
      'Could you please tell me where things stand and whether you still need',
      'anything from me?',
      '',
      "The adjuster visited last week and took photos. I haven't heard back since.",
      '',
      'Thanks,',
      'Maria Schmidt',
      '+49 170 1234567'
    ].join('\n')
  },
  {
    id: 'new_claim_no_policy',
    scenario: 'New claim without policy number',
    expected_path: 'Escalate (new_claim, confidence capped at 0.5)',
    from_address: 'jonas.weber@example.com',
    subject: 'Need to report a car accident',
    body: [
      'Hello,',
      '',
      'I was in a minor collision this morning on the A96 near Munich.',
      'The other driver and I exchanged details. My front bumper is damaged',
      'but the car is still drivable.',
      '',
      "I don't have my policy documents with me right now — can you tell me",
      'how to open a claim and what photos you need?',
      '',
      'Best,',
      'Jonas Weber'
    ].join('\n')
  },
  {
    id: 'settlement_amount',
    scenario: 'Customer asks about a settlement figure',
    expected_path: 'Escalate / require approval (disclosure policy blocks quoting amounts)',
    from_address: 'maria.schmidt@example.com',
    subject: 'Re: settlement offer for claim CLM-2026-004812',
    body: [
      'Hi,',
      '',
      'Thank you for the update. Before I accept anything, can you confirm',
      'whether the €18,500 settlement you mentioned over the phone is final,',
      "or if I should expect a revised figure after the contractor's quote?",
      '',
      'Policy NW-2024-88421.',
      '',
      'Regards,',
      'Maria'
    ].join('\n')
  },
  {
    id: 'high_value_claim',
    scenario: 'Commercial property loss above high-value threshold',
    expected_path: 'Escalate to claims manager (claim value > $25,000)',
    from_address: 'facility.manager@acme-industrial.de',
    subject: 'Commercial property loss — urgent',
    body: [
      'Dear Claims Team,',
      '',
      'We had a fire in our warehouse last night. Preliminary damage estimate',
      "from our insurer's emergency contractor is approximately €340,000.",
      '',
      'Policy: NW-COMM-77102 (Acme Industrial GmbH)',
      'Location: Werkstraße 14, 80331 München',
      '',
      'We need guidance on business-interruption documentation requirements.',
      '',
      'Facility Manager',
      'Acme Industrial GmbH'
    ].join('\n')
  },
  {
    id: 'document_upload',
    scenario: 'Customer sends requested claim documents',
    expected_path: 'Draft or acknowledge (document_upload intent)',
    from_address: 'maria.schmidt@example.com',
    subject: 'Attached photos for claim CLM-2026-004812',
    body: [
      'Hi,',
      '',
      "As requested, I'm sending photos of the damaged kitchen cabinets and",
      'the moisture reading from the technician (see attachments in our portal).',
      '',
      'Policy NW-2024-88421, claim CLM-2026-004812.',
      '',
      'Please confirm receipt.',
      '',
      'Maria'
    ].join('\n')
  },
  {
    id: 'complaint',
    scenario: 'Formal complaint with regulator / legal threat',
    expected_path: 'Escalate (complaint is a blocked intent on the demo agent)',
    from_address: 'maria.schmidt@example.com',
    subject: 'Formal complaint — unacceptable delays',
    body: [
      'To whom it may concern,',
      '',
      'It has been six weeks since I reported water damage under policy',
      'NW-2024-88421. I am formally complaining about the lack of progress.',
      '',
      'If I do not receive a written response within 5 business days I will',
      'refer this matter to BaFin and consult my lawyer.',
      '',
      'Maria Schmidt'
    ].join('\n')
  }
]

export function findDemoInboundEmail(emailId: string): DemoInboundEmail | undefined {
  return INSURANCE_DEMO_INBOUND_EMAILS.find(email => email.id === emailId)
}

/** Format a demo email the same way operators paste it for manual test runs. */
export function formatDemoInboundEmailAsTask(
  email: DemoInboundEmail,
  mailbox: string = DEFAULT_INSURANCE_DEMO_MAILBOX
): string {
  return `Subject: ${email.subject}\nFrom: ${email.from_address}\nTo: ${mailbox}\n\n${email.body}`
}
