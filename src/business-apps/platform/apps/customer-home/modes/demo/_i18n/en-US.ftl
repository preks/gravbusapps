# Greeting
greeting-morning = Good morning
greeting-afternoon = Good afternoon
greeting-evening = Good evening
greeting-subtitle = What do you want to get done today?

# AI Command Bar
ai-bar-title = EveryAI
ai-bar-subtitle = Ask anything, start workflows, get insights
ai-bar-new-chat = New chat
ai-bar-placeholder = Ask Every AI... e.g. "approve my team's expenses"
ai-bar-load-older = Load older messages

# Priorities Panel
priorities-title = Today's Priorities
priorities-approvals = { $count ->
  [one] { $count } approval pending
 *[other] { $count } approvals pending
}
priorities-tasks = { $count ->
  [one] { $count } task due today
 *[other] { $count } tasks due today
}
priorities-overdue = { $count ->
  [one] { $count } overdue task
 *[other] { $count } overdue tasks
}
priorities-team-absent = { $count ->
  [one] { $count } team member absent today
 *[other] { $count } team members absent today
}
priorities-birthdays = { $count ->
  [one] { $count } upcoming birthday
 *[other] { $count } upcoming birthdays
}
priorities-expense-tasks = { $count ->
  [one] { $count } expense needs attention
 *[other] { $count } expenses need attention
}
priorities-expense-pending = { $count ->
  [one] { $count } expense pending
 *[other] { $count } expenses pending
}
priorities-empty = You're all caught up!
priorities-action-review = Review
priorities-action-approve = Approve
priorities-action-view = View

# Side Panels
panel-absent-title = Absent Team Members
panel-absent-subtitle = Team members currently absent today
panel-absent-days = { $count ->
  [one] { $count } day
 *[other] { $count } days
}
panel-absent-day = day
panel-absent-days-label = days
panel-absent-no-records = No absence records found.
panel-absent-empty = No team members are absent today.
panel-absent-error = Could not load absence history.
panel-birthdays-title = Upcoming Birthdays
panel-birthdays-subtitle = Birthdays coming up in your team
panel-birthday-today = Today!
panel-birthday-in-days = { $count ->
  [one] in { $count } day
 *[other] in { $count } days
}
panel-birthday-days-ago = { $count ->
  [one] { $count } day ago
 *[other] { $count } days ago
}
panel-birthdays-empty = No upcoming birthdays.

# What's New Section
whats-new-title = What's New
whats-new-view-all = View all
whats-new-latest-news = Latest News
whats-new-joiners = New & Upcoming Joiners
whats-new-say-welcome = Say Welcome
whats-new-empty = Nothing new this week
whats-new-joiners-error = Could not load new joiners
joiner-joins-on = Joins on { $date }
joiner-joins-on-org = Joins on { $date } in { $orgUnit }
joiner-joined-on = Joined on { $date }
joiner-joined-on-org = Joined on { $date } in { $orgUnit }
welcome-message = Welcome to the team, { $name }! Great to have you here. Let me know if you need anything!
welcome-sent = Welcome message sent to { $name }
welcome-already-sent = You've already written to { $name }.
welcome-go-to-chat = Chat
welcome-error = Unable to send welcome message

# Work Pulse
pulse-title = Work Pulse
pulse-subtitle = Your personal work metrics
pulse-vacation-balance = Vacation Balance
pulse-vacation-of-total = days available
pulse-vacation-used-of-total = days used
pulse-expense-status = Expenses
pulse-expense-pending-payout = awaiting payout
pulse-expense-pending = pending
pulse-service-requests = Service Requests
pulse-service-open = open
pulse-team-performance = Team Goals
pulse-team-goals-progress = average progress
pulse-open-positions = Open Positions
pulse-open-roles = unfilled roles

# AI Insights
ai-insights-title = AI Insights
ai-insights-subtitle = AI-powered team recommendations
ai-insights-refresh = Refresh insights
ai-insights-ask-more = Ask AI for more
ai-insights-ask-more-prompt = What else should I focus on today? Give me insights about my team and work.

# Quick Actions
quick-actions-title = Quick Actions
action-request-leave = Request Leave
action-submit-expense = Submit Expense
action-open-everybox = Open EveryBox
action-ask-ai = Ask AI
action-approve-requests = Approve Requests
action-team-absences = Team Absences
action-start-flow = Start FLOW
action-orgchart = OrgChart

# App Spaces
spaces-title = My Apps
spaces-hr = HR+
spaces-expenses = Expenses+
spaces-orgchart = MAP OrgChart
spaces-services = Services+
spaces-sales = Sales+
spaces-documents = Documents
