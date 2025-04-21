"use client"

import { useState } from "react"
import { X, Trash2, Clock, GitBranch, History, Check, UploadCloud, Plus } from "lucide-react"
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
}

export const SnapshotHistory = ({
  snapshots,
  onCreateSnapshot,
  onLoadSnapshot,
  onDeleteSnapshot,
  onClose,
}: SnapshotHistoryProps) => {
  const [snapshotName, setSnapshotName] = useState("")

  const handleCreateSnapshot = () => {
    onCreateSnapshot(snapshotName || undefined)
    setSnapshotName("") // Clear input after creation
  }

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
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

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl">Pipeline History</CardTitle>
              <CardDescription>Snapshots of your pipeline over time</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4 pt-4 overflow-hidden">
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

          <Separator />

          <ScrollArea className="flex-1 -mx-6 px-6">
            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No Snapshots Yet</h3>
                <p className="text-muted-foreground mt-1 mb-6 max-w-md">
                  Create snapshots to save versions of your pipeline as you work.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {snapshots.map((snapshot) => (
                  <div key={snapshot.timestamp.toISOString()} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate" title={snapshot.name || formatTimestamp(snapshot.timestamp)}>
                          {snapshot.name || formatTimestamp(snapshot.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {snapshot.name ? formatTimestamp(snapshot.timestamp) : timeAgo(snapshot.timestamp)}
                          {` (${snapshot.nodes.length} nodes, ${snapshot.edges.length} edges)`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <UploadCloud className="h-3.5 w-3.5" /> Load
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Load Snapshot?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will replace your current pipeline with the state from this snapshot ({formatTimestamp(snapshot.timestamp)}). Unsaved changes will be lost.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onLoadSnapshot(snapshot)}>Load Snapshot</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t p-4 flex justify-between">
          <div className="text-sm text-muted-foreground">
            {snapshots.length} {snapshots.length === 1 ? "snapshot" : "snapshots"} stored
          </div>
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 