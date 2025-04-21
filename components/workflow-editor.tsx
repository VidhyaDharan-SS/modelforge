"use client"

import React from "react"

import { useCallback, useState, useRef, useEffect, useMemo } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type NodeProps,
  Handle,
  Position,
  Panel,
  useReactFlow,
  ConnectionLineType,
  MarkerType,
  NodeToolbar,
  NodeResizer,
  EdgeLabelRenderer,
  type EdgeProps,
  BaseEdge,
  getStraightPath,
  useKeyPress,
  ReactFlowState,
  useStore,
  BackgroundVariant,
} from "reactflow"
import "reactflow/dist/style.css"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Database,
  FileSpreadsheet,
  Boxes,
  BarChart3,
  Cog,
  Rocket,
  Sigma,
  Trash2,
  Copy,
  Edit,
  Play,
  Eye,
  EyeOff,
  Check,
  X,
  Zap,
  AlertCircle,
  Info,
  Loader2,
  Share2,
  Filter,
  Sparkles,
  PlusCircle,
  LineChart,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

import type { DataPreview, PipelineResult } from "./pipeline-builder"

interface WorkflowEditorProps {
  onNodeSelect: (nodeId: string | null) => void
  selectedNode: string | null
  nodes: Node[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  edges: Edge[]
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  pipelineResults: PipelineResult[]
  onViewNodeHistory?: (nodeId: string) => void
}

// Add a new interface for model metrics
interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  auc?: number
  lossHistory?: number[]
}

// Add this function to generate sample metrics (in a real app, these would come from an API or actual runs)
const generateSampleMetrics = (nodeType: string): ModelMetrics | null => {
  // Only generate metrics for model nodes
  if (!nodeType.includes('model') && !nodeType.includes('evaluation')) {
    return null
  }

  // Generate random metrics based on the node type
  const baseAccuracy = Math.random() * 0.3 + 0.65 // Between 0.65 and 0.95
  
  const metrics: ModelMetrics = {
    accuracy: parseFloat(baseAccuracy.toFixed(4)),
    precision: parseFloat((baseAccuracy - Math.random() * 0.05).toFixed(4)),
    recall: parseFloat((baseAccuracy - Math.random() * 0.08).toFixed(4)),
    f1Score: parseFloat((baseAccuracy - Math.random() * 0.06).toFixed(4)),
    auc: parseFloat((baseAccuracy + Math.random() * 0.05).toFixed(4)),
    lossHistory: Array.from({ length: 10 }, (_, i) => parseFloat((1 - (i / 10) * 0.7).toFixed(2))),
  }
  
  return metrics
}

// Add a simple inline chart component for the model metrics
const MetricsChart = ({ metrics }: { metrics: ModelMetrics }) => {
  // Calculate max height for normalization
  const maxValue = Math.max(...Object.values(metrics).filter(v => typeof v === 'number' && !Array.isArray(v)) as number[])
  
  // Calculate bar heights and widths
  const chartHeight = 40
  const barWidth = 16
  const barGap = 6
  const getBarHeight = (value: number) => (value / maxValue) * chartHeight
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <LineChart className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Model Metrics</span>
      </div>
      
      <div className="flex items-end gap-1 h-10 mt-1 mb-1.5">
        <div className="flex flex-col items-center">
          <div 
            className="w-4 bg-blue-500/80 rounded-t-sm" 
            style={{ height: `${getBarHeight(metrics.accuracy)}px` }}
          />
          <span className="text-[8px] mt-0.5">Acc</span>
        </div>
        <div className="flex flex-col items-center">
          <div 
            className="w-4 bg-green-500/80 rounded-t-sm" 
            style={{ height: `${getBarHeight(metrics.precision)}px` }}
          />
          <span className="text-[8px] mt-0.5">Prec</span>
        </div>
        <div className="flex flex-col items-center">
          <div 
            className="w-4 bg-amber-500/80 rounded-t-sm" 
            style={{ height: `${getBarHeight(metrics.recall)}px` }}
          />
          <span className="text-[8px] mt-0.5">Rec</span>
        </div>
        <div className="flex flex-col items-center">
          <div 
            className="w-4 bg-purple-500/80 rounded-t-sm" 
            style={{ height: `${getBarHeight(metrics.f1Score)}px` }}
          />
          <span className="text-[8px] mt-0.5">F1</span>
        </div>
        {metrics.auc && (
          <div className="flex flex-col items-center">
            <div 
              className="w-4 bg-red-500/80 rounded-t-sm" 
              style={{ height: `${getBarHeight(metrics.auc)}px` }}
            />
            <span className="text-[8px] mt-0.5">AUC</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex justify-between text-[9px]">
          <span className="text-muted-foreground">Accuracy:</span>
          <span className="font-medium">{metrics.accuracy.toFixed(4)}</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-muted-foreground">Precision:</span>
          <span className="font-medium">{metrics.precision.toFixed(4)}</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-muted-foreground">Recall:</span>
          <span className="font-medium">{metrics.recall.toFixed(4)}</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-muted-foreground">F1 Score:</span>
          <span className="font-medium">{metrics.f1Score.toFixed(4)}</span>
        </div>
        {metrics.auc && (
          <div className="flex justify-between text-[9px]">
            <span className="text-muted-foreground">AUC:</span>
            <span className="font-medium">{metrics.auc.toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Custom edge component with animated path and highlighting
const CustomEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
  highlighted,
}: EdgeProps & { highlighted?: boolean }) => {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: highlighted ? 3 : 2,
          stroke: highlighted ? 'var(--color-primary)' : style.stroke,
          animation: "flow 30s linear infinite",
          strokeDasharray: "10 5",
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            opacity: highlighted ? 1 : 0.8,
            transition: 'opacity 0.2s ease',
          }}
          className="nodrag nopan bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded-full border shadow-sm"
        >
          {data?.label || "connects to"}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

// Base node component with common functionality
const BaseNodeComponent = ({
  data,
  selected,
  type,
  id,
  children,
  handles = { left: true, right: true },
  isResizable = true,
  nodeProps,
  status,
  onViewNodeHistory,
}: NodeProps & {
  children: React.ReactNode
  handles?: { left?: boolean; right?: boolean }
  isResizable?: boolean
  nodeProps?: NodeProps
  status?: PipelineResult['status'] | null
  onViewNodeHistory?: (nodeId: string) => void
}) => {
  const { theme } = useTheme()
  const { deleteElements } = useReactFlow()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [nodeName, setNodeName] = useState(data.label || type)
  const [isRunning, setIsRunning] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null)
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(data.preview || null)

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] })
    toast({
      title: "Node deleted",
      description: `Removed ${nodeName} from the pipeline`,
    })
  }

  const handleDuplicate = () => {
    // Implementation would be handled by the parent component
    toast({
      title: "Node duplicated",
      description: `Created a copy of ${nodeName}`,
    })
  }

  const handleRun = () => {
    setIsRunning(true)
    toast({
      title: "Running node",
      description: `Executing ${nodeName}...`,
    })

    // Simulate processing
    setTimeout(() => {
      setIsRunning(false)
      // Generate metrics if this is a model node
      if (type && (type.includes('model') || type.includes('evaluation'))) {
        const newMetrics = generateSampleMetrics(type)
        setMetrics(newMetrics)
        setShowMetrics(true)
      }
      toast({
        title: "Node execution complete",
        description: `${nodeName} executed successfully`,
      })
    }, 2000)
  }

  const handleSaveLabel = () => {
    setIsEditing(false)
    toast({
      title: "Node renamed",
      description: `Changed name to ${nodeName}`,
    })
  }

  const handleToggleVisibility = () => {
    setIsHidden(!isHidden)
    toast({
      title: isHidden ? "Node shown" : "Node hidden",
      description: `${nodeName} is now ${isHidden ? "visible" : "hidden"} in the pipeline visualization`,
    })
  }

  const handleToggleMetrics = () => {
    if (showMetrics) {
      setShowMetrics(false)
    } else {
      // Generate metrics if not already available
      if (!metrics && type) {
        const newMetrics = generateSampleMetrics(type)
        setMetrics(newMetrics)
      }
      setShowMetrics(true)
    }
  }

  // Check if this node type can have metrics
  const canShowMetrics = type && (type.includes('model') || type.includes('evaluation'))

  // Helper function to get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  return (
    <>
      <NodeToolbar className="flex bg-background border rounded-md shadow-sm p-1 gap-1">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input value={nodeName} onChange={(e) => setNodeName(e.target.value)} className="h-7 text-xs" autoFocus />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveLabel}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rename</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDuplicate}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duplicate</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRun}>
                    <Play className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Run this node</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleToggleVisibility}>
                    {isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isHidden ? "Show" : "Hide"} node</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {canShowMetrics && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={cn("h-7 w-7", showMetrics && "bg-primary/10")}
                      onClick={handleToggleMetrics}
                    >
                      <BarChart3 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showMetrics ? "Hide" : "Show"} metrics</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={handleDelete}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {onViewNodeHistory && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onViewNodeHistory(id)}>
                      <Info className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View History</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        )}
      </NodeToolbar>

      {showMetrics && metrics && (
        <NodeToolbar
          position={Position.Bottom}
          className="bg-background/95 backdrop-blur-sm border rounded-md shadow-sm p-3 mt-2"
          isVisible={true}
        >
          <MetricsChart metrics={metrics} />
        </NodeToolbar>
      )}

      {isResizable ? (
        <NodeResizer
          minWidth={180}
          minHeight={100}
          isVisible={selected}
          lineClassName="border-primary"
          handleClassName="h-3 w-3 bg-primary border-primary"
        />
      ) : null}

      <Card
        className={cn(
          "w-48 transition-all duration-200 group relative",
          selected ? "ring-2 ring-primary shadow-lg" : "shadow-sm",
          isRunning && "animate-pulse",
          isHidden && "opacity-50",
        )}
      >
        {status && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full border-2 border-background flex items-center justify-center",
                    status === 'success' && "bg-green-500",
                    status === 'warning' && "bg-yellow-500",
                    status === 'error' && "bg-red-500",
                  )}
                >
                  {/* Optionally add a smaller icon inside */}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs capitalize">Status: {status}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {handles.left && (
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            className="w-3 h-3 bg-primary border-2 border-background transition-all group-hover:w-4 group-hover:h-4 z-10"
          />
        )}

        {children}

        {isRunning && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-medium">Running...</span>
            </div>
          </div>
        )}

        {handles.right && (
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className="w-3 h-3 bg-primary border-2 border-background transition-all group-hover:w-4 group-hover:h-4 z-10"
          />
        )}
        {/* Conditional Output Handle */}
      </Card>
    </>
  )
}

// Custom node components
const DataSourceNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status} handles={{ left: false, right: true }}>
    <CardHeader className="py-2 bg-blue-50 dark:bg-blue-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <Database className="h-4 w-4 text-blue-500" />
      <CardTitle className="text-sm">Data Source</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">{props.data.label || "Import data from CSV, DB, or API"}</CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Output: DataFrame</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Source
      </Badge>
    </CardFooter>
  </BaseNodeComponent>
)

const PreprocessingNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status}>
    <CardHeader className="py-2 bg-green-50 dark:bg-green-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <FileSpreadsheet className="h-4 w-4 text-green-500" />
      <CardTitle className="text-sm">Preprocessing</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">{props.data.label || "Clean and transform data"}</CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Transforms: 3</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Transform
      </Badge>
    </CardFooter>
  </BaseNodeComponent>
)

const FeatureEngineeringNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status}>
    <CardHeader className="py-2 bg-purple-50 dark:bg-purple-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <Sigma className="h-4 w-4 text-purple-500" />
      <CardTitle className="text-sm">Feature Engineering</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">{props.data.label || "Create and select features"}</CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Features: +5</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Features
      </Badge>
    </CardFooter>
  </BaseNodeComponent>
)

const ModelNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status} isResizable={true}>
    <CardHeader className="py-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <Boxes className="h-4 w-4 text-yellow-500" />
      <CardTitle className="text-sm">Model</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">
      {props.data.label || "Train ML model"}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span>Algorithm:</span>
          <span className="font-medium">RandomForest</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Accuracy:</span>
          <span className="font-medium">87.5%</span>
        </div>
      </div>
    </CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Type: Classifier</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Model
      </Badge>
    </CardFooter>
  </BaseNodeComponent>
)

const EvaluationNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status}>
    <CardHeader className="py-2 bg-red-50 dark:bg-red-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <BarChart3 className="h-4 w-4 text-red-500" />
      <CardTitle className="text-sm">Evaluation</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">{props.data.label || "Evaluate model performance"}</CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Metrics: 5</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Evaluation
      </Badge>
    </CardFooter>
  </BaseNodeComponent>
)

const TuningNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status}>
    <CardHeader className="py-2 bg-orange-50 dark:bg-orange-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <Cog className="h-4 w-4 text-orange-500" />
      <CardTitle className="text-sm">Hyperparameter Tuning</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">{props.data.label || "Optimize model parameters"}</CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Method: Bayesian</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Tuning
      </Badge>
    </CardFooter>
  </BaseNodeComponent>
)

const DeploymentNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status} handles={{ left: true, right: false }}>
    <CardHeader className="py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <Rocket className="h-4 w-4 text-indigo-500" />
      <CardTitle className="text-sm">Deployment</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">{props.data.label || "Deploy model as API"}</CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Status: Ready</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Deployment
      </Badge>
    </CardFooter>
  </BaseNodeComponent>
)

const ConditionalSplitNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status} isResizable={true}>
    <CardHeader className="py-2 bg-violet-50 dark:bg-violet-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <Share2 className="h-4 w-4 text-violet-500" />
      <CardTitle className="text-sm">Conditional Split</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">
      {props.data.label || "Split flow based on conditions"}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span>Condition:</span>
          <span className="font-medium">{props.data.condition || "x > 0.5"}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>True path:</span>
          <span className="font-medium text-green-500">Right output</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>False path:</span>
          <span className="font-medium text-red-500">Bottom output</span>
        </div>
      </div>
    </CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Type: Conditional</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Flow
      </Badge>
    </CardFooter>
    <Handle
      type="source"
      position={Position.Bottom}
      id="bottom"
      className="w-3 h-3 bg-red-500 border-2 border-background transition-all group-hover:w-4 group-hover:h-4"
    />
  </BaseNodeComponent>
)

const ThresholdNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status}>
    <CardHeader className="py-2 bg-violet-50 dark:bg-violet-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <Filter className="h-4 w-4 text-violet-500" />
      <CardTitle className="text-sm">Threshold</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">
      {props.data.label || "Apply threshold to values"}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span>Threshold:</span>
          <span className="font-medium">{props.data.threshold || "0.75"}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Operator:</span>
          <span className="font-medium">{props.data.operator || ">"}</span>
        </div>
      </div>
    </CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Type: Filter</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Flow
      </Badge>
    </CardFooter>
  </BaseNodeComponent>
)

const PerformanceTriggerNode = (props: NodeProps) => (
  <BaseNodeComponent {...props} nodeProps={props} status={props.data.status}>
    <CardHeader className="py-2 bg-violet-50 dark:bg-violet-900/30 rounded-t-lg flex flex-row items-center gap-2">
      <Cog className="h-4 w-4 text-violet-500" />
      <CardTitle className="text-sm">Performance Trigger</CardTitle>
    </CardHeader>
    <CardContent className="p-2 text-xs">
      {props.data.label || "Trigger on performance metrics"}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span>Metric:</span>
          <span className="font-medium">{props.data.metric || "F1 Score"}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Threshold:</span>
          <span className="font-medium">{props.data.threshold || "0.85"}</span>
        </div>
      </div>
    </CardContent>
    <CardFooter className="px-2 py-1 border-t text-[10px] text-muted-foreground flex justify-between">
      <span>Type: Trigger</span>
      <Badge variant="outline" className="text-[9px] h-4">
        Flow
      </Badge>
    </CardFooter>
  </BaseNodeComponent>
)

// Node types mapping
const nodeTypes: NodeTypes = {
  "data-source": DataSourceNode,
  "data-preprocessing": PreprocessingNode,
  "feature-engineering": FeatureEngineeringNode,
  "feature-extraction": PreprocessingNode,
  "data-augmentation": PreprocessingNode,
  "data-balancing": PreprocessingNode,
  "sklearn-models": ModelNode,
  "tensorflow-models": ModelNode,
  "pytorch-models": ModelNode,
  "xgboost-models": ModelNode,
  "lightgbm-models": ModelNode,
  "catboost-models": ModelNode,
  "huggingface-models": ModelNode,
  "bert-model": ModelNode,
  "gpt-model": ModelNode,
  "vision-transformer": ModelNode,
  "model-evaluation": EvaluationNode,
  "hyperparameter-tuning": TuningNode,
  "cross-validation": EvaluationNode,
  visualization: EvaluationNode,
  "feature-importance": EvaluationNode,
  "conditional-split": ConditionalSplitNode,
  "threshold-condition": ThresholdNode,
  "performance-trigger": PerformanceTriggerNode,
  workflow: DeploymentNode,
  "api-deployment": DeploymentNode,
  "batch-prediction": DeploymentNode,
  "model-monitoring": DeploymentNode,
  "model-versioning": DeploymentNode,
}

// Edge types
const edgeTypes = {
  custom: CustomEdge,
}

// Updated function to provide more thoughtful recommendations
const getNodeRecommendations = (
  selectedNodeId: string | null,
  nodes: Node[],
  edges: Edge[]
): { type: string; reason: string; insertBefore?: string }[] => {
  if (!selectedNodeId) return []

  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  if (!selectedNode || !selectedNode.type) return []

  const selectedNodeType = selectedNode.type

  // --- Basic Recommendation Rules (Next Steps) ---
  const nextStepRules: Record<string, { types: string[]; reasons: string[] }> = {
    "data-source": {
      types: ["data-preprocessing", "feature-engineering"],
      reasons: ["Clean and transform raw data", "Create features directly (basic)"],
    },
    "data-preprocessing": {
      types: ["feature-engineering", "data-balancing", "data-augmentation", "sklearn-models"],
      reasons: [
        "Extract features from processed data",
        "Balance class distribution",
        "Augment data to increase sample size",
        "Train a model on processed data",
      ],
    },
    "feature-engineering": {
      types: ["sklearn-models", "tensorflow-models", "pytorch-models", "xgboost-models", "feature-importance"],
      reasons: [
        "Train a model on extracted features",
        "Train a deep learning model",
        "Train a gradient boosting model",
        "Train an advanced gradient boosting model",
        "Visualize feature importance",
      ],
    },
    "sklearn-models": {
      types: ["model-evaluation", "hyperparameter-tuning", "cross-validation", "api-deployment"],
      reasons: [
        "Evaluate model performance",
        "Optimize model parameters",
        "Validate model with cross-validation",
        "Deploy the trained model",
      ],
    },
    "model-evaluation": {
      types: ["api-deployment", "model-monitoring", "conditional-split", "visualization"],
      reasons: [
        "Deploy evaluated model as API",
        "Monitor deployed model performance",
        "Apply conditional logic based on metrics",
        "Visualize evaluation results",
      ],
    },
    "hyperparameter-tuning": {
      types: ["model-evaluation", "model-versioning"],
      reasons: ["Evaluate tuned model performance", "Version best performing model"],
    },
    // Add more rules for other node types
  }

  // --- Contextual Recommendation Logic (Filling Gaps) ---
  let contextualRecommendations: { type: string; reason: string; insertBefore?: string }[] = []

  // Example: If a data source is connected directly to a model, suggest preprocessing
  if (selectedNodeType === 'data-source') {
    const downstreamNodes = edges
      .filter(e => e.source === selectedNodeId)
      .map(e => nodes.find(n => n.id === e.target))
      .filter((n): n is Node => !!n) // Type guard to filter out undefined

    downstreamNodes.forEach(targetNode => {
      if (targetNode.type && targetNode.type.includes('model')) {
        if (!nodes.some(n => n.type === 'data-preprocessing' && edges.some(e => e.source === selectedNodeId && e.target === n.id) && edges.some(e => e.source === n.id && e.target === targetNode.id))) {
          contextualRecommendations.push({
            type: 'data-preprocessing',
            reason: 'Preprocess data before training model',
            insertBefore: targetNode.id,
          })
        }
      }
    })
  }

  // Example: If preprocessing is connected to deployment, suggest model training/evaluation
  if (selectedNodeType.includes('preprocessing') || selectedNodeType.includes('feature')) {
    const downstreamNodes = edges
      .filter(e => e.source === selectedNodeId)
      .map(e => nodes.find(n => n.id === e.target))
      .filter((n): n is Node => !!n)

    downstreamNodes.forEach(targetNode => {
      if (targetNode.type && targetNode.type.includes('deployment')) {
        // Check if a model node exists between selected and target
        const hasIntermediateModel = nodes.some(n => 
          n.type?.includes('model') &&
          edges.some(e => e.source === selectedNodeId && e.target === n.id) &&
          edges.some(e => e.source === n.id && e.target === targetNode.id)
        )
        if (!hasIntermediateModel) {
          contextualRecommendations.push({
            type: 'sklearn-models', // Suggest a common model type
            reason: 'Train a model before deployment',
            insertBefore: targetNode.id,
          })
        }
      }
    })
  }

  // --- Combine and Filter Recommendations ---

  // Get basic next step recommendations
  const basicRecommendations = (nextStepRules[selectedNodeType] || { types: [], reasons: [] })
  const connectedNodeTypes = edges
    .filter(edge => edge.source === selectedNodeId)
    .map(edge => nodes.find(n => n.id === edge.target)?.type)
    .filter((type): type is string => !!type) // Filter out undefined/null types

  const filteredBasicRecs = basicRecommendations.types
    .filter(type => !connectedNodeTypes.includes(type))
    .map((type, index) => ({
      type,
      reason: basicRecommendations.reasons[index] || "Next step in pipeline",
    }))

  // Combine contextual and basic recommendations, prioritizing contextual ones
  const allRecommendations = [...contextualRecommendations, ...filteredBasicRecs]

  // Remove duplicates (preferring contextual if type is the same)
  const uniqueRecommendations = allRecommendations.reduce((acc, current) => {
    const x = acc.find(item => item.type === current.type)
    if (!x) {
      return acc.concat([current])
    }
      return acc
    
  }, [] as { type: string; reason: string; insertBefore?: string }[])

  return uniqueRecommendations.slice(0, 4) // Limit to top 4 recommendations
}

// Replace the WorkflowEditor component implementation with this fixed version:
export const WorkflowEditor = ({
  onNodeSelect,
  selectedNode,
  nodes: externalNodes,
  setNodes: setExternalNodes,
  edges: externalEdges,
  setEdges: setExternalEdges,
  leftSidebarOpen,
  rightSidebarOpen,
  pipelineResults,
  onViewNodeHistory,
}: WorkflowEditorProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { theme } = useTheme()

  return (
    <div 
      className="flex-1 h-full w-full min-h-[500px] relative overflow-hidden" 
      style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}
      ref={reactFlowWrapper}
    >
      <ReactFlowProvider>
        <WorkflowEditorContent
          reactFlowWrapper={reactFlowWrapper}
          onNodeSelect={onNodeSelect}
          selectedNode={selectedNode}
          externalNodes={externalNodes}
          setExternalNodes={setExternalNodes}
          externalEdges={externalEdges}
          setExternalEdges={setExternalEdges}
          leftSidebarOpen={leftSidebarOpen}
          rightSidebarOpen={rightSidebarOpen}
          pipelineResults={pipelineResults}
          toast={toast}
          theme={theme}
          onViewNodeHistory={onViewNodeHistory}
        />
      </ReactFlowProvider>
    </div>
  )
}

// Create a new internal component that uses React Flow hooks safely inside the provider
interface WorkflowEditorContentProps {
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>
  onNodeSelect: (nodeId: string | null) => void
  selectedNode: string | null
  externalNodes: Node[]
  setExternalNodes: React.Dispatch<React.SetStateAction<Node[]>>
  externalEdges: Edge[]
  setExternalEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  pipelineResults: PipelineResult[]
  toast: ReturnType<typeof useToast>["toast"]
  theme: string | undefined
  onViewNodeHistory?: (nodeId: string) => void
}

const WorkflowEditorContent = ({
  reactFlowWrapper,
  onNodeSelect,
  selectedNode,
  externalNodes,
  setExternalNodes,
  externalEdges,
  setExternalEdges,
  leftSidebarOpen,
  rightSidebarOpen,
  pipelineResults,
  toast,
  theme,
  onViewNodeHistory,
}: WorkflowEditorContentProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(externalNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(externalEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [selectedElements, setSelectedElements] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string } | null>(null)
  const { project } = useReactFlow()
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [containerInitialized, setContainerInitialized] = useState(false)

  // Fix for the layout issue - ensure ReactFlow container properly initializes
  useEffect(() => {
    if (!reactFlowWrapper.current || !reactFlowInstance) return;

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (reactFlowInstance) {
        // Immediately update the flow
        reactFlowInstance.fitView({ padding: 0.2 });
        
        // Force a second update after a small delay to ensure everything is properly laid out
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.2 });
          setContainerInitialized(true);
        }, 300);
      }
    });

    // Start observing
    resizeObserver.observe(reactFlowWrapper.current);

    // Cleanup function
    return () => {
      if (reactFlowWrapper.current) {
        resizeObserver.unobserve(reactFlowWrapper.current);
      }
    };
  }, [reactFlowInstance, reactFlowWrapper]);

  // Trigger a layout adjustment when nodes change if container is initialized
  useEffect(() => {
    if (containerInitialized && reactFlowInstance && nodes.length > 0) {
      reactFlowInstance.fitView({ padding: 0.2 });
    }
  }, [containerInitialized, nodes, reactFlowInstance]);

  // When ReactFlow initializes, fit the view
  const onInit = useCallback((instance: any) => {
    setReactFlowInstance(instance);
    
    // Force a double fitView to ensure proper layout
    setTimeout(() => {
      instance.fitView({ padding: 0.2 });
      
      // Second fit view after a small delay
      setTimeout(() => {
        instance.fitView({ padding: 0.2 });
      }, 250);
    }, 100);
  }, []);

  // Sync external changes TO internal state
  useEffect(() => {
    // Only update if the external nodes are different from the internal ones
    // Basic length check first for performance
    if (externalNodes.length !== nodes.length || JSON.stringify(externalNodes) !== JSON.stringify(nodes)) {
       setNodes(externalNodes)
    }
  }, [externalNodes, setNodes])

  useEffect(() => {
    // Only update if the external edges are different from the internal ones
    if (externalEdges.length !== edges.length || JSON.stringify(externalEdges) !== JSON.stringify(edges)) {
      setEdges(externalEdges)
    }
  }, [externalEdges, setEdges])

  // Update nodes with status from results
  useEffect(() => {
    const statusMap = new Map(pipelineResults.map(r => [r.nodeId, r.status]))
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, status: statusMap.get(node.id) || null },
      }))
    )
  }, [pipelineResults, setNodes])

  // Keyboard shortcuts
  const deletePressed = useKeyPress("Delete")
  const copyPressed = useKeyPress(["Meta+c", "Ctrl+c"])
  const pastePressed = useKeyPress(["Meta+v", "Ctrl+v"])
  const undoPressed = useKeyPress(["Meta+z", "Ctrl+z"])
  const redoPressed = useKeyPress(["Meta+Shift+z", "Ctrl+Shift+z"])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (deletePressed && selectedElements.nodes.length > 0) {
      setNodes((nds) => nds.filter((node) => !selectedElements.nodes.some((n) => n.id === node.id)))
      setEdges((eds) => eds.filter((edge) => !selectedElements.edges.some((e) => e.id === edge.id)))
      toast({
        title: "Elements deleted",
        description: `Removed ${selectedElements.nodes.length} nodes and ${selectedElements.edges.length} edges`,
      })
    }
  }, [deletePressed, selectedElements, toast])

  const onConnect = useCallback(
    (params: Connection) => {
      // Check if connection is valid
      const sourceNode = nodes.find((node) => node.id === params.source)
      const targetNode = nodes.find((node) => node.id === params.target)

      if (sourceNode && targetNode) {
        // Get edge label based on node types
        const getEdgeLabel = () => {
          if (sourceNode.type === "data-source" && targetNode.type?.includes("preprocessing")) {
            return "raw data"
          }
          if (sourceNode.type?.includes("preprocessing") && targetNode.type?.includes("feature")) {
            return "processed data"
          }
          if (sourceNode.type?.includes("feature") && targetNode.type?.includes("model")) {
            return "features"
          }
          if (sourceNode.type?.includes("model") && targetNode.type?.includes("evaluation")) {
            return "predictions"
          }
          return "data flow"
        }

        // Special handling for conditional nodes
        if (sourceNode.type === "conditional-split" && params.sourceHandle === "bottom") {
          // Set edge style for false path
          setEdges((eds) =>
            addEdge(
              {
                ...params,
                type: "custom",
                animated: true,
                style: { stroke: theme === "dark" ? "#ef4444" : "#dc2626", strokeWidth: 2 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 15,
                  height: 15,
                  color: theme === "dark" ? "#ef4444" : "#dc2626",
                },
                data: {
                  label: "false",
                  condition: "false path",
                },
              },
              eds,
            ),
          )
        } else if (sourceNode.type === "conditional-split") {
          // Set edge style for true path
          setEdges((eds) =>
            addEdge(
              {
                ...params,
                type: "custom",
                animated: true,
                style: { stroke: theme === "dark" ? "#22c55e" : "#16a34a", strokeWidth: 2 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 15,
                  height: 15,
                  color: theme === "dark" ? "#22c55e" : "#16a34a",
                },
                data: {
                  label: "true",
                  condition: "true path",
                },
              },
              eds,
            ),
          )
        } else {
          // Regular connection
          setEdges((eds) =>
            addEdge(
              {
                ...params,
                type: "custom",
                animated: true,
                style: { stroke: theme === "dark" ? "#94a3b8" : "#64748b" },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 15,
                  height: 15,
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                },
                data: {
                  label: getEdgeLabel(),
                },
              },
              eds,
            ),
          )
        }

        toast({
          title: "Connection created",
          description: `Connected ${sourceNode.data.label || sourceNode.type} to ${targetNode.data.label || targetNode.type}`,
        })
      }
    },
    [nodes, theme, toast, setEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const type = event.dataTransfer.getData("application/reactflow")

      if (!type || !reactFlowBounds || !reactFlowInstance) {
        return
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}` },
      }

      setNodes((nds) => nds.concat(newNode))

      toast({
        title: "Component added",
        description: `Added ${type.replace(/-/g, " ")} to the pipeline`,
      })
    },
    [reactFlowInstance, setNodes, toast],
  )

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeRecommendations, setNodeRecommendations] = useState<{ type: string; reason: string; insertBefore?: string }[]>([])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.type || null)
      setSelectedNodeId(node.id)

      // Generate recommendations based on selected node and context
      const recommendations = getNodeRecommendations(node.id, nodes, edges)
      setNodeRecommendations(recommendations)
    },
    [onNodeSelect, nodes, edges] // Ensure nodes and edges are dependencies
  )

  const onPaneClick = useCallback(() => {
    onNodeSelect(null)
    setSelectedNodeId(null)
    setNodeRecommendations([])
    setContextMenu(null)
  }, [onNodeSelect])

  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedElements({ nodes, edges })
  }, [])

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Prevent native context menu from showing
      event.preventDefault()

      // Calculate position of the context menu
      const pane = reactFlowWrapper.current
      if (pane) {
        const { left, top } = pane.getBoundingClientRect()
        setContextMenu({
          x: event.clientX - left,
          y: event.clientY - top,
          nodeId: node.id,
        })
      }
    },
    [reactFlowWrapper],
  )

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      const pane = reactFlowWrapper.current
      if (pane) {
        const { left, top } = pane.getBoundingClientRect()
        setContextMenu({
          x: event.clientX - left,
          y: event.clientY - top,
        })
      }
    },
    [reactFlowWrapper],
  )

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setContextMenu(null)
      toast({
        title: "Node deleted",
        description: "Node removed from the pipeline",
      })
    },
    [setNodes, toast],
  )

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const nodeToClone = nodes.find((node) => node.id === nodeId)
      if (nodeToClone) {
        const newNode = {
          ...nodeToClone,
          id: `${nodeToClone.type}-${Date.now()}`,
          position: {
            x: nodeToClone.position.x + 50,
            y: nodeToClone.position.y + 50,
          },
        }
        setNodes((nds) => [...nds, newNode])
        setContextMenu(null)
        toast({
          title: "Node duplicated",
          description: "Created a copy of the node",
        })
      }
    },
    [nodes, setNodes, toast],
  )

  const handleAddNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}` },
      }
      setNodes((nds) => [...nds, newNode])
      setContextMenu(null)
      toast({
        title: "Node added",
        description: `Added ${type.replace(/-/g, " ")} to the pipeline`,
      })
    },
    [setNodes, toast],
  )

  const handleAddRecommendedNode = useCallback(
    (type: string, insertBefore?: string) => {
      if (!selectedNodeId) return

      const sourceNode = nodes.find(node => node.id === selectedNodeId)
      if (!sourceNode) return

      let newNodePosition: { x: number; y: number }
      let targetNodeId: string | null = null
      let targetHandle: string | null = null
      let sourceHandle: string | null = null

      // If inserting before a specific node
      if (insertBefore) {
        const targetNode = nodes.find(node => node.id === insertBefore)
        if (targetNode) {
          // Position the new node between source and target
          newNodePosition = {
            x: (sourceNode.position.x + targetNode.position.x) / 2,
            y: (sourceNode.position.y + targetNode.position.y) / 2,
          }
          targetNodeId = targetNode.id
          targetHandle = 'left' // New node connects to target's left
          sourceHandle = 'right' // Source node connects to new node's left
        } else {
          // Fallback if target node not found (shouldn't happen)
          newNodePosition = { x: sourceNode.position.x + 250, y: sourceNode.position.y }
          sourceHandle = 'right'
        }
      } else {
        // Standard append to the right
        newNodePosition = { x: sourceNode.position.x + 250, y: sourceNode.position.y }
        sourceHandle = 'right'
      }

      // Add the new node
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: newNodePosition,
        data: { label: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}` },
      }
      const newNodeId = newNode.id

      // --- Update Edges --- 
      let updatedEdges = edges
      
      // If inserting, remove the old edge between source and target
      if (insertBefore) {
        updatedEdges = edges.filter(edge => !(edge.source === selectedNodeId && edge.target === insertBefore))
      }
      
      setNodes((nds) => [...nds, newNode])
      setEdges(updatedEdges)

      // Connect source to new node
      setTimeout(() => {
        onConnect({
          source: selectedNodeId,
          target: newNodeId,
          sourceHandle: sourceHandle || 'right',
          targetHandle: 'left',
        })

        // If inserting, connect new node to target node
        if (insertBefore && targetNodeId) {
          onConnect({
            source: newNodeId,
            target: targetNodeId,
            sourceHandle: 'right',
            targetHandle: targetHandle || 'left',
          })
        }
      }, 100) // Delay to ensure node is rendered

      toast({
        title: "Node added",
        description: `Added recommended ${type.replace(/-/g, " ")} node${insertBefore ? ' and reconnected' : ' and connected'}`,
      })
      
      // Refresh recommendations
      setTimeout(() => {
        const recommendations = getNodeRecommendations(selectedNodeId, [...nodes, newNode], updatedEdges) // Use potentially updated state
        setNodeRecommendations(recommendations)
      }, 200)
    },
    [selectedNodeId, nodes, edges, setNodes, setEdges, onConnect, toast] // Added setEdges
  )

  // Fit view when sidebar collapses/expands
  useEffect(() => {
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 })
      }, 300) // Wait for sidebar animation to complete
    }
  }, [leftSidebarOpen, rightSidebarOpen, reactFlowInstance])

  // Add a function to auto-layout the nodes
  const autoLayoutNodes = useCallback(() => {
    if (nodes.length === 0) return

    const HORIZONTAL_SPACING = 250
    const VERTICAL_SPACING = 150

    // Group nodes by type or category to create "layers"
    const nodesByType: Record<string, Node[]> = {}

    // Categorize nodes
    nodes.forEach((node) => {
      const type = node.type || "default"
      if (!nodesByType[type]) {
        nodesByType[type] = []
      }
      nodesByType[type].push(node)
    })

    // Define the layer order
    const layerOrder = [
      "data-source",
      "data-preprocessing",
      "feature-engineering",
      "feature-extraction",
      "data-augmentation",
      "data-balancing",
      "sklearn-models",
      "tensorflow-models",
      "pytorch-models",
      "xgboost-models",
      "lightgbm-models",
      "catboost-models",
      "huggingface-models",
      "bert-model",
      "gpt-model",
      "vision-transformer",
      "conditional-split",
      "threshold-condition",
      "performance-trigger",
      "hyperparameter-tuning",
      "model-evaluation",
      "cross-validation",
      "visualization",
      "feature-importance",
      "workflow",
      "api-deployment",
      "batch-prediction",
      "model-monitoring",
      "model-versioning",
    ]

    // Initialize positions
    let xPosition = 100

    // Position nodes by layer
    layerOrder.forEach((layerType) => {
      if (nodesByType[layerType] && nodesByType[layerType].length > 0) {
        const layerNodes = nodesByType[layerType]

        // Position nodes vertically within the layer
        layerNodes.forEach((node, index) => {
          const yPosition = 100 + index * VERTICAL_SPACING

          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === node.id) {
                return {
                  ...n,
                  position: { x: xPosition, y: yPosition },
                }
              }
              return n
            }),
          )
        })

        // Move to the next horizontal position for the next layer
        xPosition += HORIZONTAL_SPACING
      }
    })

    // Handle any remaining nodes not in the defined layers
    const processedNodeIds = new Set(
      Object.values(nodesByType)
        .flat()
        .map((n) => n.id),
    )

    const remainingNodes = nodes.filter((n) => !processedNodeIds.has(n.id))

    if (remainingNodes.length > 0) {
      remainingNodes.forEach((node, index) => {
        const yPosition = 100 + index * VERTICAL_SPACING

        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return {
                ...n,
                position: { x: xPosition, y: yPosition },
              }
            }
            return n
          }),
        )
      })
    }

    // After positioning all nodes, fit the view to show everything
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 })
      }
    }, 100)
  }, [nodes, setNodes, reactFlowInstance])

  // Add after the component definition
  useEffect(() => {
    // Fix initial layout
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 })
      }, 100)
    }
  }, [reactFlowInstance])

  // Add hover handlers for edge highlighting
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id)
  }, [])

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null)
  }, [])

  // Apply highlighting to edges
  const highlightedEdges = useMemo(() => {
    if (!hoveredNodeId) return edges
    return edges.map(edge => ({
      ...edge,
      data: { ...edge.data, highlighted: edge.source === hoveredNodeId || edge.target === hoveredNodeId }
    }))
  }, [edges, hoveredNodeId])

  return (
    <ReactFlow
      nodes={nodes}
      edges={highlightedEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onInit={onInit}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onNodeClick={onNodeClick}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      onPaneClick={onPaneClick}
      onSelectionChange={onSelectionChange}
      onNodeContextMenu={onNodeContextMenu}
      onPaneContextMenu={onPaneContextMenu}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      snapToGrid
      snapGrid={[15, 15]}
      defaultViewport={{ x: 0, y: 0, zoom: 1.0 }}
      connectionLineType={ConnectionLineType.SmoothStep}
      connectionLineStyle={{ stroke: theme === "dark" ? "#94a3b8" : "#64748b", strokeWidth: 2 }}
      defaultMarkerColor={theme === "dark" ? "#94a3b8" : "#64748b"}
      defaultEdgeOptions={{
        type: "custom",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }}
      selectNodesOnDrag={false}
      multiSelectionKeyCode="Shift"
      className="bg-slate-50 dark:bg-slate-900/50"
      connectionRadius={25}
    >
      <Background color={theme === "dark" ? "#334155" : "#cbd5e1"} gap={20} size={1} variant={BackgroundVariant.Dots} />
      <Controls className="bg-background border shadow-md rounded-md overflow-hidden" showInteractive={false} />
      <MiniMap
        className="bg-background border shadow-md rounded-md overflow-hidden"
        nodeColor={(node) => {
          const status = node.data?.status
          if (status === 'error') return theme === 'dark' ? '#ef4444' : '#dc2626'
          if (status === 'warning') return theme === 'dark' ? '#f59e0b' : '#f97316'
          if (status === 'success') return theme === 'dark' ? '#22c55e' : '#16a34a'
          return theme === "dark" ? "#475569" : "#e2e8f0"
        }}
        maskColor={theme === "dark" ? "rgba(15, 23, 42, 0.7)" : "rgba(241, 245, 249, 0.7)"}
      />

      <Panel position="top-left" className="bg-background/80 backdrop-blur-sm p-2 rounded-md border shadow-sm m-4">
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="font-normal">
            {nodes.length} Nodes
          </Badge>
          <Badge variant="outline" className="font-normal">
            {edges.length} Connections
          </Badge>

          <Button variant="outline" size="sm" onClick={autoLayoutNodes} className="h-7 text-xs">
            Auto-layout
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <p>Drag components from the sidebar</p>
                  <p>Connect nodes by dragging between handles</p>
                  <p>Right-click for context menu</p>
                  <p>Delete: Del, Copy: Ctrl+C, Paste: Ctrl+V</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Panel>

      {selectedNodeId && nodeRecommendations.length > 0 && (
        <Panel position="top-right" className="bg-background/90 backdrop-blur-sm p-3 rounded-md border shadow-md m-4 max-w-xs">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Recommended Nodes</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {nodeRecommendations.some(r => r.insertBefore) 
                ? "Suggestions based on pipeline context (click to insert)" 
                : "Suggested next steps (click to add and connect)"}
            </div>
            <div className="space-y-2">
              {nodeRecommendations.map((rec) => (
                <TooltipProvider key={rec.type}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-xs h-auto py-2"
                        onClick={() => handleAddRecommendedNode(rec.type, rec.insertBefore)}
                      >
                        <div className="flex items-center gap-2">
                          <PlusCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <div className="flex flex-col items-start overflow-hidden">
                            <span className="font-medium truncate">{rec.type.replace(/-/g, " ")}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{rec.reason}</span>
                          </div>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs">
                        {rec.insertBefore 
                          ? `Insert ${rec.type.replace(/-/g, " ")} before target node` 
                          : `Add ${rec.type.replace(/-/g, " ")} after selected node`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </Panel>
      )}

      <MiniPipelineMap />

      {contextMenu && (
        <div
          className="absolute z-10 bg-background rounded-md border shadow-md py-1 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.nodeId ? (
            <>
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
                onClick={() => handleDuplicateNode(contextMenu.nodeId!)}
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
                onClick={() => handleDeleteNode(contextMenu.nodeId!)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                <span className="text-destructive">Delete</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel className="px-3 py-1.5 text-xs">Add Node</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
                onClick={() => {
                  if (contextMenu) {
                    const position = reactFlowInstance.screenToFlowPosition({
                      x: contextMenu.x,
                      y: contextMenu.y,
                    })
                    handleAddNode("data-source", position)
                  }
                }}
              >
                <Database className="h-3.5 w-3.5 text-blue-500" />
                <span>Data Source</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
                onClick={() => {
                  if (contextMenu) {
                    const position = reactFlowInstance.screenToFlowPosition({
                      x: contextMenu.x,
                      y: contextMenu.y,
                    })
                    handleAddNode("data-preprocessing", position)
                  }
                }}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-500" />
                <span>Data Preprocessing</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
                onClick={() => {
                  if (contextMenu) {
                    const position = reactFlowInstance.screenToFlowPosition({
                      x: contextMenu.x,
                      y: contextMenu.y,
                    })
                    handleAddNode("sklearn-models", position)
                  }
                }}
              >
                <Boxes className="h-3.5 w-3.5 text-yellow-500" />
                <span>Model</span>
              </DropdownMenuItem>
            </>
          )}
        </div>
      )}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/80 backdrop-blur-sm p-6 rounded-lg border shadow-sm max-w-md text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Your canvas is empty</h3>
            <p className="text-muted-foreground mb-4">
              Drag components from the left sidebar onto this canvas to start building your ML pipeline.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>Connect nodes by dragging between the handles</span>
            </div>
          </div>
        </div>
      )}
    </ReactFlow>
  )
}

const MiniPipelineMap = () => {
  // Access nodes and edges directly from the state object
  const nodes = useStore((state: any) => state.nodes) as Node[]
  const edges = useStore((state: any) => state.edges) as Edge[]
  
  if (!nodes || nodes.length === 0 || !edges) {
    return null
  }

  // Build an adjacency map of connected nodes
  const connectedNodes = new Set<string>()
  edges.forEach((edge: Edge) => {
    connectedNodes.add(edge.source)
    connectedNodes.add(edge.target)
  })

  // Filter to only show connected nodes
  const visibleNodes = nodes.filter((node: Node) => connectedNodes.has(node.id))

  return (
    <div className="fixed bottom-4 right-4 p-2 bg-background/80 backdrop-blur-sm border rounded-md shadow-md z-10">
      <div className="text-xs text-muted-foreground mb-1 font-medium text-center">Pipeline Overview</div>
      <div className="w-48 h-24 bg-slate-50 dark:bg-slate-900/50 relative rounded overflow-hidden border">
        {visibleNodes.map((node: Node) => {
          // Calculate relative position
          const minX = Math.min(...visibleNodes.map((n: Node) => n.position.x))
          const maxX = Math.max(...visibleNodes.map((n: Node) => n.position.x + (n.width || 150)))
          const minY = Math.min(...visibleNodes.map((n: Node) => n.position.y))
          const maxY = Math.max(...visibleNodes.map((n: Node) => n.position.y + (n.height || 40)))

          const width = maxX - minX || 1
          const height = maxY - minY || 1

          const relX = ((node.position.x - minX) / width) * 100
          const relY = ((node.position.y - minY) / height) * 100
          const relWidth = ((node.width || 150) / width) * 100
          const relHeight = ((node.height || 40) / height) * 100

          return (
            <div
              key={node.id}
              className="absolute bg-primary/80 rounded-sm"
              style={{
                left: `${relX}%`,
                top: `${relY}%`,
                width: `${relWidth}%`,
                height: `${relHeight}%`,
                minWidth: "2px",
                minHeight: "2px",
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

const getSortedNodes = (nodes: Node[], edges: Edge[]): Node[] => {
  const graph: Record<string, string[]> = {}
  const inDegree: Record<string, number> = {}
  
  nodes.forEach(node => {
    graph[node.id] = []
    inDegree[node.id] = 0
  })
  
  edges.forEach(edge => {
    if (graph[edge.source]) {
      graph[edge.source].push(edge.target)
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1
    }
  })
  
  const queue = nodes.filter(node => inDegree[node.id] === 0)
  const sorted: Node[] = []
  
  while (queue.length > 0) {
    const u = queue.shift()!
    sorted.push(u)
    
    graph[u.id].forEach(v => {
      inDegree[v]--
      if (inDegree[v] === 0) {
        const nodeV = nodes.find(n => n.id === v)
        if (nodeV) queue.push(nodeV)
      }
    })
  }
  
  if (sorted.length !== nodes.length) {
    console.warn("Topological sort failed, returning original order.")
    return nodes
  }
  
  return sorted
}

