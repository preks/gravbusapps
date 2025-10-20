export interface SalesArea {
  id: string
  title: string
  description: string
  icon: any // PhosphorIcon component
  category: string
  buttonLabel?: string
  links?: Array<{
    label: string
    action: string
  }>
}

export interface SalesQuickAction {
  id: string
  label: string
  icon: any // PhosphorIcon component
  action: string
}
