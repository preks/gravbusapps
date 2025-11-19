import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Separator
} from '@newwork/nw-design-system'
import { ActionOption } from '@newwork/nw-design-system'
import { Plus, Pencil, Trash } from '@phosphor-icons/react'

/**
 * Comprehensive AppAction Component Example
 * Demonstrates all variants, modes, and configuration options
 */
const AppActionExample: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context
  const [clickedAction, setClickedAction] = useState<string>('')

  // Real data from GraphQL API
  const realLeads = [
    {
      id: '86383c87-25a2-4895-94cd-5bd197ed53b5',
      name: 'Alex Mustermann',
      company: 'Spiegel Online',
      status: 'Active'
    },
    { id: 'fe5b9253-00f3-497e-9e5d-6683a6b38fec', name: 'Anna Jas', company: 'anna_jas', status: 'Active' },
    { id: '36d67f47-f614-4823-84a2-d64f3e5d0d8a', name: 'TechNetworks Lead', company: 'TechNetworks', status: 'Lost' }
  ]

  const realAccounts = [
    { id: 'f8c7538c-fa80-463f-bc2f-cfefbe1e288d', name: 'ACME Test 87a903', industry: 'Technology' },
    {
      id: '8edb7520-fe1e-412a-8073-e322201adc6c',
      name: 'Agriculture Account',
      industry: 'Agriculture, forestry and fishing'
    }
  ]

  const realContacts = [
    { id: 'add3660b-2f5d-4349-951a-8aef38d8f0ed', name: 'Paul Miller', company: 'NovaEnterprises' },
    { id: '41fe1337-89b4-474d-b051-58d47d8ee2fd', name: 'Elena Martinez', company: 'NovaSystems' }
  ]

  const realOpportunities = [
    { id: '7ea2ae2a-11c4-4472-b57c-e46171e00a4b', name: 'IBM New System', account: 'IBM' },
    { id: '85bca51e-b2ea-4e67-b30d-2e604bed235a', name: 'Headless Commerce Initiative', account: 'NextCorp dsf' }
  ]

  const realEmployees = [
    { id: '96682d63-4103-4bc3-b8da-6ab973df5770', name: 'Joseph Cabral' },
    { id: 'bad07a2b-26e2-4b72-8ea4-03cbd703ae6d', name: 'cineva eFrier' }
  ]

  const realJobPositions = [
    { id: '2a9f4864-27ea-4fd4-b063-8df5469392d2', name: 'Primitor distribuitor marfa' },
    { id: '03d5c8ac-548f-456f-8952-912d40fd4442', name: 'Lucrator comercial' }
  ]

  const realInvestments = [
    { id: 'f9cef046-ebaa-470d-a0c0-0243cf385626', name: 'AlphaTech GmbH', type: 'Technology' },
    { id: '60000000-0000-0000-0000-000000000009', name: 'Ionis AI Seed', type: 'Pharma' }
  ]

  // Static flow data example
  const staticActions: ActionOption[] = [
    {
      key: 'action-1',
      label: 'Static Action 1',
      onClick: () => setClickedAction('Static Action 1 clicked')
    },
    {
      key: 'action-2',
      label: 'Static Action 2',
      onClick: () => setClickedAction('Static Action 2 clicked')
    },
    {
      key: 'action-3',
      label: 'Static Action 3',
      onClick: () => setClickedAction('Static Action 3 clicked')
    }
  ]

  return (
    <div className="gba:p-8 gba:space-y-8">
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:mb-2">AppAction Component Examples</h1>
        <p className="gba:text-muted-foreground">
          Comprehensive examples showcasing all variants, modes, and configuration options
        </p>
        {clickedAction && (
          <div className="gba:mt-4 gba:p-4 gba:bg-success-secondary gba:text-success-secondary-foreground gba:rounded-md">
            <strong>Action Triggered:</strong> {clickedAction}
            <Button variant="ghost" size="sm" onClick={() => setClickedAction('')} className="gba:ml-4">
              Clear
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* ============================================ */}
      {/* Pre-configured Variants */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>1. Pre-configured Variants</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          {/* Table Row Actions */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Table Row Actions</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Used in table rows with lazy loading - shows dropdown menu with actions
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="gba:w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realLeads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.name}</TableCell>
                    <TableCell>{lead.company}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{lead.status}</Badge>
                    </TableCell>
                    <TableCell className="gba:w-[60px]">
                      <AppAction
                        variant="table-row"
                        contextsArray={[FlowContextName.customerLeadEntity]}
                        externalContextData={{ leadId: lead.id }}
                        accessToken={accessToken}
                        data-testid={`table-row-action-${lead.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* List Item Actions */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">List Item Actions</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Used in lists with lazy loading - shows dropdown menu with actions
            </p>
            <div className="gba:space-y-2">
              {realAccounts.map(account => (
                <div
                  key={account.id}
                  className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border gba:rounded-md"
                >
                  <div>
                    <p className="gba:font-medium">{account.name}</p>
                    <p className="gba:text-sm gba:text-muted-foreground">{account.industry}</p>
                  </div>
                  <AppAction
                    variant="list-item"
                    contextsArray={[FlowContextName.customerAccountEntity]}
                    externalContextData={{ accountId: account.id }}
                    accessToken={accessToken}
                    data-testid={`list-item-action-${account.id}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Header Action */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Header Action</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Used in page headers - shows dropdown menu with actions
            </p>
            <div className="gba:flex gba:justify-between gba:items-center gba:p-4 gba:bg-muted gba:rounded-md">
              <div>
                <h4 className="gba:font-semibold">Lead Record Header</h4>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {realLeads[0].name} - {realLeads[0].company}
                </p>
              </div>
              <AppAction
                variant="header"
                contextsArray={[FlowContextName.customerLeadEntity]}
                externalContextData={{ leadId: realLeads[0].id }}
                accessToken={accessToken}
                data-testid="header-action"
              />
            </div>
          </div>

          <Separator />

          {/* Create Actions */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Create Actions</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Primary and secondary create buttons with auto-execute on click
            </p>
            <div className="gba:flex gba:gap-4 gba:flex-wrap">
              <AppAction
                variant="create-primary"
                contextsArray={[FlowContextName.customerLeadCreate]}
                accessToken={accessToken}
                data-testid="create-primary"
              >
                Create Lead (Primary)
              </AppAction>

              <AppAction
                variant="create-secondary"
                contextsArray={[FlowContextName.customerAccountCreate]}
                accessToken={accessToken}
                data-testid="create-secondary"
              />
            </div>
          </div>

          <Separator />

          {/* Update Actions */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Update Actions</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Primary and secondary update buttons - auto-execute first action on click
            </p>
            <div className="gba:flex gba:gap-4 gba:flex-wrap">
              <AppAction
                variant="update-primary"
                contextsArray={[FlowContextName.customerAccountUpdate]}
                externalContextData={{ accountId: realAccounts[0].id }}
                accessToken={accessToken}
                data-testid="update-primary"
              >
                Update Account
              </AppAction>

              <AppAction
                variant="update-secondary"
                contextsArray={[FlowContextName.customerLeadEntity]}
                externalContextData={{ leadId: realLeads[0].id }}
                accessToken={accessToken}
                data-testid="update-secondary"
              />
            </div>
          </div>

          <Separator />

          {/* Delete Actions */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Delete Actions</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Destructive buttons - auto-execute first delete action on click
            </p>
            <div className="gba:flex gba:gap-4 gba:flex-wrap">
              <AppAction
                variant="delete-primary"
                contextsArray={[FlowContextName.customerActivityDelete]}
                externalContextData={{ activityId: realLeads[2].id }}
                accessToken={accessToken}
                data-testid="delete-primary"
              >
                Delete Activity
              </AppAction>

              <AppAction
                variant="delete-secondary"
                contextsArray={[FlowContextName.customerNoteDelete]}
                externalContextData={{ noteId: realLeads[1].id }}
                accessToken={accessToken}
                data-testid="delete-secondary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* New Contexts API */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>2. New Contexts API (Array with contextData)</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          {/* Single Context with Single Data */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Single Context with Single Data</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              New API: contexts array with context name and contextData array
            </p>
            <AppAction
              variant="create-primary"
              contexts={[
                {
                  context: FlowContextName.customerLeadCreate,
                  contextData: {}
                }
              ]}
              accessToken={accessToken}
              data-testid="new-api-single"
            >
              Create Lead (New API)
            </AppAction>
          </div>

          <Separator />

          {/* Single Context with Multiple Data */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Update with Entity Context</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Update button using entity context (shows available update actions)
            </p>
            <AppAction
              variant="update-primary"
              contexts={[
                {
                  context: FlowContextName.customerAccountUpdate,
                  contextData: { accountId: realAccounts[0].id }
                }
              ]}
              accessToken={accessToken}
              data-testid="new-api-multiple-data"
            >
              Update Account
            </AppAction>
          </div>

          <Separator />

          {/* Multiple Contexts */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Multiple Create Contexts</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">Pass different create contexts together</p>
            <AppAction
              variant="create-primary"
              contexts={[
                {
                  context: FlowContextName.customerLeadCreate,
                  contextData: {}
                },
                {
                  context: FlowContextName.customerAccountCreate,
                  contextData: {}
                }
              ]}
              accessToken={accessToken}
              data-testid="new-api-multiple-contexts"
            >
              Create Lead or Account
            </AppAction>
          </div>

          <Separator />

          {/* Complex: Multiple Contexts with Merged Data */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Multiple Contexts with Merged Data</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Most flexible configuration - each context can have merged data objects
            </p>
            <AppAction
              variant="table-row"
              contexts={[
                {
                  context: FlowContextName.customerLeadEntity,
                  contextData: { leadId: realLeads[0].id, leadId2: realLeads[1].id }
                },
                {
                  context: FlowContextName.customerAccountEntity,
                  contextData: { accountId: realAccounts[0].id }
                },
                {
                  context: FlowContextName.customerContactEntity,
                  contextData: { contactId: realContacts[0].id, contactId2: realContacts[1].id }
                }
              ]}
              accessToken={accessToken}
              data-testid="new-api-complex"
            />
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Custom Mode Examples */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>3. Custom Modes (Full Control)</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          {/* Trigger Mode */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Trigger Mode</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Wraps any element to execute first action on click
            </p>
            <AppAction
              variant="custom"
              mode="trigger"
              contextsArray={[FlowContextName.customerLeadEntity]}
              externalContextData={{ leadId: realLeads[0].id }}
              accessToken={accessToken}
              data-testid="trigger-mode"
            >
              <Button variant="outline">Click me to trigger action</Button>
            </AppAction>
          </div>

          <Separator />

          {/* Trigger Mode with Lazy Load (Pipeline/Steps Pattern) */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Trigger Mode with Lazy Load (Pipeline Steps)</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Pattern used in IRM & CRM Opportunity Records - each step is clickable with lazy loaded actions
            </p>
            <div className="gba:space-y-4">
              {/* Pipeline Steps Example */}
              <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:bg-muted gba:rounded-md">
                {/* Step 1 - Qualification */}
                <AppAction
                  variant="custom"
                  mode="trigger"
                  lazyLoad={true}
                  contextsArray={[FlowContextName.customerOpportunityEntity]}
                  externalContextData={{ opportunityId: realOpportunities[0].id, targetStage: 'Qualification' }}
                  accessToken={accessToken}
                  data-testid="pipeline-step-qualification"
                >
                  <div className="gba:flex-1 gba:p-3 gba:bg-primary gba:text-primary-foreground gba:rounded-md gba:cursor-pointer gba:transition-colors hover:gba:bg-primary/80">
                    <div className="gba:text-sm gba:font-medium">Qualification</div>
                    <div className="gba:text-xs gba:opacity-80">Click to transition</div>
                  </div>
                </AppAction>

                <div className="gba:h-0.5 gba:w-8 gba:bg-border" />

                {/* Step 2 - Needs Analysis */}
                <AppAction
                  variant="custom"
                  mode="trigger"
                  lazyLoad={true}
                  contextsArray={[FlowContextName.customerOpportunityEntity]}
                  externalContextData={{ opportunityId: realOpportunities[0].id, targetStage: 'Needs Analysis' }}
                  accessToken={accessToken}
                  data-testid="pipeline-step-needs-analysis"
                >
                  <div className="gba:flex-1 gba:p-3 gba:bg-muted-foreground gba:text-muted gba:rounded-md gba:cursor-pointer gba:transition-colors hover:gba:bg-muted-foreground/80">
                    <div className="gba:text-sm gba:font-medium">Needs Analysis</div>
                    <div className="gba:text-xs gba:opacity-80">Click to transition</div>
                  </div>
                </AppAction>

                <div className="gba:h-0.5 gba:w-8 gba:bg-border" />

                {/* Step 3 - Proposal */}
                <AppAction
                  variant="custom"
                  mode="trigger"
                  lazyLoad={true}
                  contextsArray={[FlowContextName.customerOpportunityEntity]}
                  externalContextData={{ opportunityId: realOpportunities[0].id, targetStage: 'Proposal' }}
                  accessToken={accessToken}
                  data-testid="pipeline-step-proposal"
                >
                  <div className="gba:flex-1 gba:p-3 gba:bg-muted-foreground gba:text-muted gba:rounded-md gba:cursor-pointer gba:transition-colors hover:gba:bg-muted-foreground/80">
                    <div className="gba:text-sm gba:font-medium">Proposal</div>
                    <div className="gba:text-xs gba:opacity-80">Click to transition</div>
                  </div>
                </AppAction>

                <div className="gba:h-0.5 gba:w-8 gba:bg-border" />

                {/* Step 4 - Negotiation */}
                <AppAction
                  variant="custom"
                  mode="trigger"
                  lazyLoad={true}
                  contextsArray={[FlowContextName.customerOpportunityEntity]}
                  externalContextData={{ opportunityId: realOpportunities[0].id, targetStage: 'Negotiation' }}
                  accessToken={accessToken}
                  data-testid="pipeline-step-negotiation"
                >
                  <div className="gba:flex-1 gba:p-3 gba:bg-muted-foreground gba:text-muted gba:rounded-md gba:cursor-pointer gba:transition-colors hover:gba:bg-muted-foreground/80">
                    <div className="gba:text-sm gba:font-medium">Negotiation</div>
                    <div className="gba:text-xs gba:opacity-80">Click to transition</div>
                  </div>
                </AppAction>

                <div className="gba:h-0.5 gba:w-8 gba:bg-border" />

                {/* Step 5 - Closed Won */}
                <AppAction
                  variant="custom"
                  mode="trigger"
                  lazyLoad={true}
                  contextsArray={[FlowContextName.customerOpportunityEntity]}
                  externalContextData={{ opportunityId: realOpportunities[0].id, targetStage: 'Closed Won' }}
                  accessToken={accessToken}
                  data-testid="pipeline-step-closed-won"
                >
                  <div className="gba:flex-1 gba:p-3 gba:bg-muted-foreground gba:text-muted gba:rounded-md gba:cursor-pointer gba:transition-colors hover:gba:bg-muted-foreground/80">
                    <div className="gba:text-sm gba:font-medium">Closed Won</div>
                    <div className="gba:text-xs gba:opacity-80">Click to transition</div>
                  </div>
                </AppAction>
              </div>

              <div className="gba:text-sm gba:text-muted-foreground gba:bg-info-secondary gba:text-info-secondary-foreground gba:p-3 gba:rounded-md">
                <strong>Pattern Explanation:</strong> Each step uses <code>mode="trigger"</code> with{' '}
                <code>lazyLoad={'{true}'}</code>. Actions are only fetched when the step is clicked, reducing initial
                load time. This pattern is used in Opportunity Pipeline progression in both IRM and CRM modules.
              </div>
            </div>
          </div>

          <Separator />

          {/* Button Mode */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Button Mode</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Normal button that executes first action or shows menu
            </p>
            <div className="gba:flex gba:gap-4 gba:flex-wrap">
              <AppAction
                variant="custom"
                mode="button"
                buttonSize="default"
                buttonVariant="default"
                contextsArray={[FlowContextName.customerLeadCreate]}
                accessToken={accessToken}
                data-testid="button-default"
              >
                <Plus size={16} className="gba:mr-2" />
                Create Lead
              </AppAction>

              <AppAction
                variant="custom"
                mode="button"
                buttonSize="default"
                buttonVariant="secondary"
                contextsArray={[FlowContextName.customerAccountEntity]}
                externalContextData={{ accountId: realAccounts[0].id }}
                accessToken={accessToken}
                data-testid="button-secondary"
              >
                <Pencil size={16} className="gba:mr-2" />
                Update
              </AppAction>

              <AppAction
                variant="custom"
                mode="button"
                buttonSize="default"
                buttonVariant="destructive"
                contextsArray={[FlowContextName.customerLeadEntity]}
                externalContextData={{ leadId: realLeads[2].id }}
                accessToken={accessToken}
                data-testid="button-destructive"
              >
                <Trash size={16} className="gba:mr-2" />
                Delete
              </AppAction>

              <AppAction
                variant="custom"
                mode="button"
                buttonSize="icon"
                buttonVariant="ghost"
                contextsArray={[FlowContextName.customerLeadEntity]}
                externalContextData={{ leadId: realLeads[0].id }}
                accessToken={accessToken}
                data-testid="button-icon-ghost"
              >
                <Pencil size={16} />
              </AppAction>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Behavior Options */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>4. Behavior Options</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          {/* Lazy Loading */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Lazy Loading</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Defers data loading until user interaction (emptyState auto-set to 'enable')
            </p>
            <div className="gba:flex gba:gap-4">
              <AppAction
                variant="custom"
                mode="button"
                lazyLoad={true}
                buttonVariant="outline"
                contextsArray={[FlowContextName.customerLeadEntity]}
                externalContextData={{ leadId: realLeads[0].id }}
                accessToken={accessToken}
                data-testid="lazy-load"
              >
                Click to Load Actions (Lazy)
              </AppAction>

              <AppAction
                variant="custom"
                mode="button"
                lazyLoad={false}
                buttonVariant="outline"
                contextsArray={[FlowContextName.customerLeadEntity]}
                externalContextData={{ leadId: realLeads[0].id }}
                accessToken={accessToken}
                data-testid="eager-load"
              >
                Actions Loaded Immediately
              </AppAction>
            </div>
          </div>

          <Separator />

          {/* Auto Execute */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Auto Execute</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Automatically executes when only one action available, shows menu for multiple
            </p>
            <div className="gba:flex gba:gap-4">
              <AppAction
                variant="custom"
                mode="button"
                autoExecute={true}
                buttonVariant="default"
                contextsArray={[FlowContextName.customerLeadCreate]}
                accessToken={accessToken}
                data-testid="auto-execute"
              >
                Auto Execute Single Action
              </AppAction>

              <AppAction
                variant="custom"
                mode="button"
                autoExecute={false}
                buttonVariant="secondary"
                contextsArray={[FlowContextName.customerLeadEntity]}
                externalContextData={{ leadId: realLeads[0].id }}
                accessToken={accessToken}
                data-testid="no-auto-execute"
              >
                Always Show Menu
              </AppAction>
            </div>
          </div>

          <Separator />

          {/* Empty State Behavior */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Empty State Behavior</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Controls visibility/state when no actions are available
            </p>
            <div className="gba:flex gba:gap-4 gba:flex-wrap">
              <AppAction
                variant="custom"
                mode="button"
                emptyState="disable"
                buttonVariant="outline"
                staticFlowData={[]}
                accessToken={accessToken}
                data-testid="empty-disable"
              >
                Disabled (no actions)
              </AppAction>

              <AppAction
                variant="custom"
                mode="button"
                emptyState="enable"
                buttonVariant="outline"
                staticFlowData={[]}
                accessToken={accessToken}
                data-testid="empty-enable"
              >
                Enabled (no actions)
              </AppAction>

              <div className="gba:p-4 gba:border gba:rounded gba:bg-muted">
                <p className="gba:text-sm gba:mb-2">Hidden when no actions:</p>
                <AppAction
                  variant="custom"
                  mode="button"
                  emptyState="hide"
                  buttonVariant="outline"
                  staticFlowData={[]}
                  accessToken={accessToken}
                  data-testid="empty-hide"
                >
                  This button is hidden
                </AppAction>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Static Flow Data */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>5. Static Flow Data</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Custom Static Actions</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Provide custom actions without context/API calls
            </p>
            <div className="gba:flex gba:gap-4">
              <AppAction
                variant="custom"
                mode="button"
                staticFlowData={staticActions}
                accessToken={accessToken}
                data-testid="static-actions"
              >
                Static Actions Menu
              </AppAction>

              <AppAction
                variant="custom"
                mode="button"
                autoExecute={true}
                staticFlowData={[staticActions[0]]}
                accessToken={accessToken}
                data-testid="static-single"
              >
                Single Static Action (Auto Execute)
              </AppAction>
            </div>
          </div>

          <Separator />

          {/* Mixed: Static + Context Data */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Combined: Static + Context Actions</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Merge static actions with context-based actions
            </p>
            <AppAction
              variant="custom"
              mode="button"
              staticFlowData={staticActions}
              contextsArray={[FlowContextName.customerLeadEntity]}
              externalContextData={{ leadId: realLeads[0].id }}
              accessToken={accessToken}
              data-testid="mixed-actions"
            >
              Combined Actions
            </AppAction>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Different Context Types */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>6. Different Context Types</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          {/* CRM Contexts */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">CRM Contexts</h3>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Customer Lead</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.customerLeadEntity]}
                  externalContextData={{ leadId: realLeads[0].id }}
                  accessToken={accessToken}
                  data-testid="context-lead"
                >
                  {realLeads[0].name}
                </AppAction>
              </div>

              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Customer Account</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.customerAccountEntity]}
                  externalContextData={{ accountId: realAccounts[0].id }}
                  accessToken={accessToken}
                  data-testid="context-account"
                >
                  {realAccounts[0].name}
                </AppAction>
              </div>

              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Customer Contact</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.customerContactEntity]}
                  externalContextData={{ contactId: realContacts[0].id }}
                  accessToken={accessToken}
                  data-testid="context-contact"
                >
                  {realContacts[0].name}
                </AppAction>
              </div>

              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Customer Opportunity</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.customerOpportunityEntity]}
                  externalContextData={{ opportunityId: realOpportunities[0].id }}
                  accessToken={accessToken}
                  data-testid="context-opportunity"
                >
                  {realOpportunities[0].name}
                </AppAction>
              </div>
            </div>
          </div>

          <Separator />

          {/* HR Contexts */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">HR Contexts</h3>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Employee</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.employeeEntity]}
                  externalContextData={{ employeeId: realEmployees[0].id }}
                  accessToken={accessToken}
                  data-testid="context-employee"
                >
                  {realEmployees[0].name}
                </AppAction>
              </div>

              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Job Position</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.jobPositionEntity]}
                  externalContextData={{ jobPositionId: realJobPositions[0].id }}
                  accessToken={accessToken}
                  data-testid="context-job-position"
                >
                  {realJobPositions[0].name}
                </AppAction>
              </div>

              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Asset</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.assetEntity]}
                  externalContextData={{ assetId: realLeads[0].id }}
                  accessToken={accessToken}
                  data-testid="context-asset"
                >
                  Asset Example (No assets in DB)
                </AppAction>
              </div>
            </div>
          </div>

          <Separator />

          {/* Investment Contexts */}
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Investment Contexts</h3>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Investment Lead</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.investmentLeadEntity]}
                  externalContextData={{ investmentLeadId: realLeads[0].id }}
                  accessToken={accessToken}
                  data-testid="context-investment-lead"
                >
                  Investment Lead Example
                </AppAction>
              </div>

              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Investment Account</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.investmentAccountEntity]}
                  externalContextData={{ investmentAccountId: realAccounts[0].id }}
                  accessToken={accessToken}
                  data-testid="context-investment-account"
                >
                  Investment Account Example
                </AppAction>
              </div>

              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Investment Entity</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.investmentEntity]}
                  externalContextData={{ investmentId: realInvestments[0].id }}
                  accessToken={accessToken}
                  data-testid="context-investment"
                >
                  {realInvestments[0].name}
                </AppAction>
              </div>

              <div>
                <p className="gba:text-sm gba:font-medium gba:mb-2">Equity Investment</p>
                <AppAction
                  variant="update-primary"
                  contextsArray={[FlowContextName.equityInvestmentEntity]}
                  externalContextData={{ investmentId: realInvestments[1].id }}
                  accessToken={accessToken}
                  data-testid="context-equity-investment"
                >
                  {realInvestments[1].name}
                </AppAction>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Legacy API (Backward Compatibility) */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>7. Legacy API (Backward Compatibility)</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Old contextsArray API</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">Still supported for backward compatibility</p>
            <div className="gba:flex gba:gap-4">
              <AppAction
                variant="update-primary"
                contextsArray={[FlowContextName.customerLeadEntity]}
                externalContextData={{ leadId: realLeads[0].id }}
                accessToken={accessToken}
                data-testid="legacy-api"
              >
                Legacy API (Still Works)
              </AppAction>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AppActionExample
