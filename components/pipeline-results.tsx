"use client"

import { useState, useEffect, useRef } from "react"
import { X, ArrowDown, ArrowUp, Check, AlertTriangle, AlertCircle, BarChart, Loader2, Copy } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { PipelineResult } from "@/components/pipeline-builder"

interface PipelineResultsProps {
  results: PipelineResult[]
  onClose: () => void
  isRunning: boolean
}

export const PipelineResults = ({ results, onClose, isRunning }: PipelineResultsProps) => {
  const [activeTab, setActiveTab] = useState<string>("summary")
  const [sortBy, setSortBy] = useState<"time" | "name">("time")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [filterText, setFilterText] = useState<string>("")
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [refreshIndicator, setRefreshIndicator] = useState<boolean>(false)
  const copyRef = useRef<HTMLButtonElement>(null)

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc")
  }

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === "time") {
      const comparison = a.timestamp.getTime() - b.timestamp.getTime()
      return sortDirection === "asc" ? comparison : -comparison
    } else {
      const comparison = a.nodeName.localeCompare(b.nodeName)
      return sortDirection === "asc" ? comparison : -comparison
    }
  })

  // Filter results based on filterText in details tab
  const filteredResults = sortedResults.filter(result =>
    result.nodeName.toLowerCase().includes(filterText.toLowerCase())
  )

  // Count results by status
  const statusCounts = {
    success: results.filter((r) => r.status === "success").length,
    error: results.filter((r) => r.status === "error").length,
    warning: results.filter((r) => r.status === "warning").length,
  }

  // Average metrics across all nodes
  const averageMetrics: Record<string, number> = {}
  const metricsCount: Record<string, number> = {}

  results.forEach((result) => {
    if (result.metrics) {
      result.metrics.forEach((metric) => {
        if (!averageMetrics[metric.name]) {
          averageMetrics[metric.name] = 0
          metricsCount[metric.name] = 0
        }
        averageMetrics[metric.name] += metric.value
        metricsCount[metric.name]++
      })
    }
  })

  // Calculate averages
  Object.keys(averageMetrics).forEach((key) => {
    if (metricsCount[key] > 0) {
      averageMetrics[key] = Number.parseFloat((averageMetrics[key] / metricsCount[key]).toFixed(4))
    }
  })

  // Auto refresh simulation when autoRefresh is enabled and pipeline is running
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (autoRefresh && isRunning) {
      timer = setInterval(() => {
        setRefreshIndicator(true)
        setTimeout(() => {
          setRefreshIndicator(false)
        }, 300)
      }, 5000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [autoRefresh, isRunning])

  // Export pipeline results functionality
  const handleExport = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "pipeline_results_export.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Copy pipeline results JSON to clipboard
  const handleCopy = async () => {
    const dataStr = JSON.stringify(results, null, 2)
    try {
      await navigator.clipboard.writeText(dataStr)
      if (copyRef.current) {
        copyRef.current.innerText = "Copied!"
        setTimeout(() => {
          if (copyRef.current) {
            copyRef.current.innerText = "Copy to Clipboard"
          }
        }, 2000)
      }
    } catch (error) {
      console.error("Failed to copy results", error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Pipeline Results</CardTitle>
            <CardDescription>Execution results for all pipeline nodes</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setAutoRefresh(!autoRefresh)}>
              {autoRefresh ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {isRunning && (
          <div className="mx-6 mb-4 flex items-center gap-2 bg-primary/10 p-2 rounded-md">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">Pipeline execution in progress...</span>
            {refreshIndicator && <span className="text-xs text-primary animate-pulse">Auto-refresh triggered</span>}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-4 gap-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">Node Details</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            {/* Summary Tab */}
            <TabsContent value="summary" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Successful Nodes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{statusCounts.success}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((statusCounts.success / (results.length || 1)) * 100)}% of total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                      Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{statusCounts.warning}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((statusCounts.warning / (results.length || 1)) * 100)}% of total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                      Errors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{statusCounts.error}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((statusCounts.error / (results.length || 1)) * 100)}% of total
                    </p>
                  </CardContent>
                </Card>
              </div>

              {Object.keys(averageMetrics).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Key Metrics Overview</h3>
                  <div className="space-y-2">
                    {Object.entries(averageMetrics)
                      .filter(([name]) => ["Accuracy", "F1 Score", "Precision", "Recall", "AUC"].includes(name))
                      .map(([name, value]) => (
                        <div key={name} className="flex items-center gap-2">
                          <div className="w-36 text-sm font-medium">{name}:</div>
                          <div className="flex-1 h-2 bg-secondary rounded-full">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(value * 100, 100)}%` }}
                            />
                          </div>
                          <div className="w-12 text-right text-sm">{value.toFixed(2)}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Pipeline Execution Timeline</h3>
                <div className="space-y-2">
                  {sortedResults.map((result) => (
                    <div
                      key={result.nodeId}
                      className={cn(
                        "p-3 rounded-md border flex justify-between items-center",
                        result.status === "error" && "bg-destructive/10 border-destructive/50",
                        result.status === "warning" && "bg-amber-500/10 border-amber-500/50",
                        result.status === "success" && "bg-emerald-500/10 border-emerald-500/50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {result.status === "success" && <Check className="h-4 w-4 text-emerald-500" />}
                        {result.status === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        {result.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                        <span className="font-medium">{result.nodeName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{result.timestamp.toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-0">
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Execution Details</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSortBy("name")
                        toggleSortDirection()
                      }}
                      className={cn(sortBy === "name" && "bg-primary/10")}
                    >
                      Name{" "}
                      {sortBy === "name" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSortBy("time")
                        toggleSortDirection()
                      }}
                      className={cn(sortBy === "time" && "bg-primary/10")}
                    >
                      Time{" "}
                      {sortBy === "time" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search by node name..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="border rounded-md p-2 flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterText("")}
                  >
                    Clear Filter
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {filteredResults.map((result) => (
                  <Card
                    key={result.nodeId}
                    className={cn(
                      "overflow-hidden",
                      result.status === "error" && "border-destructive/50",
                      result.status === "warning" && "border-amber-500/50",
                    )}
                  >
                    <CardHeader
                      className={cn(
                        "pb-3",
                        result.status === "error" && "bg-destructive/10",
                        result.status === "warning" && "bg-amber-500/10",
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base flex items-center">
                          {result.status === "success" && <Check className="h-4 w-4 mr-2 text-emerald-500" />}
                          {result.status === "warning" && <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />}
                          {result.status === "error" && <AlertCircle className="h-4 w-4 mr-2 text-destructive" />}
                          {result.nodeName}
                        </CardTitle>
                        <Badge
                          variant={
                            result.status === "success"
                              ? "outline"
                              : result.status === "warning"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {result.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Node ID: {result.nodeId} • Executed at: {result.timestamp.toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="py-3">
                      {result.message && (
                        <div
                          className={cn(
                            "mb-3 p-2 rounded text-sm",
                            result.status === "error" && "bg-destructive/10 text-destructive",
                            result.status === "warning" && "bg-amber-500/10 text-amber-700",
                          )}
                        >
                          {result.message}
                        </div>
                      )}

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Output</h4>
                        <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                          {JSON.stringify(result.output, null, 2)}
                        </pre>

                        {result.metrics && result.metrics.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Metrics</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {result.metrics.map((metric) => (
                                <div
                                  key={metric.name}
                                  className="flex justify-between items-center p-2 bg-muted rounded-md"
                                >
                                  <span className="text-xs">{metric.name}</span>
                                  <Badge variant="secondary" className="font-mono">
                                    {typeof metric.value === "number" && metric.value < 1
                                      ? metric.value.toFixed(4)
                                      : metric.value.toString()}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Model Performance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(averageMetrics)
                      .filter(([name]) => ["Accuracy", "F1 Score", "Precision", "Recall", "AUC"].includes(name))
                      .map(([name, value]) => (
                        <Card key={name}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center">
                              <BarChart className="h-4 w-4 mr-2 text-primary" />
                              {name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-3xl font-bold">{value.toFixed(4)}</p>
                            <div className="h-2 w-full bg-secondary rounded-full mt-2">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(value * 100, 100)}%` }}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Resource Usage</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(averageMetrics)
                      .filter(([name]) =>
                        ["Training Time (s)", "Memory Usage (MB)", "Processing Time (s)"].includes(name),
                      )
                      .map(([name, value]) => (
                        <Card key={name}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{value.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Average across all nodes</p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">All Metrics</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(averageMetrics).map(([name, value]) => (
                          <div key={name} className="flex flex-col">
                            <span className="text-sm text-muted-foreground">{name}</span>
                            <span className="text-lg font-medium">
                              {typeof value === "number" && value < 1 ? value.toFixed(4) : value.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="mt-0">
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-medium">Export Pipeline Results</h3>
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <Button onClick={handleExport} className="flex items-center gap-2">
                    Export JSON
                  </Button>
                  <Button ref={copyRef} onClick={handleCopy} variant="outline" className="flex items-center gap-2">
                    <Copy className="h-4 w-4" /> Copy to Clipboard
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md max-h-60 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </Card>
    </div>
  )
}
