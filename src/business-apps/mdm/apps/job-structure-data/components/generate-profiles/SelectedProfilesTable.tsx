import { Badge, Input } from '@newwork/nw-design-system'
import { ProfileCombination } from './useGenerateProfiles'

interface SelectedProfilesTableProps {
  combinations: ProfileCombination[]
  validationErrors: Map<string, string>
  onUpdateTitle: (pairKey: string, title: string) => void
  makePairKey: (functionId: string, levelId: string) => string
  dataTestId?: string
}

export default function SelectedProfilesTable({
  combinations,
  validationErrors,
  onUpdateTitle,
  makePairKey,
  dataTestId
}: Readonly<SelectedProfilesTableProps>) {
  if (combinations.length === 0) {
    return (
      <div className="gba:text-center gba:py-6 gba:text-sm gba:text-muted-foreground">
        Select combinations from the matrix above to preview the profiles that will be created.
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-3">
      <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">
        Profiles to create ({combinations.length})
      </p>

      <div className="gba:overflow-auto gba:max-h-[220px] gba:border gba:rounded-md">
        <table className="gba:w-full gba:border-collapse gba:text-sm" data-testid={`${dataTestId}-preview`}>
          <thead className="gba:sticky gba:top-0 gba:z-10 gba:bg-muted">
            <tr>
              <th className="gba:border-b gba:p-2 gba:text-left gba:font-medium">Function</th>
              <th className="gba:border-b gba:p-2 gba:text-left gba:font-medium">Level</th>
              <th className="gba:border-b gba:p-2 gba:text-left gba:font-medium gba:min-w-[250px]">Name / Title</th>
              <th className="gba:border-b gba:p-2 gba:text-left gba:font-medium">Code</th>
            </tr>
          </thead>
          <tbody>
            {combinations.map(combo => {
              const pairKey = makePairKey(combo.functionId, combo.levelId)
              const codeError = validationErrors.get(combo.code)
              const nameError = validationErrors.get(pairKey)
              const hasError = !!codeError || !!nameError

              return (
                <tr key={pairKey} className={hasError ? 'gba:bg-destructive/10' : 'gba:hover:bg-muted/50'}>
                  <td className="gba:border-b gba:p-2">
                    <span className="gba:text-xs">{combo.functionName}</span>
                  </td>
                  <td className="gba:border-b gba:p-2">
                    <span className="gba:text-xs">{combo.levelName}</span>
                  </td>
                  <td className="gba:border-b gba:p-2">
                    <div className="gba:flex gba:flex-col gba:gap-0.5">
                      <Input
                        value={combo.suggestedTitle}
                        onChange={e => onUpdateTitle(pairKey, e.target.value)}
                        className={`gba:h-8 gba:text-xs ${nameError ? 'gba:border-destructive' : ''}`}
                        data-testid={`${dataTestId}-title-${combo.code}`}
                      />
                      {nameError && <span className="gba:text-[10px] gba:text-destructive">{nameError}</span>}
                    </div>
                  </td>
                  <td className="gba:border-b gba:p-2">
                    <Badge variant={codeError ? 'destructive' : 'info'}>{combo.code}</Badge>
                    {codeError && (
                      <span className="gba:text-[10px] gba:text-destructive gba:block gba:mt-0.5">{codeError}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
