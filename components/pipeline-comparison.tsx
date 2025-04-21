"use client"

import { useState } from "react"
import { X, ArrowRightLeft, BarChart3, Play, SquareStack, Check, LineChart, Info, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { PipelineData, PipelineResult } from "@/components/pipeline-builder"

interface PipelineComparisonProps {
  savedPipelines: PipelineData[]
  onClose: () => void
  onRunComparison: (pipelineA: PipelineData, pipelineB: PipelineData) => void
  resultsA: PipelineResult[]
  resultsB: PipelineResult[]
  isRunning: boolean
  onLoadPipeline: (pipeline: PipelineData) => void
}

export const PipelineComparison = ({
  savedPipelines,
  onClose,
  onRunComparison,
  resultsA,
  resultsB,
  isRunning,
  onLoadPipeline,
}: PipelineComparisonProps) => {
  const [pipelineAId, setPipelineAId] = useState<string | null>(null)
  const [pipelineBId, setPipelineBId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("overview")
  
  const pipelineA = savedPipelines.find(p => p.id === pipelineAId)
  const pipelineB = savedPipelines.find(p => p.id === pipelineBId)
  
  const canCompare = pipelineAId && pipelineBId && pipelineAId !== pipelineBId
  
  // Calculate aggregate metrics for both pipelines
  const calculateMetrics = (results: PipelineResult[]) => {
    const metrics: Record<string, number> = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      auc: 0,
      count: 0
    }
    
    results.forEach(result => {
      if (result.metrics) {
        result.metrics.forEach(metric => {
          const name = metric.name.toLowerCase()
          if (
            name.includes('accuracy') || 
            name.includes('precision') || 
            name.includes('recall') || 
            name.includes('f1') || 
            name.includes('auc')
          ) {
            const key = name.includes('accuracy') ? 'accuracy' :
                      name.includes('precision') ? 'precision' :
                      name.includes('recall') ? 'recall' :
                      name.includes('f1') ? 'f1Score' :
                      name.includes('auc') ? 'auc' : ''
            
            if (key) {
              metrics[key] += metric.value
              metrics.count++
            }
          }
        })
      }
    })
    
    // Calculate averages
    Object.keys(metrics).forEach(key => {
      if (key !== 'count' && metrics.count > 0) {
        metrics[key] = metrics[key] / metrics.count
      }
    })
    
    return metrics
  }
  
  const metricsA = calculateMetrics(resultsA)
  const metricsB = calculateMetrics(resultsB)
  
  // Get the pipeline that performed better overall
  const getBetterPipeline = () => {
    if (!metricsA.count || !metricsB.count) return null
    
    // Compare accuracy, precision, recall, f1, auc
    const scoreA = metricsA.accuracy + metricsA.precision + metricsA.recall + metricsA.f1Score + (metricsA.auc || 0)
    const scoreB = metricsB.accuracy + metricsB.precision + metricsB.recall + metricsB.f1Score + (metricsB.auc || 0)
    
    return scoreA > scoreB ? 'A' : 'B'
  }
  
  const betterPipeline = getBetterPipeline()
  
  // Calculate improvement percentages
  const calculateImprovement = (metricA: number, metricB: number) => {
    if (!metricA || !metricB) return 0
    return ((metricB - metricA) / metricA) * 100
  }
  
  const improvements = {
    accuracy: calculateImprovement(metricsA.accuracy, metricsB.accuracy),
    precision: calculateImprovement(metricsA.precision, metricsB.precision),
    recall: calculateImprovement(metricsA.recall, metricsB.recall),
    f1Score: calculateImprovement(metricsA.f1Score, metricsB.f1Score),
    auc: metricsA.auc && metricsB.auc ? calculateImprovement(metricsA.auc, metricsB.auc) : 0
  }
  
  // Determine structural differences between pipelines
  const getPipelineDifferences = () => {
    if (!pipelineA || !pipelineB) return []
    
    const differences = []
    
    // Check node count differences
    if (pipelineA.nodes.length !== pipelineB.nodes.length) {
      differences.push(`Different number of nodes: ${pipelineA.nodes.length} vs ${pipelineB.nodes.length}`)
    }
    
    // Check for different node types
    const nodeTypesA = pipelineA.nodes.map(n => n.type).sort().join(',')
    const nodeTypesB = pipelineB.nodes.map(n => n.type).sort().join(',')
    
    if (nodeTypesA !== nodeTypesB) {
      differences.push('Different node types or configurations')
    }
    
    // Check connection differences
    if (pipelineA.edges.length !== pipelineB.edges.length) {
      differences.push(`Different connections between nodes: ${pipelineA.edges.length} vs ${pipelineB.edges.length}`)
    }
    
    return differences
  }
  
  const differences = getPipelineDifferences()
  
  // Generate a report summary
  const getComparisonSummary = () => {
    if (!pipelineA || !pipelineB || !betterPipeline) return ''
    
    const betterName = betterPipeline === 'A' ? pipelineA.name : pipelineB.name
    const improvement = betterPipeline === 'B' ? improvements.accuracy : -improvements.accuracy
    
    return `Pipeline ${betterPipeline} (${betterName}) performed better with ${Math.abs(improvement).toFixed(2)}% ${improvement > 0 ? 'improvement' : 'difference'} in accuracy.`
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[85vh] flex flex-col">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Pipeline Comparison & A/B Testing
            </CardTitle>
            <CardDescription>Compare performance between different pipeline configurations</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Pipeline A</label>
              <Select
                value={pipelineAId || ''}
                onValueChange={(value) => setPipelineAId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select pipeline A" />
                </SelectTrigger>
                <SelectContent>
                  {savedPipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Pipeline B</label>
              <Select
                value={pipelineBId || ''}
                onValueChange={(value) => setPipelineBId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select pipeline B" />
                </SelectTrigger>
                <SelectContent>
                  {savedPipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {canCompare && (
            <div className="flex justify-center">
              <Button 
                variant="default" 
                className="gap-2" 
                disabled={isRunning || !canCompare}
                onClick={() => {
                  if (pipelineA && pipelineB) {
                    onRunComparison(pipelineA, pipelineB)
                  }
                }}
              >
                {isRunning ? <Info className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {isRunning ? "Running Comparison..." : "Run A/B Test"}
              </Button>
            </div>
          )}
          
          {(resultsA.length > 0 || resultsB.length > 0) && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
                <TabsTrigger value="structure">Pipeline Structure</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="overview" className="mt-0">
                  {betterPipeline && (
                    <div className="bg-primary/10 p-4 rounded-lg mb-6">
                      <div className="flex items-center gap-2 text-primary font-medium mb-2">
                        <Check className="h-5 w-5" />
                        <h3 className="text-lg">Pipeline Comparison Results</h3>
                      </div>
                      <p>{getComparisonSummary()}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-base">Pipeline A {pipelineA?.name && `(${pipelineA.name})`}</CardTitle>
                          {betterPipeline === 'A' && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                              Better
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Accuracy</span>
                            <span className="font-medium">{metricsA.accuracy ? metricsA.accuracy.toFixed(4) : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Precision</span>
                            <span className="font-medium">{metricsA.precision ? metricsA.precision.toFixed(4) : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Recall</span>
                            <span className="font-medium">{metricsA.recall ? metricsA.recall.toFixed(4) : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">F1 Score</span>
                            <span className="font-medium">{metricsA.f1Score ? metricsA.f1Score.toFixed(4) : 'N/A'}</span>
                          </div>
                          {metricsA.auc > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm">AUC</span>
                              <span className="font-medium">{metricsA.auc.toFixed(4)}</span>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-6"
                          onClick={() => pipelineA && onLoadPipeline(pipelineA)}
                        >
                          <SquareStack className="h-4 w-4 mr-2" />
                          Load Pipeline A
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-base">Pipeline B {pipelineB?.name && `(${pipelineB.name})`}</CardTitle>
                          {betterPipeline === 'B' && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                              Better
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Accuracy</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{metricsB.accuracy ? metricsB.accuracy.toFixed(4) : 'N/A'}</span>
                              {improvements.accuracy !== 0 && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    improvements.accuracy > 0 
                                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                                      : "bg-red-500/10 text-red-500 border-red-500/20"
                                  )}
                                >
                                  {improvements.accuracy > 0 ? '+' : ''}{improvements.accuracy.toFixed(2)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Precision</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{metricsB.precision ? metricsB.precision.toFixed(4) : 'N/A'}</span>
                              {improvements.precision !== 0 && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    improvements.precision > 0 
                                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                                      : "bg-red-500/10 text-red-500 border-red-500/20"
                                  )}
                                >
                                  {improvements.precision > 0 ? '+' : ''}{improvements.precision.toFixed(2)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Recall</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{metricsB.recall ? metricsB.recall.toFixed(4) : 'N/A'}</span>
                              {improvements.recall !== 0 && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    improvements.recall > 0 
                                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                                      : "bg-red-500/10 text-red-500 border-red-500/20"
                                  )}
                                >
                                  {improvements.recall > 0 ? '+' : ''}{improvements.recall.toFixed(2)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">F1 Score</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{metricsB.f1Score ? metricsB.f1Score.toFixed(4) : 'N/A'}</span>
                              {improvements.f1Score !== 0 && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    improvements.f1Score > 0 
                                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                                      : "bg-red-500/10 text-red-500 border-red-500/20"
                                  )}
                                >
                                  {improvements.f1Score > 0 ? '+' : ''}{improvements.f1Score.toFixed(2)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          {metricsB.auc > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm">AUC</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{metricsB.auc.toFixed(4)}</span>
                                {improvements.auc !== 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      improvements.auc > 0 
                                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                                        : "bg-red-500/10 text-red-500 border-red-500/20"
                                    )}
                                  >
                                    {improvements.auc > 0 ? '+' : ''}{improvements.auc.toFixed(2)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-6"
                          onClick={() => pipelineB && onLoadPipeline(pipelineB)}
                        >
                          <SquareStack className="h-4 w-4 mr-2" />
                          Load Pipeline B
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {differences.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-base font-medium mb-2">Key Differences</h3>
                      <ul className="space-y-1">
                        {differences.map((diff, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                            {diff}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="metrics" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Metric Charts</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Accuracy Comparison</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-end h-40 mt-4">
                              <div className="flex flex-col items-center flex-1">
                                <div 
                                  className="w-16 bg-blue-500 rounded-t-sm transition-all duration-500" 
                                  style={{ height: `${(metricsA.accuracy || 0) * 100}%` }}
                                />
                                <span className="mt-2 text-xs">Pipeline A</span>
                                <span className="text-xs font-medium">{metricsA.accuracy ? metricsA.accuracy.toFixed(4) : 'N/A'}</span>
                              </div>
                              <div className="flex flex-col items-center flex-1">
                                <div 
                                  className="w-16 bg-green-500 rounded-t-sm transition-all duration-500" 
                                  style={{ height: `${(metricsB.accuracy || 0) * 100}%` }}
                                />
                                <span className="mt-2 text-xs">Pipeline B</span>
                                <span className="text-xs font-medium">{metricsB.accuracy ? metricsB.accuracy.toFixed(4) : 'N/A'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">F1 Score Comparison</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-end h-40 mt-4">
                              <div className="flex flex-col items-center flex-1">
                                <div 
                                  className="w-16 bg-purple-500 rounded-t-sm transition-all duration-500" 
                                  style={{ height: `${(metricsA.f1Score || 0) * 100}%` }}
                                />
                                <span className="mt-2 text-xs">Pipeline A</span>
                                <span className="text-xs font-medium">{metricsA.f1Score ? metricsA.f1Score.toFixed(4) : 'N/A'}</span>
                              </div>
                              <div className="flex flex-col items-center flex-1">
                                <div 
                                  className="w-16 bg-violet-500 rounded-t-sm transition-all duration-500" 
                                  style={{ height: `${(metricsB.f1Score || 0) * 100}%` }}
                                />
                                <span className="mt-2 text-xs">Pipeline B</span>
                                <span className="text-xs font-medium">{metricsB.f1Score ? metricsB.f1Score.toFixed(4) : 'N/A'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Node-by-Node Performance</h3>
                      <div className="space-y-4">
                        {resultsA.length > 0 && resultsB.length > 0 && (
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Pipeline A Nodes</h4>
                              {resultsA.map((result) => (
                                <Card key={result.nodeId} className="overflow-hidden">
                                  <CardHeader className="py-2">
                                    <CardTitle className="text-sm">{result.nodeName}</CardTitle>
                                  </CardHeader>
                                  <CardContent className="py-2">
                                    {result.metrics && result.metrics.length > 0 ? (
                                      <div className="grid grid-cols-2 gap-2">
                                        {result.metrics.map((metric) => (
                                          <div key={metric.name} className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{metric.name}:</span>
                                            <span className="font-medium">{metric.value.toFixed(4)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No metrics available</span>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Pipeline B Nodes</h4>
                              {resultsB.map((result) => (
                                <Card key={result.nodeId} className="overflow-hidden">
                                  <CardHeader className="py-2">
                                    <CardTitle className="text-sm">{result.nodeName}</CardTitle>
                                  </CardHeader>
                                  <CardContent className="py-2">
                                    {result.metrics && result.metrics.length > 0 ? (
                                      <div className="grid grid-cols-2 gap-2">
                                        {result.metrics.map((metric) => (
                                          <div key={metric.name} className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{metric.name}:</span>
                                            <span className="font-medium">{metric.value.toFixed(4)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No metrics available</span>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="structure" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Pipeline Structure Comparison</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Pipeline A Structure</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {pipelineA ? (
                              <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                  <span>Nodes:</span>
                                  <span className="font-medium">{pipelineA.nodes.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Connections:</span>
                                  <span className="font-medium">{pipelineA.edges.length}</span>
                                </div>
                                <div>
                                  <span className="text-sm">Node Types:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Array.from(new Set(pipelineA.nodes.map(n => n.type))).map((type, index) => (
                                      <Badge key={index} variant="outline">
                                        {type}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">No pipeline selected</div>
                            )}
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Pipeline B Structure</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {pipelineB ? (
                              <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                  <span>Nodes:</span>
                                  <span className="font-medium">{pipelineB.nodes.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Connections:</span>
                                  <span className="font-medium">{pipelineB.edges.length}</span>
                                </div>
                                <div>
                                  <span className="text-sm">Node Types:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Array.from(new Set(pipelineB.nodes.map(n => n.type))).map((type, index) => (
                                      <Badge key={index} variant="outline">
                                        {type}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">No pipeline selected</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    
                    {pipelineA && pipelineB && (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Key Structural Differences</h3>
                        {differences.length > 0 ? (
                          <div className="space-y-2">
                            {differences.map((diff, i) => (
                              <div key={i} className="bg-muted rounded-md p-3">
                                <div className="flex items-center gap-2">
                                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                                  <span>{diff}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No significant structural differences detected
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </CardContent>
        
        <CardFooter className="border-t p-4 flex justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" disabled={!betterPipeline}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Comparison Report
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download comparison results as PDF or CSV</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 