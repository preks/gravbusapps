import { useState } from "react"
import { Flag, Lightbulb, MoreHorizontal, ThumbsDown, ThumbsUp } from "lucide-react"
import { Button } from "../common/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../common/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../common/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../common/components/ui/select"
import { Separator } from "../common/components/ui/separator"
import { Switch } from "../common/components/ui/switch"
import { Textarea } from "../common/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../common/components/ui/tooltip"

export function NotesSection() {
  const [notes, setNotes] = useState([
    {
      id: 1,
      author: "Sarah Johnson",
      date: "2023-11-15T10:30:00",
      content:
        "Had a productive call discussing the new enterprise solution. Emily showed interest in our analytics platform and requested a follow-up demo next week.",
      important: true,
      upvotes: 3,
      downvotes: 0,
    },
    {
      id: 2,
      author: "Michael Chen",
      date: "2023-11-10T14:45:00",
      content:
        "Met at the industry conference. Emily mentioned her team is evaluating new solutions in Q1 2024. She's particularly concerned about security compliance.",
      important: false,
      upvotes: 1,
      downvotes: 0,
    },
    {
      id: 3,
      author: "David Rodriguez",
      date: "2023-10-28T09:15:00",
      content:
        "Discussed budget constraints. Their fiscal year ends in March, so any deal would need to close before then to use current budget allocation.",
      important: true,
      upvotes: 5,
      downvotes: 0,
    },
  ])

  const [newNote, setNewNote] = useState("")
  const [isImportant, setIsImportant] = useState(false)
  const [sortBy, setSortBy] = useState("date")
  const [showImportantOnly, setShowImportantOnly] = useState(false)

  const handleAddNote = () => {
    if (newNote.trim()) {
      const newNoteObj = {
        id: notes.length + 1,
        author: "You",
        date: new Date().toISOString(),
        content: newNote,
        important: isImportant,
        upvotes: 0,
        downvotes: 0,
      }
      setNotes([newNoteObj, ...notes])
      setNewNote("")
      setIsImportant(false)
    }
  }

  const handleUpvote = (id: number) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, upvotes: note.upvotes + 1 } : note)))
  }

  const handleDownvote = (id: number) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, downvotes: note.downvotes + 1 } : note)))
  }

  const toggleImportance = (id: number) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, important: !note.important } : note)))
  }

  const deleteNote = (id: number) => {
    setNotes(notes.filter((note) => note.id !== id))
  }

  const filteredNotes = notes
    .filter((note) => !showImportantOnly || note.important)
    .sort((a, b) => {
      if (sortBy === "votes") return b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
      if (sortBy === "importance") return Number(b.important) - Number(a.important)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  return (
    <Card className="rounded-xl shadow-sm md:col-span-2 border-gray-300">
      <CardHeader className="border-b border-gray-300 pb-3">
        <CardTitle>Notes & Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Key Insights Panel */}
        <div className="relative p-[2px] rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-1.5 rounded-full">
                <Lightbulb className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-medium text-blue-800">AI-Generated Key Insights</h3>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sm text-blue-900">
              <li>Interested in analytics platform, requested demo</li>
              <li>Evaluating new solutions in Q1 2024</li>
              <li>Concerned about security compliance</li>
              <li>Budget constraints - fiscal year ends March</li>
            </ul>
          </div>
        </div>

        {/* Add a Note Area */}
        <div className="space-y-4">
          <Textarea
            placeholder="Add a note about this contact..."
            className="min-h-[100px] w-full border-gray-300 focus-visible:ring-blue-500"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="important-note"
                checked={isImportant}
                onCheckedChange={setIsImportant}
                className="data-[state=checked]:bg-blue-600"
              />
              <label htmlFor="important-note" className="text-sm font-medium">
                Mark as Important
              </label>
            </div>
            <Button className="rounded-md bg-blue-600 hover:bg-blue-700" onClick={handleAddNote}>
              Add Note
            </Button>
          </div>
        </div>

        <Separator className="bg-blue-100" />

        {/* Notes List with Filtering/Sorting */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="important-only"
                checked={showImportantOnly}
                onCheckedChange={setShowImportantOnly}
                className="data-[state=checked]:bg-blue-600"
              />
              <label htmlFor="important-only" className="text-sm font-medium">
                Show important only
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] border-gray-300 focus:ring-blue-500">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (newest)</SelectItem>
                  <SelectItem value="importance">Importance</SelectItem>
                  <SelectItem value="votes">Votes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes Items */}
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 border rounded-lg ${
                  note.important ? "border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50" : "border-gray-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <img
                        src={`https://randomuser.me/api/portraits/${note.author === "Sarah Johnson" ? "women/45" : note.author === "Michael Chen" ? "men/32" : note.author === "David Rodriguez" ? "men/68" : "women/22"}.jpg`}
                        alt={note.author}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{note.author}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(note.date)}</p>
                    </div>
                  </div>
                  {/* Voting UI */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => handleUpvote(note.id)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-medium">{note.upvotes}</span>
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => handleDownvote(note.id)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-medium">{note.downvotes}</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => toggleImportance(note.id)}
                          >
                            <Flag
                              className={`h-4 w-4 ${
                                note.important ? "fill-blue-500 text-blue-500" : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{note.important ? "Remove importance" : "Mark as important"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteNote(note.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mt-2">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
