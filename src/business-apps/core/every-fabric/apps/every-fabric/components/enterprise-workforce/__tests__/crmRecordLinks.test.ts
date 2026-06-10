import { buildCrmRecordLinkMap, linkifyCrmUuidsInOutput } from '../crmRecordLinks'
import type { WorkforceRunCrmActionEntry } from '../workforceTypes'

function buildAction(overrides: Partial<WorkforceRunCrmActionEntry> = {}): WorkforceRunCrmActionEntry {
  return {
    tool_ref: 'functions.create_crm_entity',
    action: 'create',
    entity_type: 'contact',
    record_ids: {},
    succeeded: true,
    ...overrides
  }
}

describe('crmRecordLinks', () => {
  it('builds link map with human labels from record_labels', () => {
    const contactId = 'b3269810-aeff-4ade-8ce3-ec39c1198927'
    const noteId = '47a37a1a-aca6-40c4-9fbc-c0cab4e40ca1'
    const taskId = '9bed2ef1-0f6a-47c8-911b-a3be7100609d'

    const map = buildCrmRecordLinkMap([
      buildAction({
        action: 'create',
        record_ids: { contact_id: contactId, id: contactId },
        record_labels: { [contactId]: 'Jonas Weber' }
      }),
      buildAction({
        action: 'note',
        tool_ref: 'functions.add_crm_note',
        record_ids: { note_id: noteId },
        record_labels: { [noteId]: 'Inbound claim summary' }
      }),
      buildAction({
        action: 'task',
        tool_ref: 'functions.add_crm_task',
        record_ids: { task_id: taskId },
        record_labels: { [taskId]: 'Follow up on policy number' }
      })
    ])

    expect(map.get(contactId)).toEqual({
      label: 'Jonas Weber',
      url: expect.stringContaining('contactId=b3269810-aeff-4ade-8ce3-ec39c1198927')
    })
    expect(map.get(noteId)?.url).toContain('noteId=47a37a1a-aca6-40c4-9fbc-c0cab4e40ca1')
    expect(map.get(taskId)?.url).toContain('taskId=9bed2ef1-0f6a-47c8-911b-a3be7100609d')
  })

  it('replaces known UUIDs in output markdown with named links', () => {
    const contactId = 'b3269810-aeff-4ade-8ce3-ec39c1198927'
    const output = `## ACTIONS TAKEN\n- Created CRM contact: ${contactId}`

    const linked = linkifyCrmUuidsInOutput(output, [
      buildAction({
        record_ids: { contact_id: contactId },
        record_labels: { [contactId]: 'Jonas Weber' }
      })
    ])

    expect(linked).toContain('[Jonas Weber](/platform/crm/contact-record?contactId=')
    expect(linked).not.toMatch(new RegExp(`: ${contactId}$`))
  })

  it('leaves unknown UUIDs unchanged', () => {
    const unknownId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const output = `Created record ${unknownId}`
    expect(linkifyCrmUuidsInOutput(output, [])).toBe(output)
  })

  it('does not corrupt UUIDs already inside markdown link destinations', () => {
    const contactId = 'f3236e6c-d72c-4730-b60f-74990a6b413e'
    const output = `- Created CRM Contact [Jonas Weber](/platform/crm/contact-record?contactId=${contactId}&source=workforce-run) for Jonas Weber.`
    const actions = [
      buildAction({
        record_ids: { contact_id: contactId },
        record_labels: { [contactId]: 'Jonas Weber' }
      })
    ]

    expect(linkifyCrmUuidsInOutput(output, actions)).toBe(output)
  })

  it('upgrades markdown links that use a bare UUID destination', () => {
    const contactId = 'f3236e6c-d72c-4730-b60f-74990a6b413e'
    const output = `- Created CRM Contact [Jonas Weber](${contactId}) for Jonas Weber.`

    const linked = linkifyCrmUuidsInOutput(output, [
      buildAction({
        record_ids: { contact_id: contactId },
        record_labels: { [contactId]: 'Jonas Weber' }
      })
    ])

    expect(linked).toContain('[Jonas Weber](/platform/crm/contact-record?contactId=')
    expect(linked).not.toContain(`](${contactId})`)
  })

  it('replaces backtick-wrapped UUIDs with markdown links outside inline code', () => {
    const contactId = 'e76462d5-228b-42d5-a3ae-9473d63a7f9e'
    const output = `- Created CRM **contact** for **Jonas Weber**: \`${contactId}\``

    const linked = linkifyCrmUuidsInOutput(output, [
      buildAction({
        record_ids: { contact_id: contactId },
        record_labels: { [contactId]: 'Jonas Weber' }
      })
    ])

    expect(linked).toContain('[Jonas Weber](/platform/crm/contact-record?contactId=')
    expect(linked).not.toContain('`[')
    expect(linked).not.toContain(`\`${contactId}\``)
  })

  it('unwraps markdown links that were incorrectly left inside backticks', () => {
    const contactId = 'f3236e6c-d72c-4730-b60f-74990a6b413e'
    const url = `/platform/crm/contact-record?contactId=${contactId}&source=workforce-run`
    const output = `- Created CRM Contact \`[Jonas Weber](${url})\` for Jonas Weber.`

    const linked = linkifyCrmUuidsInOutput(output, [
      buildAction({
        record_ids: { contact_id: contactId },
        record_labels: { [contactId]: 'Jonas Weber' }
      })
    ])

    expect(linked).toContain(`[Jonas Weber](${url})`)
    expect(linked).not.toContain('`[')
  })

  it('replaces UUIDs wrapped in bold markdown', () => {
    const contactId = 'f3236e6c-d72c-4730-b60f-74990a6b413e'
    const output = `- **CRM contact matched:** found existing contact **${contactId}** for Jonas Weber.`

    const linked = linkifyCrmUuidsInOutput(output, [
      buildAction({
        action: 'search',
        record_ids: { contact_id: contactId },
        record_labels: { [contactId]: 'Jonas Weber' }
      })
    ])

    expect(linked).toContain('[Jonas Weber](/platform/crm/contact-record?contactId=')
    expect(linked).not.toMatch(new RegExp(`\\*\\*${contactId}\\*\\*`))
  })
})
