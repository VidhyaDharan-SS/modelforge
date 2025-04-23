"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Save,
  Play,
  Download,
  Upload,
  Settings,
  Info,
  Clock,
  FileJson,
  PanelLeft,
  PanelRight,
  Folder,
  FilePlus,
  ChevronDown,
  BarChart3,
  ArrowRightLeft,
  History,
  Search,
  Star,
  Database,
  FileSpreadsheet,
  Boxes,
  Cog,
  Rocket,
  Sigma,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

type NodeType = {
  type: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  description: string;
  usageCount: number;
}

interface NavbarProps {
  pipelineName: string
  setPipelineName: (name: string) => void
  pipelineDescription: string
  setPipelineDescription: (desc: string) => void
  onSave: () => void
  onExport: (type: string) => void
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRun: () => void
  onNew: () => void
  onToggleLeftSidebar: () => void
  onToggleRightSidebar: () => void
  onShowSavedPipelines: () => void
  onShowPipelineInfo: () => void
  onToggleResults: () => void
  onShowComparison: () => void
  onShowSnapshots: () => void
  onShowTemplates?: () => void
  isSaving: boolean
  isExporting: boolean
  isRunning: boolean
  lastSaved: Date | null
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  hasResults?: boolean
  onAddNode?: (type: string) => void
}

export const Navbar = ({
  pipelineName,
  setPipelineName,
  pipelineDescription,
  setPipelineDescription,
  onSave,
  onExport,
  onImport,
  onRun,
  onNew,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onShowSavedPipelines,
  onShowPipelineInfo,
  onToggleResults,
  onShowComparison,
  onShowSnapshots,
  onShowTemplates,
  isSaving,
  isExporting,
  isRunning,
  lastSaved,
  leftSidebarOpen,
  rightSidebarOpen,
  hasResults = false,
  onAddNode,
}: NavbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showDocsDialog, setShowDocsDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [favoriteNodes, setFavoriteNodes] = useState<string[]>([])
  
  // Mock node types data for search (in a real app, this would come from the workflow editor component)
  const nodeTypes: NodeType[] = [
    { type: "data-source", label: "Data Source", icon: <Database className="h-4 w-4 text-blue-500" />, category: "Input", description: "Connect to data sources", usageCount: 10 },
    { type: "data-preprocessing", label: "Data Preprocessing", icon: <FileSpreadsheet className="h-4 w-4 text-green-500" />, category: "Processing", description: "Clean and transform data", usageCount: 8 },
    { type: "feature-engineering", label: "Feature Engineering", icon: <Boxes className="h-4 w-4 text-amber-500" />, category: "Processing", description: "Create new features", usageCount: 7 },
    { type: "sklearn-models", label: "Scikit-learn Models", icon: <Sigma className="h-4 w-4 text-rose-500" />, category: "Models", description: "Train ML models", usageCount: 15 },
    { type: "tensorflow-models", label: "TensorFlow Models", icon: <Sigma className="h-4 w-4 text-orange-500" />, category: "Models", description: "Deep learning models", usageCount: 5 },
    { type: "hyperparameter-tuning", label: "Hyperparameter Tuning", icon: <Cog className="h-4 w-4 text-purple-500" />, category: "Optimization", description: "Optimize model parameters", usageCount: 6 },
    { type: "model-evaluation", label: "Model Evaluation", icon: <BarChart3 className="h-4 w-4 text-indigo-500" />, category: "Evaluation", description: "Evaluate model performance", usageCount: 9 },
    { type: "api-deployment", label: "API Deployment", icon: <Rocket className="h-4 w-4 text-cyan-500" />, category: "Deployment", description: "Deploy models as APIs", usageCount: 3 },
  ];
  
  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteNodes');
    if (savedFavorites) {
      setFavoriteNodes(JSON.parse(savedFavorites));
    }
  }, []);
  
  // Save favorites to localStorage when they change
  useEffect(() => {
    localStorage.setItem('favoriteNodes', JSON.stringify(favoriteNodes));
  }, [favoriteNodes]);
  
  // Function to toggle a node as favorite
  const toggleFavorite = (nodeType: string) => {
    setFavoriteNodes(prev => {
      if (prev.includes(nodeType)) {
        return prev.filter(t => t !== nodeType);
      } else {
        return [...prev, nodeType];
      }
    });
  };
  
  // Get most used nodes for favorites
  const getMostUsedNodes = () => {
    return [...nodeTypes]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
  };
  
  // Filter nodes based on search query
  const filteredNodes = nodeTypes.filter(node => 
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSaved = () => {
    if (!lastSaved) return "Not saved yet"

    const now = new Date()
    const diffMs = now.getTime() - lastSaved.getTime()
    const diffMins = Math.round(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins === 1) return "1 minute ago"
    if (diffMins < 60) return `${diffMins} minutes ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return "1 hour ago"
    if (diffHours < 24) return `${diffHours} hours ago`

    return lastSaved.toLocaleString()
  }
  
  const handleAddNode = (nodeType: string) => {
    if (onAddNode) {
      onAddNode(nodeType);
    }
  };

  return (
    <>
      {/* Documentation Modal */}
      <Dialog open={showDocsDialog} onOpenChange={setShowDocsDialog}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About Modelforge ML</DialogTitle>
            <DialogDescription>
              Modelforge ML is a powerful machine learning pipeline builder that allows you to design, run, and deploy comprehensive ML workflows with ease.
              Enhance your productivity with intuitive drag-and-drop nodes, real-time results, and comparison tools for model tuning.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowDocsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleLeftSidebar}
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors",
              !leftSidebarOpen && "bg-muted/50"
            )}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          {/* Product Branding */}
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-amber-500" />
            <span className="font-bold text-xl bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              Modelforge ML
            </span>
          </div>

          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogTrigger asChild>
              <div className="flex flex-col cursor-pointer">
                <Input
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  className="h-9 w-64 font-medium transition-all focus-visible:ring-primary"
                  onClick={(e) => e.stopPropagation()}
                />
                {pipelineDescription && (
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-64">{pipelineDescription}</div>
                )}
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pipeline Details</DialogTitle>
                <DialogDescription>Edit your pipeline name and description</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={pipelineDescription}
                    onChange={(e) => setPipelineDescription(e.target.value)}
                    className="w-full resize-none"
                    rows={4}
                    placeholder="Describe what this pipeline does..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowDetailsDialog(false)}>Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {lastSaved && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs text-muted-foreground ml-2">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatLastSaved()}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last saved: {lastSaved.toLocaleString()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={onImport} accept=".json,.py,.ipynb" className="hidden" />

          <Button variant="outline" size="sm" onClick={onNew} className="transition-all hover:border-primary">
            <FilePlus className="h-4 w-4 mr-2" />
            New
          </Button>

          {onShowTemplates && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowTemplates}
              className="transition-all hover:border-primary"
            >
              <FileJson className="h-4 w-4 mr-2" />
              Templates
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onShowSavedPipelines}
            className="transition-all hover:border-primary"
          >
            <Folder className="h-4 w-4 mr-2" />
            Saved
          </Button>
          
          {/* Favorites dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="transition-all hover:border-primary">
                <Star className="h-4 w-4 mr-2" />
                Favorites
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-0">
              <div className="p-2 border-b">
                <h3 className="text-sm font-medium">Favorite Components</h3>
                <p className="text-xs text-muted-foreground">Most used nodes for quick access</p>
              </div>
              <ScrollArea className="h-52">
                <div className="p-2">
                  {getMostUsedNodes().map(node => (
                    <div 
                      key={node.type}
                      className="flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer group"
                      onClick={() => handleAddNode(node.type)}
                    >
                      <div className="flex items-center gap-2">
                        {node.icon}
                        <div>
                          <p className="text-xs font-medium">{node.label}</p>
                          <p className="text-xs text-muted-foreground">{node.usageCount} uses</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(node.type);
                        }}
                      >
                        <Star className={`h-3.5 w-3.5 ${favoriteNodes.includes(node.type) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Node search dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="transition-all hover:border-primary">
                <Search className="h-4 w-4 mr-2" />
                Search Nodes
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <div className="p-2 border-b">
                <Input
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <ScrollArea className="h-60">
                {filteredNodes.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No components matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="p-2">
                    {filteredNodes.map(node => (
                      <div 
                        key={node.type}
                        className="flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer group"
                        onClick={() => handleAddNode(node.type)}
                      >
                        <div className="flex items-center gap-2">
                          {node.icon}
                          <div>
                            <p className="text-xs font-medium">{node.label}</p>
                            <p className="text-xs text-muted-foreground">{node.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(node.type);
                          }}
                        >
                          <Star className={`h-3.5 w-3.5 ${favoriteNodes.includes(node.type) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="transition-all hover:border-primary"
          >
            <Save className={`h-4 w-4 mr-2 ${isSaving ? "animate-pulse" : ""}`} />
            {isSaving ? "Saving..." : "Save"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="transition-all hover:border-primary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting} className="transition-all hover:border-primary">
                <Download className={`h-4 w-4 mr-2 ${isExporting ? "animate-pulse" : ""}`} />
                {isExporting ? "Exporting..." : "Export"}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport("json")}>
                <FileJson className="h-4 w-4 mr-2" />
                Pipeline JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport("python")}>
                <FileJson className="h-4 w-4 mr-2" />
                Python Script
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("jupyter")}>
                <FileJson className="h-4 w-4 mr-2" />
                Jupyter Notebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("sklearn")}>
                <FileJson className="h-4 w-4 mr-2" />
                scikit-learn Pipeline
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasResults && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleResults}
              className="transition-all hover:border-primary text-primary"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Results
            </Button>
          )}

          <Separator orientation="vertical" className="h-6" />

          {/* Product Documentation / Help button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowDocsDialog(true)}>
                  <Info className="h-4 w-4 mr-2" />
                  Docs
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Learn more about Modelforge ML</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Pipeline Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onShowPipelineInfo}>
                <Info className="h-4 w-4 mr-2" />
                Pipeline Information
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleRightSidebar}
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors",
              !rightSidebarOpen && "bg-muted/50"
            )}
          >
            <PanelRight className="h-4 w-4" />
          </Button>

          <Button size="sm" onClick={onRun} disabled={isRunning} className="relative group">
            <Play className={`h-4 w-4 mr-2 ${isRunning ? "animate-pulse" : ""}`} />
            {isRunning ? "Running..." : "Run Pipeline"}
            <span className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                Ctrl+R
              </Badge>
            </span>
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onShowComparison}>
                  <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Compare</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Compare pipelines with A/B testing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onShowSnapshots}>
                  <History className="h-4 w-4 mr-1.5" />
                  <span className="hidden md:inline">History</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View pipeline snapshots</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </>
  )
}
