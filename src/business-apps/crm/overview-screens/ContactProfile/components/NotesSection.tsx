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
    <Card className="gba:rounded-xl gba:shadow-sm gba:md:col-span-2 gba:border-gray-300">
      <CardHeader className="gba:border-b gba:border-gray-300 gba:pb-3">
        <CardTitle>Notes & Insights</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-6 gba:pt-4">
        {/* Key Insights Panel */}
        <div className="gba:relative gba:p-[2px] gba:rounded-lg gba:bg-gradient-to-r gba:from-blue-500 gba:via-indigo-500 gba:to-purple-500">
          <div className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-sky-50 gba:rounded-lg gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <div className="gba:bg-gradient-to-r gba:from-blue-500 gba:to-purple-500 gba:p-1.5 gba:rounded-full">
                <Lightbulb className="gba:h-4 gba:w-4 gba:text-white" />
              </div>
              <h3 className="gba:font-medium gba:text-blue-800">AI-Generated Key Insights</h3>
            </div>
            <ul className="gba:list-disc gba:pl-5 gba:space-y-1 gba:text-sm gba:text-blue-900">
              <li>Interested in analytics platform, requested demo</li>
              <li>Evaluating new solutions in Q1 2024</li>
              <li>Concerned about security compliance</li>
              <li>Budget constraints - fiscal year ends March</li>
            </ul>
          </div>
        </div>

        {/* Add a Note Area */}
        <div className="gba:space-y-4">
          <Textarea
            placeholder="Add a note about this contact..."
            className="gba:min-h-[100px] gba:w-full gba:border-gray-300 gba:focus-visible:ring-blue-500"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <div className="gba:flex gba:flex-col gba:sm:flex-row gba:justify-between gba:gap-4">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Switch
                id="important-note"
                checked={isImportant}
                onCheckedChange={setIsImportant}
                className="gba:data-[state=checked]:bg-blue-600"
              />
              <label htmlFor="important-note" className="gba:text-sm gba:font-medium">
                Mark as Important
              </label>
            </div>
            <Button className="gba:rounded-md gba:bg-blue-600 gba:hover:bg-blue-700" onClick={handleAddNote}>
              Add Note
            </Button>
          </div>
        </div>

        <Separator className="gba:bg-blue-100" />

        {/* Notes List with Filtering/Sorting */}
        <div className="gba:space-y-4">
          <div className="gba:flex gba:flex-col gba:sm:flex-row gba:justify-between gba:items-start gba:sm:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Switch
                id="important-only"
                checked={showImportantOnly}
                onCheckedChange={setShowImportantOnly}
                className="gba:data-[state=checked]:bg-blue-600"
              />
              <label htmlFor="important-only" className="gba:text-sm gba:font-medium">
                Show important only
              </label>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="gba:w-[140px] gba:border-gray-300 gba:focus:ring-blue-500">
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
          <div className="gba:space-y-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`gba:p-4 gba:border gba:rounded-lg ${
                  note.important ? "gba:border-blue-200 gba:bg-gradient-to-r gba:from-blue-50 gba:to-sky-50" : "gba:border-gray-300"
                }`}
              >
                <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:relative gba:w-10 gba:h-10 gba:rounded-full gba:overflow-hidden gba:border-2 gba:border-white gba:shadow-sm">
                      <img
                        src={`https://randomuser.me/api/portraits/${note.author === "Sarah Johnson" ? "women/45" : note.author === "Michael Chen" ? "men/32" : note.author === "David Rodriguez" ? "men/68" : "women/22"}.jpg`}
                        alt={note.author}
                        className="gba:object-cover gba:w-full gba:h-full"
                      />
                    </div>
                    <div>
                      <p className="gba:font-medium">{note.author}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">{formatRelativeTime(note.date)}</p>
                    </div>
                  </div>
                  {/* Voting UI */}
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:flex gba:items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-8 gba:w-8 gba:text-blue-700 gba:hover:text-blue-800 gba:hover:bg-blue-50"
                        onClick={() => handleUpvote(note.id)}
                      >
                        <ThumbsUp className="gba:h-4 gba:w-4" />
                      </Button>
                      <span className="gba:text-xs gba:font-medium">{note.upvotes}</span>
                    </div>
                    <div className="gba:flex gba:items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-8 gba:w-8 gba:text-blue-700 gba:hover:text-blue-800 gba:hover:bg-blue-50"
                        onClick={() => handleDownvote(note.id)}
                      >
                        <ThumbsDown className="gba:h-4 gba:w-4" />
                      </Button>
                      <span className="gba:text-xs gba:font-medium">{note.downvotes}</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="gba:h-8 gba:w-8 gba:text-blue-700 gba:hover:text-blue-800 gba:hover:bg-blue-50"
                            onClick={() => toggleImportance(note.id)}
                          >
                            <Flag
                              className={`gba:h-4 gba:w-4 ${
                                note.important ? "gba:fill-blue-500 gba:text-blue-500" : "text-muted-foreground"
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
                          className="gba:h-8 gba:w-8 gba:text-blue-700 gba:hover:text-blue-800 gba:hover:bg-blue-50"
                        >
                          <MoreHorizontal className="gba:h-4 gba:w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteNote(note.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="gba:text-sm gba:leading-relaxed gba:mt-2">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
