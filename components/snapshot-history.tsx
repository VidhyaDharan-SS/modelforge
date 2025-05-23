"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  X, 
  Trash2, 
  Clock, 
  GitBranch, 
  History, 
  Check, 
  UploadCloud, 
  Plus, 
  Info, 
  Download, 
  Copy, 
  Edit,
  Share2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { PipelineSnapshot } from "@/components/pipeline-builder"

interface SnapshotHistoryProps {
  snapshots: PipelineSnapshot[]
  onCreateSnapshot: (name?: string) => void
  onLoadSnapshot: (snapshot: PipelineSnapshot) => void
  onDeleteSnapshot: (timestamp: Date) => void
  onClose: () => void
  // New enhanced features:
  onDuplicateSnapshot?: (snapshot: PipelineSnapshot) => void
  onRenameSnapshot?: (timestamp: Date, newName: string) => void
}

export const SnapshotHistory = ({
  snapshots,
  onCreateSnapshot,
  onLoadSnapshot,
  onDeleteSnapshot,
  onClose,
  onDuplicateSnapshot,
  onRenameSnapshot,
}: SnapshotHistoryProps) => {
  const [snapshotName, setSnapshotName] = useState("")
  const [filterText, setFilterText] = useState("")
  const [debouncedFilter, setDebouncedFilter] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "nodes" | "edges" | "name">("newest")
  const [selectedSnapshot, setSelectedSnapshot] = useState<PipelineSnapshot | null>(null)
  const [previewSnapshot, setPreviewSnapshot] = useState<PipelineSnapshot | null>(null)
  const [renameModalData, setRenameModalData] = useState<{ snapshot: PipelineSnapshot; newName: string } | null>(null)

  // New states for bulk mode and selections for bulk actions
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set())
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDuplicateModalOpen, setBulkDuplicateModalOpen] = useState(false)

  // Debounce the filter text input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilter(filterText)
    }, 300)
    return () => {
      clearTimeout(handler)
    }
  }, [filterText])

  const handleCreateSnapshot = () => {
    onCreateSnapshot(snapshotName || undefined)
    setSnapshotName("") // Clear input after creation
  }

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    })
  }

  const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    let interval = seconds / 31536000
    if (interval > 1) return Math.floor(interval) + " years ago"
    interval = seconds / 2592000
    if (interval > 1) return Math.floor(interval) + " months ago"
    interval = seconds / 86400
    if (interval > 1) return Math.floor(interval) + " days ago"
    interval = seconds / 3600
    if (interval > 1) return Math.floor(interval) + " hours ago"
    interval = seconds / 60
    if (interval > 1) return Math.floor(interval) + " minutes ago"
    return "Just now"
  }

  // Filter and sort snapshots based on filter text and sort order
  const processedSnapshots = useMemo(() => {
    let filtered = snapshots.filter((snapshot) => {
      if (!debouncedFilter) return true
      const name = snapshot.name || formatTimestamp(snapshot.timestamp)
      return name.toLowerCase().includes(debouncedFilter.toLowerCase())
    })

    if (sortOrder === "newest") {
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } else if (sortOrder === "oldest") {
      filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    } else if (sortOrder === "nodes") {
      filtered.sort((a, b) => b.nodes.length - a.nodes.length)
    } else if (sortOrder === "edges") {
      filtered.sort((a, b) => b.edges.length - a.edges.length)
    } else if (sortOrder === "name") {
      filtered.sort((a, b) => {
        const nameA = a.name || formatTimestamp(a.timestamp)
        const nameB = b.name || formatTimestamp(b.timestamp)
        return nameA.localeCompare(nameB)
      })
    }
    return filtered
  }, [snapshots, debouncedFilter, sortOrder])

  // Downloads a single snapshot's details as JSON.
  const handleDownloadSnapshot = (snapshot: PipelineSnapshot) => {
    const dataStr = JSON.stringify(snapshot, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `snapshot-${new Date(snapshot.timestamp).toISOString()}.json`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Downloads all snapshots as JSON
  const handleExportAllSnapshots = () => {
    const dataStr = JSON.stringify(snapshots, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    const now = new Date().toISOString()
    link.href = url
    link.download = `all-snapshots-${now}.json`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Exports snapshot summary as CSV.
  const handleExportCSV = () => {
    const header = "Name,Timestamp,Nodes,Edges\n"
    const rows = processedSnapshots.map(snapshot => {
      const name = snapshot.name ? `"${snapshot.name}"` : `"${formatTimestamp(snapshot.timestamp)}"`
      const time = formatTimestamp(snapshot.timestamp)
      return `${name},${time},${snapshot.nodes.length},${snapshot.edges.length}`
    }).join("\n")
    const csvContent = header + rows
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `snapshots-${new Date().toISOString()}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Duplicate snapshot if callback provided
  const handleDuplicateSnapshot = (snapshot: PipelineSnapshot) => {
    if (onDuplicateSnapshot) {
      onDuplicateSnapshot(snapshot)
    }
  }

  // Bulk duplicate: duplicate all selected snapshots.
  const confirmBulkDuplication = () => {
    processedSnapshots.forEach((snapshot) => {
      if (selectedBulk.has(snapshot.timestamp.toISOString()) && onDuplicateSnapshot) {
        onDuplicateSnapshot(snapshot)
      }
    })
    setSelectedBulk(new Set())
    setIsBulkMode(false)
    setBulkDuplicateModalOpen(false)
  }

  // Share snapshot: copy JSON detail to clipboard.
  const handleShareSnapshot = async (snapshot: PipelineSnapshot) => {
    const dataStr = JSON.stringify(snapshot, null, 2)
    try {
      await navigator.clipboard.writeText(dataStr)
      // You can later integrate a toast for user feedback.
      alert("Snapshot details copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy snapshot details:", error)
      alert("Failed to copy snapshot details.")
    }
  }

  // Handle renaming: open modal dialog
  const openRenameModal = (snapshot: PipelineSnapshot) => {
    setRenameModalData({ snapshot, newName: snapshot.name || "" })
  }

  const submitRename = () => {
    if (renameModalData && onRenameSnapshot) {
      onRenameSnapshot(renameModalData.snapshot.timestamp, renameModalData.newName)
      setRenameModalData(null)
    }
  }

  // Toggle snapshot selection for bulk deletion/duplication
  const toggleBulkSelection = (timestamp: string) => {
    const updatedSelection = new Set(selectedBulk)
    if (updatedSelection.has(timestamp)) {
      updatedSelection.delete(timestamp)
    } else {
      updatedSelection.add(timestamp)
    }
    setSelectedBulk(updatedSelection)
  }

  // Confirm bulk deletion: call onDeleteSnapshot for each selected snapshot
  const confirmBulkDeletion = () => {
    processedSnapshots.forEach((snapshot) => {
      if (selectedBulk.has(snapshot.timestamp.toISOString())) {
        onDeleteSnapshot(snapshot.timestamp)
      }
    })
    // Clear bulk selection and turn off bulk mode after deletion
    setSelectedBulk(new Set())
    setIsBulkMode(false)
    setBulkDeleteModalOpen(false)
  }

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-xl">Pipeline History</CardTitle>
                <CardDescription>Snapshots of your pipeline over time</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsBulkMode(!isBulkMode)}>
                {isBulkMode ? <Check className="h-4 w-4" /> : <ClipboardIcon />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-4 pt-4 overflow-hidden">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Optional snapshot name..."
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                />
                <Button onClick={handleCreateSnapshot} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create Snapshot
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  placeholder="Filter snapshots..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="max-w-xs"
                />
                {filterText && (
                  <Button variant="ghost" size="sm" onClick={() => setFilterText("")}>
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}
                <select
                  className="border rounded p-1"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest" | "nodes" | "edges" | "name")}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="nodes">Most Nodes</option>
                  <option value="edges">Most Edges</option>
                  <option value="name">Alphabetical</option>
                </select>
              </div>
            </div>

            <Separator />

            <ScrollArea className="flex-1 -mx-6 px-6">
              {processedSnapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <GitBranch className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">No Snapshots Yet</h3>
                  <p className="text-muted-foreground mt-1 mb-6 max-w-md">
                    Create snapshots to save versions of your pipeline as you work.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pb-6">
                  {processedSnapshots.map((snapshot) => {
                    const snapshotKey = snapshot.timestamp.toISOString()
                    return (
                      <div
                        key={snapshotKey}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isBulkMode && (
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={selectedBulk.has(snapshotKey)}
                              onChange={() => toggleBulkSelection(snapshotKey)}
                            />
                          )}
                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex flex-col">
                            <span
                              className="text-sm font-medium truncate"
                              title={snapshot.name || formatTimestamp(snapshot.timestamp)}
                            >
                              {snapshot.name || formatTimestamp(snapshot.timestamp)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {snapshot.name ? formatTimestamp(snapshot.timestamp) : timeAgo(snapshot.timestamp)}
                              {` (Nodes: ${snapshot.nodes.length}, Edges: ${snapshot.edges.length})`}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
                          {/* Load Snapshot */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-1.5">
                                    <UploadCloud className="h-3.5 w-3.5" /> Load
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Load the snapshot to update your current pipeline</TooltipContent>
                              </Tooltip>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Load Snapshot?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will replace your current pipeline with the state from this snapshot (
                                  {formatTimestamp(snapshot.timestamp)}). Unsaved changes will be lost.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onLoadSnapshot(snapshot)}>
                                  Load Snapshot
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {/* Duplicate Snapshot */}
                          {onDuplicateSnapshot && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-1.5"
                                  onClick={() => handleDuplicateSnapshot(snapshot)}
                                >
                                  <Copy className="h-3.5 w-3.5" /> Duplicate
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Duplicate the snapshot</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Rename Snapshot */}
                          {onRenameSnapshot && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-1.5"
                                  onClick={() => openRenameModal(snapshot)}
                                >
                                  <Edit className="h-3.5 w-3.5" /> Rename
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Rename the snapshot</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Preview Snapshot */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-1.5"
                                onClick={() => setPreviewSnapshot(snapshot)}
                              >
                                <Info className="h-3.5 w-3.5" /> Preview
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview snapshot details with nodes and edges</TooltipContent>
                          </Tooltip>

                          {/* Share Snapshot */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleShareSnapshot(snapshot)}>
                                <Share2 className="h-3.5 w-3.5" /> Share
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy snapshot details to clipboard</TooltipContent>
                          </Tooltip>

                          {/* Delete Snapshot */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete snapshot</TooltipContent>
                              </Tooltip>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Snapshot?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the snapshot from {formatTimestamp(snapshot.timestamp)}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => onDeleteSnapshot(snapshot.timestamp)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {/* Snapshot Details */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-1.5"
                                    onClick={() => setSelectedSnapshot(snapshot)}
                                  >
                                    <Info className="h-3.5 w-3.5" /> Details
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View basic details about this snapshot</TooltipContent>
                              </Tooltip>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Snapshot Details</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <div className="text-sm">
                                    <p>
                                      <span className="font-semibold">Name:</span> {snapshot.name || "N/A"}
                                    </p>
                                    <p>
                                      <span className="font-semibold">Timestamp:</span> {formatTimestamp(snapshot.timestamp)}
                                    </p>
                                    <p>
                                      <span className="font-semibold">Nodes:</span> {snapshot.nodes.length}
                                    </p>
                                    <p>
                                      <span className="font-semibold">Edges:</span> {snapshot.edges.length}
                                    </p>
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Close</AlertDialogCancel>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {/* Download Snapshot */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => handleDownloadSnapshot(snapshot)}>
                                <Download className="h-3.5 w-3.5" /> Download
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download snapshot details as JSON</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>

          <CardFooter className="border-t p-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {processedSnapshots.length} {processedSnapshots.length === 1 ? "snapshot" : "snapshots"} stored
            </div>
            <div className="flex gap-2">
              {isBulkMode && selectedBulk.size > 0 && (
                <>
                  {onDuplicateSnapshot && (
                    <AlertDialog open={bulkDuplicateModalOpen} onOpenChange={setBulkDuplicateModalOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Copy className="h-3.5 w-3.5" /> Duplicate Selected ({selectedBulk.size})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Duplicate Selected Snapshots?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to duplicate {selectedBulk.size} selected snapshot{selectedBulk.size > 1 && "s"}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={confirmBulkDuplication}
                          >
                            Duplicate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1.5">
                        <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedBulk.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Snapshots?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedBulk.size} selected snapshot{selectedBulk.size > 1 && "s"}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={confirmBulkDeletion}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {!isBulkMode && (
                <>
                  <Button variant="outline" size="sm" onClick={handleExportAllSnapshots}>
                    Export All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    Export CSV
                  </Button>
                </>
              )}
              {isBulkMode && (
                <Button variant="default" size="sm" onClick={() => { setIsBulkMode(false); setSelectedBulk(new Set()) }}>
                  Exit Bulk Mode
                </Button>
              )}
              <Button variant="default" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Rename Snapshot Modal */}
      {renameModalData && (
        <AlertDialog open onOpenChange={() => setRenameModalData(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rename Snapshot</AlertDialogTitle>
              <AlertDialogDescription>
                Provide a new name for the snapshot taken at {formatTimestamp(renameModalData.snapshot.timestamp)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="p-4">
              <Input
                placeholder="Enter new snapshot name..."
                value={renameModalData.newName}
                onChange={(e) => setRenameModalData({ ...renameModalData, newName: e.target.value })}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRenameModalData(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={submitRename} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Rename
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Preview Snapshot Modal */}
      {previewSnapshot && (
        <AlertDialog open onOpenChange={() => setPreviewSnapshot(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Snapshot Preview</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="text-sm">
                  <p>
                    <span className="font-semibold">Name:</span> {previewSnapshot.name || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Timestamp:</span> {formatTimestamp(previewSnapshot.timestamp)}
                  </p>
                  <p>
                    <span className="font-semibold">Nodes ({previewSnapshot.nodes.length}):</span> {previewSnapshot.nodes.join(", ")}
                  </p>
                  <p>
                    <span className="font-semibold">Edges ({previewSnapshot.edges.length}):</span> {previewSnapshot.edges.join(", ")}
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </TooltipProvider>
  )
}

// A placeholder component for when Bulk Mode is off.
// You can replace this with an actual icon if desired.
const ClipboardIcon = () => (
  <svg width="16" height="16" fill="currentColor" className="text-muted-foreground">
    <path d="M10 1H6a1 1 0 00-1 1v1H3.5A1.5 1.5 0 002 4.5v9A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0012.5 3H11V2a1 1 0 00-1-1zM7 2h2v1H7V2zm5 13h-9a.5.5 0 01-.5-.5v-9A.5.5 0 013.5 5H5v1a1 1 0 002 0V5h2v1a1 1 0 002 0V5h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5z"/>
  </svg>
)
