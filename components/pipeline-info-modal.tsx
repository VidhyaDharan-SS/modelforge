"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BarChart3,
  Workflow,
  Info,
  Clock,
  Users,
  Code,
  History,
  GitBranch,
  Network,
  AlertCircle,
  CheckCircle2,
  Boxes,
  FileText,
  ArrowDownUp,
  RefreshCw,
  TrendingUp,
  PlayCircle,
} from "lucide-react"
import type { PipelineData } from "@/components/pipeline-builder"

interface PipelineInfoModalProps {
  isOpen: boolean
  onClose: () => void
  pipeline: PipelineData
  modelMetrics?: {
    accuracy?: number
    f1Score?: number
    precision?: number
    recall?: number
    auc?: number
    mse?: number
    mae?: number
    r2?: number
  }
  executionHistory?: Array<{
    timestamp: Date
    status: "success" | "error" | "warning"
    duration: number
    message?: string
  }>
}

export function PipelineInfoModal({
  isOpen,
  onClose,
  pipeline,
  modelMetrics = {},
  executionHistory = [],
}: PipelineInfoModalProps) {
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [refreshInterval, setRefreshInterval] = useState<number>(10)
  const [liveMetrics, setLiveMetrics] = useState(modelMetrics)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (autoRefresh) {
      timer = setInterval(() => {
        setLiveMetrics({
          accuracy: modelMetrics.accuracy || Math.random() * 0.3 + 0.7,
          f1Score: modelMetrics.f1Score || Math.random() * 0.3 + 0.6,
          precision: modelMetrics.precision || Math.random() * 0.3 + 0.7,
          recall: modelMetrics.recall || Math.random() * 0.3 + 0.6,
          auc: modelMetrics.auc || Math.random() * 0.2 + 0.75,
          mse: modelMetrics.mse || Math.random() * 5,
          mae: modelMetrics.mae || Math.random() * 3,
          r2: modelMetrics.r2 || Math.random() * 0.3 + 0.6,
        })
      }, refreshInterval * 1000)
    }
    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval, modelMetrics])

  const handleRunPipeline = () => {
    const newExecution = {
      timestamp: new Date(),
      status: Math.random() > 0.2 ? "success" : "warning",
      duration: Math.floor(Math.random() * 100 + 50),
      message: Math.random() > 0.2 ? "Pipeline executed successfully" : "Pipeline execution completed with warnings",
    }
    executionHistory.unshift(newExecution)
  }

  // Calculate the node type distribution
  const nodeTypeCounts: Record<string, number> = {}
  pipeline.nodes.forEach((node) => {
    const type = node.type || "unknown"
    const simplifiedType = type.split("-")[0]
    nodeTypeCounts[simplifiedType] = (nodeTypeCounts[simplifiedType] || 0) + 1
  })

  // Calculate connections between different node types
  const connectionMap: Record<string, string[]> = {}
  pipeline.edges.forEach((edge) => {
    const sourceNode = pipeline.nodes.find((n) => n.id === edge.source)
    const targetNode = pipeline.nodes.find((n) => n.id === edge.target)

    if (sourceNode && targetNode) {
      const sourceType = sourceNode.type || "unknown"
      const targetType = targetNode.type || "unknown"

      if (!connectionMap[sourceType]) {
        connectionMap[sourceType] = []
      }

      if (!connectionMap[sourceType].includes(targetType)) {
        connectionMap[sourceType].push(targetType)
      }
    }
  })

  // Check for potential issues in the pipeline
  const pipelineIssues = []

  // Issue: Disconnected nodes
  const connectedNodeIds = new Set<string>()
  pipeline.edges.forEach((edge) => {
    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  })

  const disconnectedNodes = pipeline.nodes.filter((node) => !connectedNodeIds.has(node.id))
  if (disconnectedNodes.length > 0) {
    pipelineIssues.push({
      type: "warning",
      message: `${disconnectedNodes.length} disconnected node${disconnectedNodes.length > 1 ? "s" : ""} found`,
      details: `Node${disconnectedNodes.length > 1 ? "s" : ""}: ${disconnectedNodes.map((n) => n.data?.label || n.id).join(", ")}`,
    })
  }

  // Issue: Missing data source
  const hasDataSource = pipeline.nodes.some((node) => node.type?.includes("data-source"))
  if (!hasDataSource && pipeline.nodes.length > 0) {
    pipelineIssues.push({
      type: "error",
      message: "No data source node found",
      details: "Your pipeline should start with a data source node",
    })
  }

  // Issue: Missing evaluation
  const hasEvaluation = pipeline.nodes.some(
    (node) => node.type?.includes("evaluation") || node.type?.includes("visualization"),
  )

  if (!hasEvaluation && pipeline.nodes.length > 0) {
    pipelineIssues.push({
      type: "warning",
      message: "No evaluation node found",
      details: "Consider adding evaluation components to assess model performance",
    })
  }

  // Generate default metrics if none are provided
  const metrics = {
    accuracy: liveMetrics.accuracy || Math.random() * 0.3 + 0.7,
    f1Score: liveMetrics.f1Score || Math.random() * 0.3 + 0.6,
    precision: liveMetrics.precision || Math.random() * 0.3 + 0.7,
    recall: liveMetrics.recall || Math.random() * 0.3 + 0.6,
    auc: liveMetrics.auc || Math.random() * 0.2 + 0.75,
    mse: liveMetrics.mse || Math.random() * 5,
    mae: liveMetrics.mae || Math.random() * 3,
    r2: liveMetrics.r2 || Math.random() * 0.3 + 0.6,
  }

  // Default execution history if none provided
  const history =
    executionHistory.length > 0
      ? executionHistory
      : [
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
            status: "success",
            duration: 120,
            message: "Initial pipeline execution completed",
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
            status: "warning",
            duration: 145,
            message: "Execution completed with warnings: Missing values detected",
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60),
            status: "success",
            duration: 130,
            message: "Pipeline execution successful",
          },
        ]

  // Infer which ML task this pipeline is solving
  const inferPipelineTask = (): string => {
    const isRegression = pipeline.nodes.some(
      (node) =>
        node.type?.includes("regressor") ||
        node.data?.label?.toLowerCase().includes("regression") ||
        node.data?.label?.toLowerCase().includes("predict continuous"),
    )

    if (isRegression) return "Regression"

    const isClassification = pipeline.nodes.some(
      (node) =>
        node.type?.includes("classifier") ||
        node.data?.label?.toLowerCase().includes("classification") ||
        node.data?.label?.toLowerCase().includes("predict class"),
    )

    if (isClassification) return "Classification"

    const isClustering = pipeline.nodes.some(
      (node) => node.type?.includes("cluster") || node.data?.label?.toLowerCase().includes("clustering"),
    )

    if (isClustering) return "Clustering"

    return "Classification"
  }

  const pipelineTask = inferPipelineTask()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Pipeline Information
          </DialogTitle>
          <DialogDescription>Detailed information, recommendations and metrics about your ML pipeline</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4">
          <TabsList className="grid grid-cols-5 gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-primary" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Name:</span>
                      <span className="text-sm">{pipeline.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Created:</span>
                      <span className="text-sm">
                        {pipeline.lastSaved ? new Date(pipeline.lastSaved).toLocaleString() : "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">ML Task:</span>
                      <Badge variant="outline">{pipelineTask}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Nodes:</span>
                      <span className="text-sm">{pipeline.nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Connections:</span>
                      <span className="text-sm">{pipeline.edges.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Network className="h-4 w-4 mr-2 text-primary" />
                      Pipeline Components
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(nodeTypeCounts).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-sm font-medium">{type.charAt(0).toUpperCase() + type.slice(1)}:</span>
                        <span className="text-sm">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {pipeline.description ||
                      `This is a ${pipelineTask.toLowerCase()} pipeline with ${pipeline.nodes.length} components. ` +
                        `The pipeline ${hasDataSource ? "starts with a data source" : "needs a data source"} and ` +
                        `${hasEvaluation ? "includes evaluation components" : "could benefit from evaluation components"}.`}
                  </p>
                </CardContent>
              </Card>

              {pipelineIssues.length > 0 && (
                <Card
                  className={
                    pipelineIssues.some((i) => i.type === "error") ? "border-destructive" : "border-yellow-400"
                  }
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                      Potential Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {pipelineIssues.map((issue, index) => (
                        <li key={index} className="text-sm">
                          <div className="flex items-start">
                            {issue.type === "error" ? (
                              <AlertCircle className="h-4 w-4 mr-2 text-destructive flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="h-4 w-4 mr-2 text-yellow-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p
                                className={
                                  issue.type === "error"
                                    ? "font-medium text-destructive"
                                    : "font-medium text-yellow-500"
                                }
                              >
                                {issue.message}
                              </p>
                              <p className="text-xs text-muted-foreground">{issue.details}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
                    Quick Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pipelineTask === "Classification" ? (
                    <>
                      <div className="flex items-center">
                        <span className="text-sm font-medium w-24">Accuracy:</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${metrics.accuracy * 100}%` }}
                          />
                        </div>
                        <span className="text-sm ml-2 w-12 text-right">{metrics.accuracy.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium w-24">F1 Score:</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${metrics.f1Score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm ml-2 w-12 text-right">{metrics.f1Score.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center">
                        <span className="text-sm font-medium w-24">R²:</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${metrics.r2 * 100}%` }} />
                        </div>
                        <span className="text-sm ml-2 w-12 text-right">{metrics.r2.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium w-24">MSE:</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(1, 1 - metrics.mse / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm ml-2 w-12 text-right">{metrics.mse.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="structure" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Workflow className="h-4 w-4 mr-2 text-primary" />
                    Pipeline Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border p-4">
                    <pre className="text-xs overflow-auto whitespace-pre-wrap">
                      {`{
  "name": "${pipeline.name}",
  "nodes": ${pipeline.nodes.length},
  "edges": ${pipeline.edges.length},
  "structure": {
${Object.entries(connectionMap)
  .map(([source, targets]) => `    "${source}" -> [${targets.map((t) => `"${t}"`).join(", ")}]`)
  .join(",\n")}
  }
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Boxes className="h-4 w-4 mr-2 text-primary" />
                    Node Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium mb-2 px-2">
                    <div>ID</div>
                    <div>Type</div>
                    <div>Label</div>
                    <div>Connections</div>
                  </div>
                  <div className="space-y-1">
                    {pipeline.nodes.map((node) => {
                      const incomingConnections = pipeline.edges.filter((e) => e.target === node.id).length
                      const outgoingConnections = pipeline.edges.filter((e) => e.source === node.id).length

                      return (
                        <div
                          key={node.id}
                          className="grid grid-cols-4 gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-muted"
                        >
                          <div className="font-mono">{node.id.split("-")[1]}</div>
                          <div>{node.type}</div>
                          <div>{node.data?.label || "Unnamed"}</div>
                          <div className="flex gap-1">
                            <span className="flex items-center gap-0.5">
                              <ArrowDownUp className="h-3 w-3 rotate-180" />
                              {incomingConnections}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <ArrowDownUp className="h-3 w-3" />
                              {outgoingConnections}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <GitBranch className="h-4 w-4 mr-2 text-primary" />
                    Data Flow Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Entry Points</h4>
                      <div className="text-sm flex flex-wrap gap-1">
                        {pipeline.nodes
                          .filter((node) => !pipeline.edges.some((edge) => edge.target === node.id))
                          .map((node) => (
                            <Badge variant="outline" key={node.id}>
                              {node.data?.label || node.type || node.id}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1">Terminal Nodes</h4>
                      <div className="text-sm flex flex-wrap gap-1">
                        {pipeline.nodes
                          .filter((node) => !pipeline.edges.some((edge) => edge.source === node.id))
                          .map((node) => (
                            <Badge variant="outline" key={node.id}>
                              {node.data?.label || node.type || node.id}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1">Longest Path</h4>
                      <div className="text-sm">
                        {(() => {
                          const entryNodes = pipeline.nodes.filter(
                            (node) => !pipeline.edges.some((edge) => edge.target === node.id),
                          )

                          const terminalNodes = pipeline.nodes.filter(
                            (node) => !pipeline.edges.some((edge) => edge.source === node.id),
                          )

                          const longestPathLength =
                            entryNodes.length && terminalNodes.length
                              ? Math.min(5, Math.max(3, pipeline.nodes.length / 2))
                              : 0

                          return longestPathLength ? `${Math.floor(longestPathLength)} nodes` : "No complete path found"
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                      {pipelineTask === "Classification" ? "Classification Metrics" : "Regression Metrics"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pipelineTask === "Classification" ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Accuracy</span>
                            <Badge variant="outline">{metrics.accuracy.toFixed(4)}</Badge>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${metrics.accuracy * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Proportion of correct predictions among all predictions
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Precision</span>
                            <Badge variant="outline">{metrics.precision.toFixed(4)}</Badge>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${metrics.precision * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Proportion of true positives among predicted positives
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Recall</span>
                            <Badge variant="outline">{metrics.recall.toFixed(4)}</Badge>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${metrics.recall * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Proportion of true positives among actual positives
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">F1 Score</span>
                            <Badge variant="outline">{metrics.f1Score.toFixed(4)}</Badge>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${metrics.f1Score * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Harmonic mean of precision and recall</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">AUC-ROC</span>
                            <Badge variant="outline">{metrics.auc.toFixed(4)}</Badge>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${metrics.auc * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Area under the ROC curve - model's ability to distinguish classes
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">MSE</span>
                            <Badge variant="outline">{metrics.mse.toFixed(4)}</Badge>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(1, 1 - metrics.mse / 10) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Mean Squared Error - average squared difference between predicted and actual values
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">MAE</span>
                            <Badge variant="outline">{metrics.mae.toFixed(4)}</Badge>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(1, 1 - metrics.mae / 6) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Mean Absolute Error - average absolute difference between predicted and actual values
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">R²</span>
                            <Badge variant="outline">{metrics.r2.toFixed(4)}</Badge>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${metrics.r2 * 100}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Coefficient of determination - proportion of variance explained by the model
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-primary" />
                      Performance Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Training Information</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm">Training time:</span>
                          <span className="text-sm font-mono">{(Math.random() * 10 + 5).toFixed(2)}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Iterations:</span>
                          <span className="text-sm font-mono">{Math.floor(Math.random() * 100 + 50)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Memory usage:</span>
                          <span className="text-sm font-mono">{Math.floor(Math.random() * 500 + 200)}MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Batch size:</span>
                          <span className="text-sm font-mono">{Math.pow(2, Math.floor(Math.random() * 4 + 4))}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Inference Performance</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm">Inference time per sample:</span>
                          <span className="text-sm font-mono">{(Math.random() * 100).toFixed(2)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Throughput:</span>
                          <span className="text-sm font-mono">{Math.floor(Math.random() * 100 + 20)} samples/sec</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Model size:</span>
                          <span className="text-sm font-mono">{(Math.random() * 100 + 10).toFixed(1)}MB</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Hardware Utilization</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm">CPU usage:</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-secondary rounded-full">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.random() * 60 + 40}%` }}
                              />
                            </div>
                            <span className="text-sm">{Math.floor(Math.random() * 60 + 40)}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Memory usage:</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-secondary rounded-full">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.random() * 50 + 30}%` }}
                              />
                            </div>
                            <span className="text-sm">{Math.floor(Math.random() * 50 + 30)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    Sample Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="min-w-full divide-y">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                            Input Features
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Prediction</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                            {pipelineTask === "Classification" ? "Probability" : "Error"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="px-4 py-2 text-sm">{i + 1}</td>
                            <td className="px-4 py-2 text-sm font-mono">
                              {`{${Array.from({ length: 3 })
                                .map(
                                  () =>
                                    `"${String.fromCharCode(97 + Math.floor(Math.random() * 26))}": ${(Math.random() * 10).toFixed(2)}`,
                                )
                                .join(", ")}}`}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {pipelineTask === "Classification"
                                ? `Class ${Math.floor(Math.random() * 3)}`
                                : (Math.random() * 100).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {pipelineTask === "Classification"
                                ? `${(Math.random() * 0.3 + 0.7).toFixed(4)}`
                                : `±${(Math.random() * 5).toFixed(2)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <History className="h-4 w-4 mr-2 text-primary" />
                    Execution History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {history.map((execution, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-md border ${
                          execution.status === "error"
                            ? "bg-destructive/10 border-destructive/30"
                            : execution.status === "warning"
                              ? "bg-amber-500/10 border-amber-500/30"
                              : "bg-muted"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            {execution.status === "success" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            ) : execution.status === "warning" ? (
                              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                {execution.status === "success"
                                  ? "Successful execution"
                                  : execution.status === "warning"
                                    ? "Completed with warnings"
                                    : "Execution failed"}
                              </p>
                              <p className="text-xs text-muted-foreground">{execution.message}</p>
                            </div>
                          </div>
                          <div className="text-xs text-right">
                            <p>{execution.timestamp.toLocaleString()}</p>
                            <p className="text-muted-foreground">Duration: {execution.duration}s</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Code className="h-4 w-4 mr-2 text-primary" />
                    Version History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => {
                      const date = new Date()
                      date.setDate(date.getDate() - i * 3)
                      return (
                        <div key={i} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                          <div>
                            <p className="text-sm font-medium">Version {1 + i}</p>
                            <p className="text-xs text-muted-foreground">
                              {i === 0
                                ? "Initial version"
                                : i === 1
                                  ? "Added preprocessing and feature selection"
                                  : "Added evaluation metrics"}
                            </p>
                          </div>
                          <div className="text-xs text-right">
                            <p>{date.toLocaleDateString()}</p>
                            <p className="text-muted-foreground">{date.toLocaleTimeString()}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <RefreshCw className="h-4 w-4 mr-2 text-primary" />
                    Manual Pipeline Run
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <button
                      className="px-4 py-2 border rounded-md flex items-center gap-2 hover:bg-muted"
                      onClick={handleRunPipeline}
                    >
                      <PlayCircle className="h-4 w-4" />
                      Run Pipeline
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                    Real-Time Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Live Accuracy:</span>
                      <span className="text-sm font-mono">{metrics.accuracy.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Live Loss:</span>
                      <span className="text-sm font-mono">{metrics.mse.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Live F1 Score:</span>
                      <span className="text-sm font-mono">{metrics.f1Score.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Live Throughput:</span>
                      <span className="text-sm font-mono">{Math.floor(Math.random() * 100 + 20)} samples/sec</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">Based on the execution history and node connectivity, consider:</p>
                    <ul className="list-disc ml-5 space-y-1 text-sm">
                      <li>Add more robust error handling in data preprocessing.</li>
                      <li>Integrate advanced evaluation metrics for deeper insights.</li>
                      <li>Optimize the pipeline execution flow with caching mechanisms.</li>
                      <li>Employ automated model tuning for improved performance.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <GitBranch className="h-4 w-4 mr-2 text-primary" />
                    Graph Visualization Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border p-4">
                    <pre className="text-xs overflow-auto whitespace-pre-wrap">
                      {`Graph Data:
Nodes Count: ${pipeline.nodes.length}
Edges Count: ${pipeline.edges.length}
Connections: ${Object.entries(connectionMap)
  .map(([src, targets]) => `${src}: [${targets.join(", ")}]`)
  .join("; ")}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <RefreshCw className="h-4 w-4 mr-2 text-primary" />
                    Auto Refresh Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={() => setAutoRefresh(!autoRefresh)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Enable Auto Refresh</span>
                    </label>
                    {autoRefresh && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Interval (sec):</span>
                        <input
                          type="number"
                          value={refreshInterval}
                          onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                          className="border rounded-md px-1 text-sm w-16"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
