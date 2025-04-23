"use client"

import type React from "react"

import { useState } from "react"
import {
  Database,
  FileSpreadsheet,
  BarChart3,
  Boxes,
  Cog,
  LineChart,
  Workflow,
  Rocket,
  Sigma,
  Search,
  Filter,
  Star,
  Clock,
  Layers,
  ChevronLeft,
  BrainCircuit,
  CircleIcon as CircleStack,
  Code,
  GanttChart,
  PcCase,
  Share2,
  SquareStack,
  Clipboard,
  Sparkles,
  LayoutGrid,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

type ComponentCategory = "data" | "models" | "evaluation" | "deployment" | "transformers" | "conditional"

interface ComponentItem {
  id: string
  name: string
  icon: React.ElementType
  description: string
  category: ComponentCategory
  tags?: string[]
  isNew?: boolean
  isPremium?: boolean
  implementation?: string
  library?: string
}

const components: ComponentItem[] = [
  {
    id: "data-source",
    name: "Data Source",
    icon: Database,
    description: "Import data from CSV, databases, or APIs",
    category: "data",
    tags: ["import", "connect"],
    implementation: "pandas",
    library: "pandas",
  },
  {
    id: "data-preprocessing",
    name: "Data Preprocessing",
    icon: FileSpreadsheet,
    description: "Clean data, handle missing values, normalize features",
    category: "data",
    tags: ["clean", "transform"],
    implementation: "scikit-learn",
    library: "sklearn.preprocessing",
  },
  {
    id: "feature-engineering",
    name: "Feature Engineering",
    icon: Sigma,
    description: "Create new features, select important ones",
    category: "data",
    tags: ["features", "transform"],
    isNew: false,
    implementation: "scikit-learn",
    library: "sklearn.feature_selection",
  },
  {
    id: "feature-extraction",
    name: "Feature Extraction",
    icon: SquareStack,
    description: "Extract features from text, images, or other data types",
    category: "data",
    tags: ["extraction", "text", "image"],
    implementation: "scikit-learn",
    library: "sklearn.feature_extraction",
  },
  {
    id: "data-augmentation",
    name: "Data Augmentation",
    icon: Clipboard,
    description: "Generate synthetic data to improve model robustness",
    category: "data",
    tags: ["augment", "synthetic"],
    isNew: true,
    implementation: "imblearn",
    library: "imblearn.over_sampling",
  },
  {
    id: "data-balancing",
    name: "Data Balancing",
    icon: LayoutGrid,
    description: "Balance imbalanced datasets",
    category: "data",
    tags: ["balance", "sampling"],
    implementation: "imblearn",
    library: "imblearn",
  },
  {
    id: "sklearn-models",
    name: "Scikit-Learn Models",
    icon: Boxes,
    description: "Traditional ML algorithms like Random Forest, SVM",
    category: "models",
    tags: ["classification", "regression"],
    implementation: "scikit-learn",
    library: "sklearn.ensemble",
  },
  {
    id: "tensorflow-models",
    name: "TensorFlow Models",
    icon: BrainCircuit,
    description: "Deep learning models with neural networks",
    category: "models",
    tags: ["deep learning", "neural networks"],
    isPremium: false,
    implementation: "tensorflow",
    library: "tensorflow.keras",
  },
  {
    id: "pytorch-models",
    name: "PyTorch Models",
    icon: Boxes,
    description: "Research-oriented deep learning",
    category: "models",
    tags: ["deep learning", "research"],
    isPremium: false,
    implementation: "pytorch",
    library: "torch.nn",
  },
  {
    id: "xgboost-models",
    name: "XGBoost Models",
    icon: Boxes,
    description: "Gradient boosting algorithms for structured data",
    category: "models",
    tags: ["boosting", "trees"],
    implementation: "xgboost",
    library: "xgboost",
  },
  {
    id: "lightgbm-models",
    name: "LightGBM Models",
    icon: Sparkles,
    description: "Light Gradient Boosting Machine",
    category: "models",
    tags: ["boosting", "trees", "fast"],
    isNew: true,
    implementation: "lightgbm",
    library: "lightgbm",
  },
  {
    id: "catboost-models",
    name: "CatBoost Models",
    icon: Boxes,
    description: "Gradient boosting on decision trees",
    category: "models",
    tags: ["boosting", "trees", "categorical"],
    implementation: "catboost",
    library: "catboost",
  },
  {
    id: "huggingface-models",
    name: "Hugging Face Models",
    icon: Sparkles,
    description: "Pre-trained transformer models",
    category: "transformers",
    tags: ["nlp", "transformers", "pre-trained"],
    isNew: true,
    implementation: "transformers",
    library: "transformers",
  },
  {
    id: "bert-model",
    name: "BERT Model",
    icon: BrainCircuit,
    description: "Bidirectional Encoder Representations from Transformers",
    category: "transformers",
    tags: ["nlp", "transformers"],
    implementation: "transformers",
    library: "transformers",
  },
  {
    id: "gpt-model",
    name: "GPT Model",
    icon: BrainCircuit,
    description: "Generative Pre-trained Transformer",
    category: "transformers",
    tags: ["nlp", "transformers", "generative"],
    isNew: true,
    implementation: "transformers",
    library: "transformers",
  },
  {
    id: "vision-transformer",
    name: "Vision Transformer",
    icon: BrainCircuit,
    description: "Transformer models for computer vision",
    category: "transformers",
    tags: ["vision", "transformers"],
    isNew: true,
    implementation: "transformers",
    library: "transformers",
  },
  {
    id: "hyperparameter-tuning",
    name: "Hyperparameter Tuning",
    icon: Cog,
    description: "Optimize model parameters to improve performance",
    category: "evaluation",
    tags: ["optimization", "parameters"],
    implementation: "scikit-learn",
    library: "sklearn.model_selection",
  },
  {
    id: "model-evaluation",
    name: "Model Evaluation",
    icon: BarChart3,
    description: "Assess model performance with metrics",
    category: "evaluation",
    tags: ["metrics", "validation"],
    implementation: "scikit-learn",
    library: "sklearn.metrics",
  },
  {
    id: "cross-validation",
    name: "Cross Validation",
    icon: GanttChart,
    description: "Validate models with k-fold cross validation",
    category: "evaluation",
    tags: ["validation", "k-fold"],
    implementation: "scikit-learn",
    library: "sklearn.model_selection",
  },
  {
    id: "visualization",
    name: "Visualization",
    icon: LineChart,
    description: "Create charts and plots to understand data and results",
    category: "evaluation",
    tags: ["charts", "plots"],
    isNew: false,
    implementation: "matplotlib",
    library: "matplotlib.pyplot",
  },
  {
    id: "feature-importance",
    name: "Feature Importance",
    icon: BarChart3,
    description: "Analyze feature importance and model interpretability",
    category: "evaluation",
    tags: ["interpretability", "feature importance"],
    implementation: "shap",
    library: "shap",
  },
  {
    id: "conditional-split",
    name: "Conditional Split",
    icon: Share2,
    description: "Split pipeline flow based on conditions",
    category: "conditional",
    tags: ["flow", "conditional", "split"],
    isNew: true,
    implementation: "custom",
    library: "custom",
  },
  {
    id: "threshold-condition",
    name: "Threshold Condition",
    icon: Filter,
    description: "Apply actions based on threshold values",
    category: "conditional",
    tags: ["flow", "threshold", "condition"],
    isNew: true,
    implementation: "custom",
    library: "custom",
  },
  {
    id: "performance-trigger",
    name: "Performance Trigger",
    icon: Cog,
    description: "Trigger actions based on model performance",
    category: "conditional",
    tags: ["trigger", "performance", "metrics"],
    isNew: true,
    implementation: "custom",
    library: "custom",
  },
  {
    id: "workflow",
    name: "Workflow",
    icon: Workflow,
    description: "Orchestrate the entire ML pipeline process",
    category: "deployment",
    tags: ["orchestration", "automation"],
    implementation: "airflow",
    library: "airflow",
  },
  {
    id: "api-deployment",
    name: "API Deployment",
    icon: Rocket,
    description: "Serve your model as a REST API",
    category: "deployment",
    tags: ["api", "production"],
    isPremium: false,
    implementation: "flask",
    library: "flask",
  },
  {
    id: "batch-prediction",
    name: "Batch Prediction",
    icon: CircleStack,
    description: "Run batch predictions on large datasets",
    category: "deployment",
    tags: ["batch", "prediction"],
    implementation: "custom",
    library: "custom",
  },
  {
    id: "model-monitoring",
    name: "Model Monitoring",
    icon: PcCase,
    description: "Monitor model performance and data drift in production",
    category: "deployment",
    tags: ["monitoring", "drift", "production"],
    isNew: true,
    implementation: "custom",
    library: "custom",
  },
  {
    id: "model-versioning",
    name: "Model Versioning",
    icon: Code,
    description: "Version control for ML models",
    category: "deployment",
    tags: ["versioning", "mlops"],
    implementation: "mlflow",
    library: "mlflow",
  },
]

interface ToolboxSidebarProps {
  onClose: () => void
}

export const ToolboxSidebar = ({ onClose }: ToolboxSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | "all">("all")
  const [viewMode, setViewMode] = useState<"all" | "favorites" | "recent">("all")
  const [sidebarWidth, setSidebarWidth] = useState<"narrow" | "normal">("normal")

  const toggleSidebarWidth = () => {
    setSidebarWidth(sidebarWidth === "normal" ? "narrow" : "normal")
  }

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }

  const filteredComponents = components.filter((component) => {
    const matchesSearch =
      searchQuery === "" ||
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      component.implementation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.library?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === "all" || component.category === selectedCategory

    if (viewMode === "favorites") {
      return (
        matchesSearch &&
        matchesCategory &&
        ["sklearn-models", "data-preprocessing", "tensorflow-models", "huggingface-models"].includes(component.id)
      )
    } else if (viewMode === "recent") {
      return (
        matchesSearch &&
        matchesCategory &&
        ["feature-engineering", "visualization", "data-augmentation", "conditional-split"].includes(component.id)
      )
    }

    return matchesSearch && matchesCategory
  })

  const groupedComponents = filteredComponents.reduce(
    (acc, component) => {
      if (!acc[component.category]) {
        acc[component.category] = []
      }
      acc[component.category].push(component)
      return acc
    },
    {} as Record<ComponentCategory, ComponentItem[]>,
  )

  const getCategoryName = (category: string) => {
    switch (category) {
      case "data":
        return "Data Processing"
      case "models":
        return "ML Models"
      case "transformers":
        return "Transformer Models"
      case "evaluation":
        return "Evaluation & Metrics"
      case "conditional":
        return "Flow Control"
      case "deployment":
        return "Deployment & MLOps"
      default:
        return category.charAt(0).toUpperCase() + category.slice(1)
    }
  }

  return (
    <div
      className={cn(
        "border-r h-full bg-background flex flex-col z-10 transition-all duration-300 flex-shrink-0",
        sidebarWidth === "normal" ? "w-64" : "w-16",
      )}
    >
      {sidebarWidth === "normal" ? (
        <>
          <div className="border-b flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Components</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleSidebarWidth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="px-2 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8"
              />
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full flex-1 flex flex-col">
            <div className="px-2">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="all" onClick={() => setViewMode("all")} className="text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="favorites" onClick={() => setViewMode("favorites")} className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Favorites
                </TabsTrigger>
                <TabsTrigger value="recent" onClick={() => setViewMode("recent")} className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Recent
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="px-2 py-2">
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedCategory("all")}
                >
                  All
                </Badge>
                <Badge
                  variant={selectedCategory === "data" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedCategory("data")}
                >
                  Data
                </Badge>
                <Badge
                  variant={selectedCategory === "models" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedCategory("models")}
                >
                  Models
                </Badge>
                <Badge
                  variant={selectedCategory === "transformers" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedCategory("transformers")}
                >
                  Transformers
                </Badge>
                <Badge
                  variant={selectedCategory === "evaluation" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedCategory("evaluation")}
                >
                  Evaluation
                </Badge>
                <Badge
                  variant={selectedCategory === "conditional" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedCategory("conditional")}
                >
                  Flow
                </Badge>
                <Badge
                  variant={selectedCategory === "deployment" ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedCategory("deployment")}
                >
                  Deploy
                </Badge>
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto h-full">
              <TabsContent value="all" className="m-0">
                {Object.entries(groupedComponents).length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No components match your search</div>
                ) : (
                  Object.entries(groupedComponents).map(([category, items]) => (
                    <Collapsible key={category} defaultOpen={true}>
                      <div className="relative flex w-full min-w-0 flex-col p-2">
                        <CollapsibleTrigger className="w-full">
                          <div className="duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-foreground/70 outline-none ring-ring transition-[margin,opa] ease-linear focus-visible:ring-2 justify-between">
                            <span className="capitalize">{getCategoryName(category)}</span>
                            <Filter className="h-3 w-3" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="w-full text-sm">
                            <ul className="flex w-full min-w-0 flex-col gap-1">
                              {items.map((component) => (
                                <li key={component.id} className="group/menu-item relative">
                                  <div
                                    draggable
                                    onDragStart={(e) => onDragStart(e, component.id)}
                                    className={cn(
                                      "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-ring transition-[width,height,padding] hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 h-8 cursor-grab"
                                    )}
                                  >
                                    <component.icon
                                      className={cn(
                                        "mr-2 transition-transform group-hover:scale-110",
                                        component.isPremium ? "text-amber-500" : "",
                                        component.isNew ? "text-green-500" : "",
                                      )}
                                    />
                                    <span className="truncate">{component.name}</span>
                                    {!component.isNew && !component.isPremium && component.library && (
                                      <div className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground">
                                        {component.library}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))
                )}
              </TabsContent>

              <TabsContent value="favorites" className="m-0">
                {filteredComponents.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No favorite components found</div>
                ) : (
                  <div className="relative flex w-full min-w-0 flex-col p-2">
                    <div className="duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-foreground/70">
                      Favorites
                    </div>
                    <div className="w-full text-sm">
                      <ul className="flex w-full min-w-0 flex-col gap-1">
                        {filteredComponents.map((component) => (
                          <li key={component.id} className="group/menu-item relative">
                            <div
                              draggable
                              onDragStart={(e) => onDragStart(e, component.id)}
                              className={cn(
                                "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-ring transition-[width,height,padding] hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 h-8 cursor-grab"
                              )}
                            >
                              <component.icon
                                className={cn(
                                  "mr-2 transition-transform group-hover:scale-110",
                                  component.isPremium ? "text-amber-500" : "",
                                  component.isNew ? "text-green-500" : "",
                                )}
                              />
                              <span className="truncate">{component.name}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent" className="m-0">
                {filteredComponents.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No recent components found</div>
                ) : (
                  <div className="relative flex w-full min-w-0 flex-col p-2">
                    <div className="duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-foreground/70">
                      Recently Used
                    </div>
                    <div className="w-full text-sm">
                      <ul className="flex w-full min-w-0 flex-col gap-1">
                        {filteredComponents.map((component) => (
                          <li key={component.id} className="group/menu-item relative">
                            <div
                              draggable
                              onDragStart={(e) => onDragStart(e, component.id)}
                              className={cn(
                                "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-ring transition-[width,height,padding] hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 h-8 cursor-grab"
                              )}
                            >
                              <component.icon
                                className={cn(
                                  "mr-2 transition-transform group-hover:scale-110",
                                  component.isPremium ? "text-amber-500" : "",
                                  component.isNew ? "text-green-500" : "",
                                )}
                              />
                              <span className="truncate">{component.name}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="border-t p-2 text-xs text-muted-foreground">
            <p className="text-center mb-1">Drag components onto the canvas</p>
            <p className="text-center">Right-click for more options</p>
          </div>
        </>
      ) : (
        <div className="flex flex-col h-full">
          <div className="border-b flex items-center justify-center p-2">
            <Button variant="ghost" size="icon" onClick={toggleSidebarWidth} className="h-9 w-9">
              <Layers className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto h-full">
            <div className="flex flex-col gap-1 p-2">
              {Object.entries(groupedComponents).map(([category, items]) => (
                <div key={category} className="mb-4">
                  <div className="text-[10px] text-muted-foreground uppercase mb-2 text-center font-semibold">
                    {category.substring(0, 4)}
                  </div>
                  {items.slice(0, 5).map((component) => (
                    <div
                      key={component.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, component.id)}
                      className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-grab mb-1 mx-auto group relative"
                      title={component.name}
                    >
                      <component.icon className="h-5 w-5" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t p-2 flex justify-center">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
