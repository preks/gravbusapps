import type { ExportFieldDefinition } from '../types/exportFieldTypes'
import { formatExportText, formatOwnerEmployee } from './exportFormatHelpers'

type EntityWithId = { id?: string | null }
type EntityWithCode = { code?: string | null }
type EntityWithOwner = { ownerEmployeeId?: string | null; ownerEmployee?: { id?: string | null } | null }
type EntityWithUserId = { userId?: string | null }
type EntityWithInvestmentId = { investmentId?: string | null }

function formatRecordId(entity: EntityWithId): string {
  return formatExportText(entity.id ?? undefined)
}

function formatEntityCode(entity: EntityWithCode): string {
  return formatExportText(entity.code)
}

function formatOwnerEmployeeId(entity: EntityWithOwner): string {
  return formatExportText(entity.ownerEmployeeId ?? entity.ownerEmployee?.id ?? undefined)
}

function formatPortalUserId(entity: EntityWithUserId): string {
  return formatExportText(entity.userId)
}

function formatInvestmentId(entity: EntityWithInvestmentId): string {
  return formatExportText(entity.investmentId ?? undefined)
}

function externalIdField<TEntity>(
  key: string,
  label: string,
  format: (entity: TEntity) => string,
  formKeys: string[] = []
): ExportFieldDefinition<TEntity> {
  return {
    key,
    label,
    formKeys,
    defaultSelected: false,
    exportIdKind: 'external',
    format
  }
}

export function buildRecordIdExportField<T extends EntityWithId>(label = 'Record ID'): ExportFieldDefinition<T> {
  return externalIdField('id', label, formatRecordId)
}

export function buildCodeExportField<T extends EntityWithCode>(label = 'Code'): ExportFieldDefinition<T> {
  return externalIdField('code', label, formatEntityCode, ['code'])
}

export function buildOwnerEmployeeIdExportField<T extends EntityWithOwner>(
  label = 'Owner ID'
): ExportFieldDefinition<T> {
  return externalIdField('ownerEmployeeId', label, formatOwnerEmployeeId, ['ownerEmployeeId'])
}

export function buildPortalUserIdExportField<T extends EntityWithUserId>(
  label = 'Portal User ID'
): ExportFieldDefinition<T> {
  return externalIdField('userId', label, formatPortalUserId, ['userId'])
}

export function buildInvestmentIdExportField<T extends EntityWithInvestmentId>(
  label = 'Investment ID'
): ExportFieldDefinition<T> {
  return externalIdField('investmentId', label, formatInvestmentId, ['investmentId'])
}

/** Ensures owner name export does not leak raw IDs when nested employee is present. */
export function formatOwnerEmployeeSafe(entity: EntityWithOwner): string {
  return formatOwnerEmployee(entity.ownerEmployee)
}
