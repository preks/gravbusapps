# EveryAI - Premium AI Assistant

**The most advanced AI-powered assistant for NEWWORK ERP Platform**

---

## 🌟 Overview

EveryAI is a stunning, premium AI assistant that transforms how users interact with the NEWWORK platform. Powered by FlowBot's advanced AI backend, it provides intelligent assistance with beautiful, modern UI and cutting-edge features.

## ✨ Key Features

### 🚀 **Intelligent Conversations**

- Real-time AI responses with streaming
- Context-aware assistance
- Persistent conversation history
- Multi-turn dialogue support

### 🎨 **Premium Design**

- Beautiful gradient accents
- Smooth animations and transitions
- Glowing effects on hover
- Modern, sleek interface
- Professional yet engaging

### 📊 **Rich Data Visualization**

- Interactive tables with hover effects
- Gradient bar charts
- Scatter plots
- Calendar views
- File previews

### 🎯 **Context Awareness**

- Automatic page/entity detection
- Smart pre-chat suggestions
- Entity-specific responses
- Workflow integration

### 📁 **Advanced File Handling**

- Drag & drop upload
- Multiple file support (5 files, 100MB)
- Document analysis
- PDF, Excel, Word support

### 🔗 **Entity Integration**

- Rich entity cards with GraphQL data
- Clickable entity chips (@mentions)
- Manager information display
- Operation tracking (create/update/delete)

---

## 🎯 What Makes EveryAI Awesome

1. **AI-First Design** - Built from the ground up for AI interactions
2. **Visual Excellence** - Gradients, animations, and modern styling
3. **Intelligent Automation** - Automates workflows and tasks
4. **Context Awareness** - Knows what you're working on
5. **Rich Outputs** - 11 different output types beautifully rendered
6. **Entity Support** - 12 entity types with full GraphQL integration
7. **Link Support** - 10 entity link chip types for seamless navigation

---

## 🚀 Quick Start

### Publishing

```bash
# Publish to DEV
npm run publish:screen -- /platform/apps/every-ai

# Publish to PROD
npm run publish:screen -- /platform/apps/every-ai -r
```

### Usage

```typescript
import { EveryAI } from '@/business-apps/platform/apps/every-ai'

function MyApp(props: BusinessAppContextProps) {
  return <EveryAI {...props} />
}
```

---

## 💎 Premium Features

### **Stunning Visual Design**

- ✨ Gradient backgrounds and accents
- ✨ Smooth hover animations
- ✨ Glowing effects on interactive elements
- ✨ Modern glassmorphism effects
- ✨ Professional color palette

### **Smart Interactions**

- 🎯 Context-aware suggestions
- 🎯 One-click question insertion
- 🎯 Web search toggle with visual feedback
- 🎯 Keyboard shortcuts (Enter to send)
- 🎯 File drag & drop

### **Rich Entity Display**

- 📇 Employee cards with avatars and manager info
- 📇 Lead/Contact cards with GraphQL data
- 📇 Opportunity cards with amounts
- 📇 Company cards with details
- 📇 Expense cards with currency formatting
- 📇 Absence cards with duration
- 📇 Service ticket cards
- 📇 Note and document cards

### **Beautiful Outputs**

- 📊 Premium tables with hover effects
- 📊 Gradient bar charts
- 📊 Calendar views
- 📊 Scatter plots
- 📊 File downloads
- 📊 Dynamic forms with validation

---

## 🔧 Technical Stack

### Dependencies

- `@newwork/nw-design-system` - Premium UI components
- `react` - React framework
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `uuid` - Unique identifiers

### Architecture

- **FlowBot Integration**: SSE streaming for real-time AI
- **GraphQL**: Entity data fetching
- **LocalStorage**: Session persistence
- **Context Detection**: Automatic page/entity detection

---

## 🎨 Design Philosophy

**Modern • Sleek • Professional • Engaging**

EveryAI combines:

- **Premium aesthetics** - Gradients, shadows, animations
- **Professional design** - Clean, organized, accessible
- **Modern UX** - Smooth transitions, hover effects
- **AI-themed branding** - Lightning bolt icon, "AI Powered" badge

---

## 📈 Use Cases

1. **Quick Questions** - "Show me today's opportunities"
2. **Data Analysis** - "Analyze Q4 sales performance"
3. **Task Automation** - "Create a new lead for Acme Corp"
4. **Document Processing** - Upload files for AI analysis
5. **Workflow Execution** - Start and complete business processes
6. **Entity Exploration** - Get insights about employees, leads, etc.

---

## 🎯 What Users Will Love

✨ **Instant Answers** - Lightning-fast AI responses  
✨ **Beautiful Interface** - Premium design that delights  
✨ **Smart Suggestions** - Context-aware help  
✨ **Rich Visualizations** - Data comes alive  
✨ **Seamless Integration** - Works across the platform  
✨ **Persistent Memory** - Never lose conversation history

---

## 🔒 Security & Compliance

- ✅ Bearer token authentication
- ✅ Input sanitization
- ✅ File validation (size, type, count)
- ✅ Session isolation
- ✅ Secure API communication

---

## 📚 Documentation

- `README.md` - This file
- `CAPABILITIES.md` - Complete feature reference
- `STATUS.md` - Implementation status
- `COMPLETE.md` - Feature checklist
- `IMPLEMENTATION_SUMMARY.md` - Technical details

---

## 🌟 The EveryAI Difference

**This isn't just another chat interface - it's a premium, AI-powered command center for your entire ERP system.**

- 🎨 **Visually Stunning** - Gradient designs, animations, modern UI
- 🧠 **Truly Intelligent** - Powered by GPT-4.1 via FlowBot
- ⚡ **Blazing Fast** - Real-time streaming responses
- 🔗 **Deeply Integrated** - Connects to all platform data
- 🎯 **Context-Aware** - Knows where you are and what you need
- 💼 **Professional** - Enterprise-grade quality

---

**Built with ❤️ and ✨ for NEWWORK Platform**

_Your AI-powered ERP companion_
