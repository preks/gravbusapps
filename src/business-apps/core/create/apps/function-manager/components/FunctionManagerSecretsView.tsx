import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { tokenHasRole } from '@/common/utils/keycloakTokenRoles'
import { SecretsMigrationPanel } from './SecretsMigrationPanel'
import { SecretsTabPanel } from './editor/SecretsTabPanel'
import { CredentialBundlesPanel } from './CredentialBundlesPanel'
import { useTenantSecrets } from '../hooks/useTenantSecrets'

export interface FunctionManagerSecretsViewProps {
  accessToken: string
}

export const FunctionManagerSecretsView: React.FC<FunctionManagerSecretsViewProps> = ({ accessToken }) => {
  const { storedSecrets, refreshSecrets, onCreateStoredSecret, updateDisplayName, appendSecretValue, deleteSecret } =
    useTenantSecrets(accessToken)
  /** Plaintext→refs migration is tenant-admin; Credentials list/CRUD uses apps-creator at API (Function Manager tab matches that). */
  const showMigration = tokenHasRole(accessToken, 'functions-secrets-manager')

  return (
    <div className="gba:space-y-6 gba:w-full gba:max-w-4xl gba:mx-auto" data-testid="FunctionManager-credentials-view">
      {showMigration ? <SecretsMigrationPanel accessToken={accessToken} /> : null}
      <Tabs defaultValue="bundles" className="gba:w-full">
        <TabsList className="gba:w-full gba:max-w-md gba:justify-start">
          <TabsTrigger value="bundles" data-testid="FunctionManager-credentials-tab-bundles">
            Credential bundles
          </TabsTrigger>
          <TabsTrigger value="credentials" data-testid="FunctionManager-credentials-tab-credentials">
            Credentials
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bundles" className="gba:mt-6 gba:outline-none">
          <CredentialBundlesPanel accessToken={accessToken} onMutation={refreshSecrets} />
        </TabsContent>
        <TabsContent value="credentials" className="gba:mt-6 gba:outline-none">
          <SecretsTabPanel
            secrets={storedSecrets}
            onRefreshSecrets={refreshSecrets}
            onCreateStoredSecret={onCreateStoredSecret}
            onUpdateDisplayName={updateDisplayName}
            onAppendSecretValue={appendSecretValue}
            onDeleteSecret={deleteSecret}
            data-testid="FunctionManager-credentials-panel"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
