export const AgentTypingIndicator = () => (
  <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5" data-testid="enterprise-agent-thinking">
    <div className="gba:flex gba:items-center gba:gap-1 gba:bg-muted gba:rounded-2xl gba:px-3 gba:py-2">
      <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-muted-foreground/60 gba:animate-pulse" />
      <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-muted-foreground/45 gba:animate-pulse" />
      <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-muted-foreground/30 gba:animate-pulse" />
    </div>
    <span className="gba:text-xs gba:text-muted-foreground">Agent is working…</span>
  </div>
)
