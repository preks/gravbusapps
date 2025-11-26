# Development Screen Overrides

Ovaj feature omogućava da lokalno (u developmentu) override-ujete koja forma se prikazuje za određene taskove, bez potrebe da publishujete ili mijenjate screen management konfiguraciju.

## Kako koristiti

### 1. Otvorite konfiguracijski fajl

Otvori `config/dev-screen-overrides.ts` i uključite override feature:

```typescript
export const ENABLE_DEV_SCREEN_OVERRIDES = true
```

### 2. Dodajte override

Dodajte override u `DEV_SCREEN_OVERRIDES` array. Možete override-ovati na tri načina:

#### Override po Task ID (najpreciznije)

```typescript
{
  taskId: 'your-specific-task-id-here',
  componentPath: 'hr/absences/forms/approve-employee-vacation-v2/ApproveEmployeeVacationV2',
  version: 'latest' // opcionalno
}
```

#### Override po Screen Key

```typescript
{
  screenKey: 'frm_approveEmployeeVacationApproveEmployeeVacation',
  componentPath: 'hr/absences/forms/approve-employee-vacation-v2/ApproveEmployeeVacationV2',
}
```

#### Override po Process Name + Task Name (za sve taskove tog tipa)

```typescript
{
  processName: 'approveEmployeeVacation',
  taskName: 'ApproveEmployeeVacation',
  componentPath: 'hr/absences/forms/approve-employee-vacation-v2/ApproveEmployeeVacationV2',
}
```

### 3. Component Path

`componentPath` treba biti putanja do komponente na CDN-u. Format je:

```
{domain}/{app}/{category}/{form-name}/{ComponentName}
```

Primjeri:

- `hr/absences/forms/approve-employee-vacation-v2/ApproveEmployeeVacationV2`
- `fin/expenses/forms/approve-expense-plan/ApproveExpensePlan`

**Napomena:** Komponenta mora biti publishovana na dev CDN (`https://nwcdndevfiles.blob.core.windows.net/screens`). Za lokalno testiranje, prvo publishujte formu na dev CDN.

### 4. Pronađite potrebne informacije

Da biste pronašli potrebne informacije za override:

1. **Task ID**: Otvorite task u browseru i provjerite ID u URL-u ili console log-ovima
2. **Screen Key**: Provjerite u browser console log-ovima kada otvorite task (traži se `frm_...`)
3. **Process Name i Task Name**: Provjerite u `task.sourceMetadata.endpoint` - format je `/processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}`

### 5. Provjerite da radi

Kada otvorite task u developmentu (localhost), provjerite browser console - trebali biste vidjeti:

```
🔧 [DEV] Using screen override: { taskId: '...', screenKey: '...', override: {...} }
```

## Primjer konfiguracije

```typescript
export const DEV_SCREEN_OVERRIDES: DevScreenOverride[] = [
  // Override za specifičan task
  {
    taskId: 'abc123-def456-ghi789',
    componentPath: 'hr/absences/forms/approve-employee-vacation-v2/ApproveEmployeeVacationV2'
  },

  // Override za sve approveEmployeeVacation taskove
  {
    processName: 'approveEmployeeVacation',
    taskName: 'ApproveEmployeeVacation',
    componentPath: 'hr/absences/forms/approve-employee-vacation-v2/ApproveEmployeeVacationV2'
  }
]
```

## Važne napomene

1. **Samo u developmentu**: Override radi samo kada ste na `localhost` ili `127.0.0.1`
2. **CDN Path**: Komponenta mora biti publishovana na dev CDN
3. **Priority**: Task ID > Screen Key > Process Name + Task Name
4. **Ne utječe na production**: Override se automatski ignoriše u production okruženju

## Troubleshooting

### Override se ne primjenjuje

1. Provjerite da je `ENABLE_DEV_SCREEN_OVERRIDES = true`
2. Provjerite da ste na localhost
3. Provjerite da je `componentPath` ispravan i da komponenta postoji na CDN-u
4. Provjerite browser console za greške

### Komponenta se ne učitava

1. Provjerite da je komponenta publishovana na dev CDN
2. Provjerite da je `componentPath` u ispravnom formatu
3. Provjerite browser console za detaljne greške učitavanja
