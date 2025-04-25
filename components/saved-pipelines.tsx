"use client"

import { useState } from "react"
import { X, Trash2, FileBox, Clock, Search, Calendar, ArrowUpDown, Edit2, Download, Check } from "lucide-react"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { Badge } from "@/components/ui/badge"
import type { PipelineData } from "@/components/pipeline-builder"
import { cn } from "@/lib/utils"

interface SavedPipelinesProps {
  pipelines: PipelineData[]
  onLoad: (pipeline: PipelineData) => void
  onDelete: (id: string) => void
  onClose: () => void
  onEdit?: (pipeline: PipelineData) => void
  onExport?: (pipeline: PipelineData) => void
}

type SortBy = "name" | "date" | "nodes"

export const SavedPipelines = ({
  pipelines,
  onLoad,
  onDelete,
  onClose,
  onEdit,
  onExport,
}: SavedPipelinesProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([])

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc")
  }

  const changeSortBy = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      toggleSortDirection()
    } else {
      setSortBy(newSortBy)
      setSortDirection("desc") // Default to descending order when changing sort field
    }
  }

  const filteredPipelines = pipelines
    .filter(
      (pipeline) =>
        pipeline.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pipeline.description && pipeline.description.toLowerCase().includes(searchQuery.toLowerCase())),
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      } else if (sortBy === "nodes") {
        return sortDirection === "asc" ? a.nodes.length - b.nodes.length : b.nodes.length - a.nodes.length
      } else {
        const dateA = a.lastSaved ? new Date(a.lastSaved).getTime() : 0
        const dateB = b.lastSaved ? new Date(b.lastSaved).getTime() : 0
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA
      }
    })

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString()
  }

  const handlePipelineClick = (pipeline: PipelineData) => {
    if (isMultiSelect) {
      if (selectedPipelines.includes(pipeline.id)) {
        setSelectedPipelines(selectedPipelines.filter((id) => id !== pipeline.id))
      } else {
        setSelectedPipelines([...selectedPipelines, pipeline.id])
      }
    } else {
      onLoad(pipeline)
    }
  }

  const handleBulkDelete = () => {
    selectedPipelines.forEach((id) => onDelete(id))
    setSelectedPipelines([])
  }

  const toggleMultiSelectMode = () => {
    if (isMultiSelect) {
      setSelectedPipelines([])
    }
    setIsMultiSelect(!isMultiSelect)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Saved Pipelines</CardTitle>
            <CardDescription>Your collection of ML pipelines</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={toggleMultiSelectMode}>
              {isMultiSelect ? "Multi-Select On" : "Multi-Select Off"}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="px-6 pb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pipelines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => changeSortBy("name")}
                  className={cn(sortBy === "name" && "bg-muted")}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sort by name {sortBy === "name" ? (sortDirection === "asc" ? "(A-Z)" : "(Z-A)") : ""}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => changeSortBy("date")}
                  className={cn(sortBy === "date" && "bg-muted")}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Sort by date{" "}
                  {sortBy === "date" ? (sortDirection === "asc" ? "(oldest first)" : "(newest first)") : ""}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => changeSortBy("nodes")}
                  className={cn(sortBy === "nodes" && "bg-muted")}
                >
                  <FileBox className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Sort by node count {sortBy === "nodes" ? (sortDirection === "asc" ? "(fewest to most)" : "(most to fewest)") : ""}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isMultiSelect && selectedPipelines.length > 0 && (
          <div className="px-6 pb-3 flex items-center gap-2">
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete Selected
            </Button>
            <Button variant="outline" onClick={() => setSelectedPipelines([])}>
              Clear Selection
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 px-6">
          {filteredPipelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileBox className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">No pipelines found</h3>
              <p className="text-muted-foreground mt-1 mb-6 max-w-md">
                {searchQuery
                  ? "No pipelines match your search query. Try a different search term."
                  : "You haven't saved any pipelines yet. Create a pipeline and save it to see it here."}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
              {filteredPipelines.map((pipeline) => (
                <Card
                  key={pipeline.id}
                  className={cn(
                    "overflow-hidden transition-all hover:shadow-md cursor-pointer group relative",
                    isMultiSelect && selectedPipelines.includes(pipeline.id) ? "border-2 border-primary" : ""
                  )}
                  onClick={() => handlePipelineClick(pipeline)}
                >
                  {isMultiSelect && (
                    <div className="absolute top-2 left-2">
                      {selectedPipelines.includes(pipeline.id) ? (
                        <Check className="h-5 w-5 text-primary" />
                      ) : (
                        <div className="h-5 w-5 border rounded" />
                      )}
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base truncate" title={pipeline.name}>
                        {pipeline.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        {onEdit && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEdit(pipeline)
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit pipeline</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {onExport && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-accent/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onExport(pipeline)
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Export pipeline</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete pipeline</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{pipeline.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => onDelete(pipeline.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {pipeline.description && (
                      <CardDescription className="line-clamp-2 h-10">{pipeline.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardFooter className="flex justify-between border-t p-3 text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {pipeline.lastSaved ? formatDate(pipeline.lastSaved) : "Not saved"}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {pipeline.nodes.length} nodes
                    </Badge>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <CardFooter className="border-t p-4 flex justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredPipelines.length} {filteredPipelines.length === 1 ? "pipeline" : "pipelines"}
          </div>
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
