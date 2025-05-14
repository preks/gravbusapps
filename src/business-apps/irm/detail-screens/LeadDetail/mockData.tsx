import { LeadRating } from "./types";

export const mockDataProps = {
  lead: {
    id: "1",
    name: "Dr. John Doe",
    email: "newlead@email.com",
    phone: "+49 123456789",
    company: "Solomon & Co",
    position: "Sales Representative",
    source: "Marketing",
    rating: LeadRating.WARM,
    owner: "Samantha Gomez",
    creationDate: "19/02/2025",
    avatarUrl: "https://i.pravatar.cc/300?img=8",
  },
  statusHistory: [
    { id: 1, name: "Status 1", completed: true },
    { id: 2, name: "Status 2", completed: true },
    { id: 3, name: "Status 3", completed: true },
    { id: 4, name: "Status 4", completed: true },
    { id: 5, name: "Status 5", completed: true },
    { id: 6, name: "Status 6", completed: false },
  ],
  activities: [
    {
      id: "1",
      type: "note" as const,
      content:
        "I will call them again next week, feels like there is no point in trying now.",
      date: "January 27, 2024",
      time: "14:24",
      note: "Sixth (Dakian Week)",
    },
    {
      id: "2",
      type: "call" as const,
      content: "Called several times but he did not pick up.",
      date: "January 27, 2024",
      time: "14:26",
      note: "Sixth (Dakian Week)",
    },
    {
      id: "3",
      type: "email" as const,
      content: "Sent them an email to request to schedule a call.",
      date: "January 27, 2024",
      time: "14:28",
      note: "Sixth (Dakian Week)",
    },
    {
      id: "4",
      type: "rating" as const,
      content: "Rating: Cold → Warm",
      date: "January 27, 2024",
      time: "14:30",
      note: "Sixth (Dakian Week)",
    },
    {
      id: "5",
      type: "position" as const,
      content: "Position: Undefined → Sales Representative",
      date: "January 27, 2024",
      time: "14:32",
      note: "Sixth (Dakian Week)",
    },
  ],
  tasks: [
    {
      id: "1",
      type: "task" as const,
      title: "Prepare a proposal",
      reporter: "Sarah Johnson",
      priority: "High" as const,
      dueDate: "29/02/2025",
      note: "We need to draft the proposal for HM Jobs, follow the template shared with you before.",
    },
    {
      id: "2",
      type: "reminder" as const,
      title: "Call Mr. Doe",
      reporter: "Bob Smith",
      priority: "Medium" as const,
      dueDate: "29/02/2025",
      note: "Don't forget to call this lead to let them know that you will share the proposal via email.",
    },
  ],
  documentsContent: (
    <div style={{ padding: 16 }}>
      <h3>Documents</h3>
      <ul>
        <li>Proposal.pdf</li>
        <li>Requirements.docx</li>
        <li>Contract_Draft.pdf</li>
      </ul>
    </div>
  ),
  labels: {
    // Lead information fields
    nameLabel: "Full Name",
    emailLabel: "Email Address",
    phoneLabel: "Contact Number",
    companyLabel: "Organization",
    positionLabel: "Job Title",

    // Tab labels
    overviewTabLabel: "Summary",
    companyTabLabel: "Organization Details",
    documentsTabLabel: "Files",

    // Activity timeline labels
    activityTimelineTitle: "Activity History",
    activityInputPlaceholder: "Add a note...",
    activityUserInfo: "Account Manager",

    // Tasks and reminders labels
    tasksAndRemindersTitle: "To-Do List",
    activeTabLabel: "Pending",
    completedTabLabel: "Finished",
    taskPrefix: "Action:",
    reminderPrefix: "Alert:",

    // Empty state messages
    noCompanyInfoMessage: "Organization information not yet available",
    noDocumentsMessage: "No files uploaded yet",
  },
  companyContent: (
    <div style={{ padding: 16 }}>
      <h3>Company Information</h3>
      <p>
        Solomon & Co is a leading provider of enterprise software solutions.
      </p>
      <h4>Company Details</h4>
      <ul>
        <li>Founded: 2010</li>
        <li>Employees: 250+</li>
        <li>Industry: Technology</li>
        <li>Website: www.solomonco.example.com</li>
      </ul>
    </div>
  ),
};
