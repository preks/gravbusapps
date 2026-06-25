import {
  applyUiOverridesToArguments,
  buildUiHintFields,
  extractUiHints,
  resolveSchemaAndRequiredAtPathBest
} from './uiHintsUtils'

describe('uiHintsUtils', () => {
  describe('extractUiHints', () => {
    it('returns allowlist and overrides from the root schema', () => {
      const flowSchema = {
        'x-ui-allowlist': ['a', 'b.c', 123],
        'x-ui-overrides': { a: { widget: 'date' } }
      }

      const hints = extractUiHints(flowSchema)

      expect(hints.allowlist).toEqual(['a', 'b.c'])
      expect(hints.overrides).toEqual({ a: { widget: 'date' } })
      expect(hints.schemaRoot).toBe(flowSchema)
      expect(hints.source).toBe('root')
    })

    it('falls back to properties.flow for nested hints', () => {
      const flowNode = {
        type: 'object',
        properties: { employeeAbsence: { type: 'object', properties: { startDate: { type: 'string' } } } },
        'x-ui-allowlist': ['employeeAbsence.startDate'],
        'x-ui-overrides': { 'employeeAbsence.startDate': { widget: 'date' } }
      }
      const wrapper = { type: 'object', properties: { flow: flowNode } }

      const hints = extractUiHints(wrapper)

      expect(hints.allowlist).toEqual(['employeeAbsence.startDate'])
      expect(hints.schemaRoot).toBe(flowNode)
      expect(hints.source).toBe('properties.flow')
    })

    it('returns source="none" when no hints are present', () => {
      const hints = extractUiHints({ type: 'object', properties: { flow: { type: 'object' } } })
      expect(hints.source).toBe('none')
      expect(hints.allowlist).toEqual([])
      expect(hints.overrides).toEqual({})
    })
  })

  describe('buildUiHintFields', () => {
    it('strips objectKey prefix and sorts by order', () => {
      const flowSchema = {
        type: 'object',
        properties: {
          employeeAbsence: {
            type: 'object',
            properties: {
              startDate: { type: 'string' },
              endDate: { type: 'string' }
            },
            required: ['startDate']
          }
        }
      }

      const fields = buildUiHintFields({
        flowSchema,
        objectKey: 'employeeAbsence',
        allowlist: ['employeeAbsence.endDate', 'employeeAbsence.startDate'],
        overrides: {
          'employeeAbsence.startDate': { order: 20, widget: 'date' },
          'employeeAbsence.endDate': { order: 10, widget: 'date' }
        }
      })

      expect(fields.map(f => f.fieldName)).toEqual(['endDate', 'startDate'])
      expect(fields.find(f => f.fieldName === 'startDate')?.required).toBe(true)
      expect(fields.find(f => f.fieldName === 'endDate')?.required).toBe(false)
    })

    it('preserves allowlist order among fields without order when some fields have explicit order', () => {
      const flowSchema = {
        type: 'object',
        properties: {
          employeeAbsence: {
            type: 'object',
            properties: {
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              description: { type: 'string' }
            }
          }
        }
      }

      const fields = buildUiHintFields({
        flowSchema,
        objectKey: 'employeeAbsence',
        allowlist: ['employeeAbsence.startDate', 'employeeAbsence.endDate', 'employeeAbsence.description'],
        overrides: {
          'employeeAbsence.endDate': { order: 10, widget: 'date' }
        }
      })

      expect(fields.map(f => f.fieldName)).toEqual(['endDate', 'startDate', 'description'])
    })

    it('accepts flow- and task-prefixed paths', () => {
      const flowSchema = {
        type: 'object',
        properties: {
          employeeAbsence: {
            type: 'object',
            properties: { startDate: { type: 'string' } }
          }
        }
      }

      const fields = buildUiHintFields({
        flowSchema,
        objectKey: 'employeeAbsence',
        allowlist: ['flow.employeeAbsence.startDate'],
        overrides: { 'flow.employeeAbsence.startDate': { order: 10, widget: 'date' } }
      })

      expect(fields.map(f => f.fieldName)).toEqual(['startDate'])
      expect(fields[0].fullPath).toBe('employeeAbsence.startDate')
      expect(fields[0].override?.widget).toBe('date')
    })

    it('supports dotted allowlist paths when objectKey is null (root flow formData)', () => {
      const flowSchema = {
        type: 'object',
        properties: {
          employeeAbsence: {
            type: 'object',
            properties: {
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string' }
            },
            required: ['startDate']
          }
        }
      }

      const fields = buildUiHintFields({
        flowSchema,
        objectKey: null,
        allowlist: ['employeeAbsence.startDate', 'employeeAbsence.endDate'],
        overrides: {
          'employeeAbsence.startDate': { order: 10, widget: 'date' },
          'employeeAbsence.endDate': { order: 20, widget: 'date' }
        }
      })

      expect(fields.map(f => ({ leaf: f.fieldName, nested: f.nestedFormValue }))).toEqual([
        { leaf: 'startDate', nested: true },
        { leaf: 'endDate', nested: true }
      ])
      expect(fields.map(f => f.fullPath)).toEqual(['employeeAbsence.startDate', 'employeeAbsence.endDate'])
      expect(fields.find(f => f.fieldName === 'startDate')?.required).toBe(true)
    })

    it('skips omitted and hidden entries', () => {
      const flowSchema = {
        type: 'object',
        properties: {
          employeeAbsence: {
            type: 'object',
            properties: { startDate: { type: 'string' }, typeRef: { type: 'string' } }
          }
        }
      }

      const fields = buildUiHintFields({
        flowSchema,
        objectKey: 'employeeAbsence',
        allowlist: ['employeeAbsence.startDate', 'employeeAbsence.typeRef'],
        overrides: {
          'employeeAbsence.typeRef': { hidden: true, fixed: { value: 'AbsenceType:v1:A001' } },
          'employeeAbsence.startDate': { order: 10, widget: 'date' }
        }
      })

      expect(fields.map(f => f.fieldName)).toEqual(['startDate'])
    })

    it('maps flat allowlist entries onto a nested objectKey slice', () => {
      const flowSchema = {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          employeeAbsence: {
            type: 'object',
            properties: {
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' },
              typeRef: { type: 'string' }
            },
            required: ['startDate', 'endDate']
          }
        }
      }

      const fields = buildUiHintFields({
        flowSchema,
        objectKey: 'employeeAbsence',
        allowlist: ['startDate', 'endDate', 'typeRef'],
        overrides: {
          startDate: { order: 20, widget: 'date' },
          endDate: { order: 30, widget: 'date' },
          typeRef: { order: 10 }
        }
      })

      expect(fields.map(f => f.fieldName)).toEqual(['typeRef', 'startDate', 'endDate'])
      expect(fields.every(f => f.nestedFormValue === false)).toBe(true)
    })
  })

  describe('resolveSchemaAndRequiredAtPathBest', () => {
    it('finds nested fields under properties.flow', () => {
      const wrapper = {
        type: 'object',
        properties: {
          flow: {
            type: 'object',
            properties: {
              employeeAbsence: {
                type: 'object',
                properties: { startDate: { type: 'string', format: 'date' } },
                required: ['startDate']
              }
            }
          }
        }
      }

      const r = resolveSchemaAndRequiredAtPathBest(wrapper, 'employeeAbsence.startDate')

      expect(r.schema?.type).toBe('string')
      expect(r.schema?.format).toBe('date')
      expect(r.required).toBe(true)
    })

    it('falls back to a string placeholder when the path does not exist', () => {
      const r = resolveSchemaAndRequiredAtPathBest({ type: 'object', properties: {} }, 'foo.bar')
      expect(r.schema).toEqual({ type: 'string', title: 'bar' })
      expect(r.required).toBe(false)
    })
  })

  describe('applyUiOverridesToArguments', () => {
    it('applies fixed and omit overrides on the flow root', () => {
      const args = {
        flow: { employeeAbsence: { startDate: '2026-09-10', typeRef: 'WRONG' }, event: 'y' }
      }

      const next = applyUiOverridesToArguments(args, {
        event: { omit: true },
        'employeeAbsence.typeRef': { fixed: { value: 'AbsenceType:v1:A001' } }
      })

      expect(next.flow?.event).toBeUndefined()
      expect(next.flow?.employeeAbsence?.typeRef).toBe('AbsenceType:v1:A001')
      expect(next.flow?.employeeAbsence?.startDate).toBe('2026-09-10')
    })

    it('routes to task root when the first segment lives in task', () => {
      const args = { flow: {}, task: { someTask: { value: 'old' } } }

      const next = applyUiOverridesToArguments(args, {
        'someTask.value': { fixed: { value: 'new' } }
      })

      expect(next.task?.someTask?.value).toBe('new')
    })

    it('is a no-op for hidden-only overrides', () => {
      const args = { flow: { employeeAbsence: { employeeId: 'abc' } } }

      const next = applyUiOverridesToArguments(args, {
        'employeeAbsence.employeeId': { hidden: true }
      })

      expect(next.flow?.employeeAbsence?.employeeId).toBe('abc')
    })

    it('applies single-segment overrides under flow[objectKey] when routing matches the form slice', () => {
      const args = {
        flow: {
          employeeAbsence: { startDate: 'old', typeRef: 'T0' },
          event: 'keep'
        }
      }

      const next = applyUiOverridesToArguments(
        args,
        {
          typeRef: { fixed: { value: 'T1' } },
          startDate: { fixed: { value: 'new' } }
        },
        { sourceType: 'flow', objectKey: 'employeeAbsence' }
      )

      expect(next.flow?.employeeAbsence?.typeRef).toBe('T1')
      expect(next.flow?.employeeAbsence?.startDate).toBe('new')
      expect(next.flow?.event).toBe('keep')
    })

    it('applies top-level flow keys when routing uses objectKey', () => {
      const args = { flow: { employeeAbsence: { a: 1 }, event: 'x' } }

      const next = applyUiOverridesToArguments(
        args,
        { event: { omit: true } },
        { sourceType: 'flow', objectKey: 'employeeAbsence' }
      )

      expect(next.flow?.event).toBeUndefined()
      expect(next.flow?.employeeAbsence?.a).toBe(1)
    })

    it('applies single-segment overrides under task[objectKey] when routing matches the form slice', () => {
      const args = { task: { myTask: { value: 'old' } } }

      const next = applyUiOverridesToArguments(
        args,
        { value: { fixed: { value: 'new' } } },
        { sourceType: 'task', objectKey: 'myTask' }
      )

      expect(next.task?.myTask?.value).toBe('new')
    })

    it('does not mutate the input arguments', () => {
      const args = { flow: { event: 'y' } }
      const before = JSON.stringify(args)

      applyUiOverridesToArguments(args, { event: { omit: true } })

      expect(JSON.stringify(args)).toBe(before)
    })

    it('keeps a fixed value on the wire when omit and fixed.value are combined (hidden but sent)', () => {
      const args = { flow: { employeeAbsence: { startDate: '2026-09-10' } } }

      const next = applyUiOverridesToArguments(args, {
        event: { omit: true, fixed: { value: 'pse_submit' } }
      })

      expect(next.flow?.event).toBe('pse_submit')
      expect(next.flow?.employeeAbsence?.startDate).toBe('2026-09-10')
    })

    it('still deletes when omit is set without a fixed value/source', () => {
      const args = { flow: { event: 'y', flowType: 'vacation' } }

      const next = applyUiOverridesToArguments(args, {
        event: { omit: true }
      })

      expect(next.flow).not.toHaveProperty('event')
      expect(next.flow?.flowType).toBe('vacation')
    })

    it('resolves fixed.source from a sibling field in the same root', () => {
      const args = { flow: { employeeId: 'emp-123', employeeDetails: {} } }

      const next = applyUiOverridesToArguments(args, {
        'employeeDetails.userId': { hidden: true, fixed: { source: 'employeeId' } }
      })

      expect(next.flow?.employeeDetails?.userId).toBe('emp-123')
      expect(next.flow?.employeeId).toBe('emp-123')
    })

    it('resolves fixed.source pointing to a nested path', () => {
      const args = {
        flow: { employeeAbsence: { startDate: '2026-09-10', endDate: '2026-09-20' } }
      }

      const next = applyUiOverridesToArguments(args, {
        startDate: { hidden: true, fixed: { source: 'employeeAbsence.startDate' } },
        endDate: { hidden: true, fixed: { source: 'employeeAbsence.endDate' } }
      })

      expect(next.flow?.startDate).toBe('2026-09-10')
      expect(next.flow?.endDate).toBe('2026-09-20')
    })

    it('is a no-op when fixed.source points to a missing path', () => {
      const args = { flow: { employeeDetails: { userId: 'keep' } } }

      const next = applyUiOverridesToArguments(args, {
        'employeeDetails.userId': { hidden: true, fixed: { source: 'doesNotExist' } }
      })

      expect(next.flow?.employeeDetails?.userId).toBe('keep')
    })

    it('sets the sourced value when fixed.source and omit are combined', () => {
      const args = { flow: { employeeAbsence: { startDate: '2026-09-10' } } }

      const next = applyUiOverridesToArguments(args, {
        startDate: { omit: true, fixed: { source: 'employeeAbsence.startDate' } }
      })

      expect(next.flow?.startDate).toBe('2026-09-10')
    })

    it('produces the BPMN-expected wire payload for a realistic createEmployeeVacation override map', () => {
      const args = {
        flow: {
          employeeId: 'emp-123',
          employeeAbsence: {
            startDate: '2026-09-10',
            endDate: '2026-09-20',
            typeRef: 'WRONG'
          }
        }
      }

      const overrides = {
        event: { omit: true, fixed: { value: 'pse_submit' } },
        flowType: { hidden: true, fixed: { value: 'vacation' } },
        'employeeDetails.userId': { hidden: true, fixed: { source: 'employeeId' } },
        startDate: { hidden: true, fixed: { source: 'employeeAbsence.startDate' } },
        endDate: { hidden: true, fixed: { source: 'employeeAbsence.endDate' } },
        'employeeAbsence.typeRef': { hidden: true, fixed: { value: 'AbsenceType:v1:A001' } }
      }

      const next = applyUiOverridesToArguments(args, overrides)

      expect(next.flow).toEqual({
        employeeId: 'emp-123',
        event: 'pse_submit',
        flowType: 'vacation',
        startDate: '2026-09-10',
        endDate: '2026-09-20',
        employeeDetails: { userId: 'emp-123' },
        employeeAbsence: {
          startDate: '2026-09-10',
          endDate: '2026-09-20',
          typeRef: 'AbsenceType:v1:A001'
        }
      })
    })

    it('produces the BPMN-expected wire payload with the PRODUCTION routing context (objectKey=employeeAbsence)', () => {
      // Mirrors DynamicFormDisplay.tsx: the form renders the `employeeAbsence` slice, so
      // applyUiOverridesToArguments is called with { sourceType: 'flow', objectKey: 'employeeAbsence' }.
      const args = {
        flow: {
          employeeId: 'emp-123',
          employeeAbsence: {
            startDate: '2026-09-10',
            endDate: '2026-09-20',
            typeRef: 'WRONG'
          }
        }
      }

      const overrides = {
        event: { omit: true, fixed: { value: 'pse_submit' } },
        flowType: { hidden: true, fixed: { value: 'vacation' } },
        'employeeDetails.userId': { hidden: true, fixed: { source: 'employeeId' } },
        startDate: { hidden: true, fixed: { source: 'employeeAbsence.startDate' } },
        endDate: { hidden: true, fixed: { source: 'employeeAbsence.endDate' } },
        'employeeAbsence.typeRef': { hidden: true, fixed: { value: 'AbsenceType:v1:A001' } }
      }

      const next = applyUiOverridesToArguments(args, overrides, {
        sourceType: 'flow',
        objectKey: 'employeeAbsence'
      })

      expect(next.flow).toEqual({
        employeeId: 'emp-123',
        event: 'pse_submit',
        flowType: 'vacation',
        startDate: '2026-09-10',
        endDate: '2026-09-20',
        employeeDetails: { userId: 'emp-123' },
        employeeAbsence: {
          startDate: '2026-09-10',
          endDate: '2026-09-20',
          typeRef: 'AbsenceType:v1:A001'
        }
      })
    })
  })
})
