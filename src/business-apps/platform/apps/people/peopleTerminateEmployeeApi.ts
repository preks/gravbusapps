import { kogitoProcessesBaseUrl } from '../setup-add-employees/employeeOnboardingApi'

export type StartTerminateEmployeeInput = {
  employeeId: string
  /** ISO-8601 instant; backend uses `Instant.parse`. Defaults to current instant. */
  terminationDateIso?: string
  /** When true, the BPMN job-position termination branch runs. Omit or false skips that path. */
  terminateJobPosition?: boolean
}

/**
 * Starts the Kogito process `employee.terminateEmployee` via REST (same pattern as
 * {@link createBasicEmployeeFlow}). The BPMN model is service-task only (no user tasks).
 */
export async function startTerminateEmployeeProcess(
  accessToken: string,
  input: StartTerminateEmployeeInput
): Promise<void> {
  const base = kogitoProcessesBaseUrl()
  if (!base) {
    throw new Error('Kogito processes endpoint is not configured')
  }

  const terminationDate = input.terminationDateIso ?? new Date().toISOString()
  const terminateJobPosition = Boolean(input.terminateJobPosition)

  const url = `${base}/employee/terminateEmployee`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      employeeId: input.employeeId,
      terminationDate,
      terminateJobPosition
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const hint = text.trim().slice(0, 400)
    throw new Error(
      hint.length > 0
        ? `Termination request failed (${res.status}): ${hint}`
        : `Termination request failed (${res.status})`
    )
  }
}
