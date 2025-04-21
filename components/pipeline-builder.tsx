"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { ToolboxSidebar } from "@/components/toolbox-sidebar"
import { AgentSidebar } from "@/components/agent-sidebar"
import { WorkflowEditor } from "@/components/workflow-editor"
import { Navbar } from "@/components/navbar"
import { SavedPipelines } from "@/components/saved-pipelines"
import { PipelineResults } from "@/components/pipeline-results"
import { PipelineInfoModal } from "@/components/pipeline-info-modal"
import { PipelineComparison } from "@/components/pipeline-comparison"
import { SnapshotHistory } from "@/components/snapshot-history"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import type { Node, Edge } from "reactflow"
import { parseImportedPipeline } from "@/utils/pipeline-parser"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Add type for Data Preview
export type DataPreview = {
  shape?: string // e.g., "(1000, 15)"
  columns?: string[] // e.g., ["col1", "col2", "col3", ...]
  metrics?: Record<string, string | number> // e.g., { "Missing Values": "5%" }
}

// Add type for Pipeline Snapshots
export type PipelineSnapshot = {
  timestamp: Date
  name?: string // Optional name for the snapshot
  nodes: Node[]
  edges: Edge[]
}

export type PipelineData = {
  id: string
  name: string
  nodes: Node[]
  edges: Edge[]
  lastSaved?: Date
  description?: string
}

export type PipelineResult = {
  nodeId: string
  nodeName: string
  output: any
  metrics?: {
    name: string
    value: number
  }[]
  timestamp: Date
  status: "success" | "error" | "warning"
  message?: string
}

export type NodeVersion = {
  timestamp: Date;
  nodeId: string;
  label: string;
  type: string;
  data: any;
}

export const PipelineBuilder = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [pipelineName, setPipelineName] = useState("Untitled Pipeline")
  const [pipelineDescription, setPipelineDescription] = useState("")
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [savedPipelines, setSavedPipelines] = useState<PipelineData[]>([])
  const [showSavedPipelines, setShowSavedPipelines] = useState(false)
  const [pipelineResults, setPipelineResults] = useState<PipelineResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showPipelineInfo, setShowPipelineInfo] = useState(false)
  const [modelMetrics, setModelMetrics] = useState<Record<string, number>>({})
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonResultsA, setComparisonResultsA] = useState<PipelineResult[]>([])
  const [comparisonResultsB, setComparisonResultsB] = useState<PipelineResult[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [snapshots, setSnapshots] = useState<PipelineSnapshot[]>([])
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [nodeVersions, setNodeVersions] = useState<Record<string, NodeVersion[]>>({})
  const [showNodeHistory, setShowNodeHistory] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const genericFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { theme } = useTheme()
  
  // Track node changes
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Compare with previous nodes (stored in localStorage)
    const previousNodesStr = localStorage.getItem('ml-previous-nodes');
    if (!previousNodesStr) {
      // First time - just save current nodes
      localStorage.setItem('ml-previous-nodes', JSON.stringify(nodes));
      return;
    }
    
    try {
      const previousNodes = JSON.parse(previousNodesStr) as Node[];
      
      // Find changed nodes
      nodes.forEach(currentNode => {
        const previousNode = previousNodes.find(n => n.id === currentNode.id);
        
        // If node is new or changed, record a version
        if (!previousNode || JSON.stringify(currentNode.data) !== JSON.stringify(previousNode.data)) {
          const nodeVersion: NodeVersion = {
            timestamp: new Date(),
            nodeId: currentNode.id,
            label: currentNode.data.label || 'Unnamed Node',
            type: currentNode.type || 'unknown',
            data: currentNode.data
          };
          
          // Update node versions
          setNodeVersions(prev => {
            const updatedVersions = { ...prev };
            if (!updatedVersions[currentNode.id]) {
              updatedVersions[currentNode.id] = [];
            }
            // Only add if different from last version
            const lastVersion = updatedVersions[currentNode.id][0];
            if (!lastVersion || JSON.stringify(lastVersion.data) !== JSON.stringify(nodeVersion.data)) {
              updatedVersions[currentNode.id] = [nodeVersion, ...updatedVersions[currentNode.id]].slice(0, 10); // Keep max 10 versions
            }
            return updatedVersions;
          });
        }
      });
      
      // Update stored previous nodes
      localStorage.setItem('ml-previous-nodes', JSON.stringify(nodes));
    } catch (e) {
      console.error('Error tracking node changes:', e);
    }
  }, [nodes]);
  
  // Load node versions from localStorage on mount
  useEffect(() => {
    const savedNodeVersions = localStorage.getItem('ml-node-versions');
    if (savedNodeVersions) {
      try {
        const parsedVersions = JSON.parse(savedNodeVersions) as Record<string, NodeVersion[]>;
        // Convert timestamps to Date objects
        Object.keys(parsedVersions).forEach(nodeId => {
          parsedVersions[nodeId] = parsedVersions[nodeId].map(version => ({
            ...version,
            timestamp: new Date(version.timestamp)
          }));
        });
        setNodeVersions(parsedVersions);
      } catch (e) {
        console.error('Error loading node versions:', e);
      }
    }
  }, []);
  
  // Save node versions to localStorage when they change
  useEffect(() => {
    if (Object.keys(nodeVersions).length > 0) {
      localStorage.setItem('ml-node-versions', JSON.stringify(nodeVersions));
    }
  }, [nodeVersions]);
  
  // Function to restore a node to a previous version
  const restoreNodeVersion = (nodeId: string, version: NodeVersion) => {
    setNodes(currentNodes => 
      currentNodes.map(node => 
        node.id === nodeId
          ? { ...node, data: { ...version.data } }
          : node
      )
    );
    
    toast({
      title: "Node restored",
      description: `Restored node "${version.label}" to version from ${version.timestamp.toLocaleString()}`,
    });
    
    setShowNodeHistory(null);
  };

  // Pipeline templates for common ML workflows
  const pipelineTemplates = [
    {
      id: "classification",
      name: "Classification Pipeline",
      description: "A standard pipeline for binary or multi-class classification tasks",
      nodes: [
        {
          id: "data-source-1",
          type: "data-source",
          position: { x: 100, y: 200 },
          data: { label: "Data Source" }
        },
        {
          id: "preprocessing-1",
          type: "data-preprocessing",
          position: { x: 350, y: 200 },
          data: { label: "Data Preprocessing" }
        },
        {
          id: "feature-eng-1",
          type: "feature-engineering",
          position: { x: 600, y: 200 },
          data: { label: "Feature Engineering" }
        },
        {
          id: "model-1",
          type: "sklearn-models",
          position: { x: 850, y: 200 },
          data: { label: "Classification Model" }
        },
        {
          id: "evaluation-1",
          type: "model-evaluation",
          position: { x: 1100, y: 200 },
          data: { label: "Model Evaluation" }
        }
      ],
      edges: [
        { id: "e1-2", source: "data-source-1", target: "preprocessing-1", type: "custom", animated: true, data: { label: "raw data" } },
        { id: "e2-3", source: "preprocessing-1", target: "feature-eng-1", type: "custom", animated: true, data: { label: "processed data" } },
        { id: "e3-4", source: "feature-eng-1", target: "model-1", type: "custom", animated: true, data: { label: "features" } },
        { id: "e4-5", source: "model-1", target: "evaluation-1", type: "custom", animated: true, data: { label: "predictions" } }
      ]
    },
    {
      id: "regression",
      name: "Regression Pipeline",
      description: "A pipeline for predicting continuous values",
      nodes: [
        {
          id: "data-source-1",
          type: "data-source",
          position: { x: 100, y: 200 },
          data: { label: "Data Source" }
        },
        {
          id: "preprocessing-1",
          type: "data-preprocessing",
          position: { x: 350, y: 200 },
          data: { label: "Data Preprocessing" }
        },
        {
          id: "feature-eng-1",
          type: "feature-engineering",
          position: { x: 600, y: 200 },
          data: { label: "Feature Engineering" }
        },
        {
          id: "model-1",
          type: "sklearn-models",
          position: { x: 850, y: 200 },
          data: { label: "Regression Model" }
        },
        {
          id: "evaluation-1",
          type: "model-evaluation",
          position: { x: 1100, y: 200 },
          data: { label: "Model Evaluation" }
        }
      ],
      edges: [
        { id: "e1-2", source: "data-source-1", target: "preprocessing-1", type: "custom", animated: true, data: { label: "raw data" } },
        { id: "e2-3", source: "preprocessing-1", target: "feature-eng-1", type: "custom", animated: true, data: { label: "processed data" } },
        { id: "e3-4", source: "feature-eng-1", target: "model-1", type: "custom", animated: true, data: { label: "features" } },
        { id: "e4-5", source: "model-1", target: "evaluation-1", type: "custom", animated: true, data: { label: "predictions" } }
      ]
    },
    {
      id: "clustering",
      name: "Clustering Pipeline",
      description: "A pipeline for unsupervised clustering of data",
      nodes: [
        {
          id: "data-source-1",
          type: "data-source",
          position: { x: 100, y: 200 },
          data: { label: "Data Source" }
        },
        {
          id: "preprocessing-1",
          type: "data-preprocessing",
          position: { x: 350, y: 200 },
          data: { label: "Data Preprocessing" }
        },
        {
          id: "feature-eng-1",
          type: "feature-engineering",
          position: { x: 600, y: 200 },
          data: { label: "Feature Engineering" }
        },
        {
          id: "model-1",
          type: "sklearn-models",
          position: { x: 850, y: 200 },
          data: { label: "Clustering Model" }
        },
        {
          id: "evaluation-1",
          type: "model-evaluation",
          position: { x: 1100, y: 200 },
          data: { label: "Cluster Evaluation" }
        }
      ],
      edges: [
        { id: "e1-2", source: "data-source-1", target: "preprocessing-1", type: "custom", animated: true, data: { label: "raw data" } },
        { id: "e2-3", source: "preprocessing-1", target: "feature-eng-1", type: "custom", animated: true, data: { label: "processed data" } },
        { id: "e3-4", source: "feature-eng-1", target: "model-1", type: "custom", animated: true, data: { label: "features" } },
        { id: "e4-5", source: "model-1", target: "evaluation-1", type: "custom", animated: true, data: { label: "clusters" } }
      ]
    },
    {
      id: "deep-learning",
      name: "Deep Learning Pipeline",
      description: "A pipeline for deep learning tasks with TensorFlow",
      nodes: [
        {
          id: "data-source-1",
          type: "data-source",
          position: { x: 100, y: 200 },
          data: { label: "Data Source" }
        },
        {
          id: "preprocessing-1",
          type: "data-preprocessing",
          position: { x: 350, y: 200 },
          data: { label: "Data Preprocessing" }
        },
        {
          id: "feature-eng-1",
          type: "feature-engineering",
          position: { x: 600, y: 200 },
          data: { label: "Feature Engineering" }
        },
        {
          id: "model-1",
          type: "tensorflow-models",
          position: { x: 850, y: 200 },
          data: { label: "Deep Learning Model" }
        },
        {
          id: "evaluation-1",
          type: "model-evaluation",
          position: { x: 1100, y: 200 },
          data: { label: "Model Evaluation" }
        }
      ],
      edges: [
        { id: "e1-2", source: "data-source-1", target: "preprocessing-1", type: "custom", animated: true, data: { label: "raw data" } },
        { id: "e2-3", source: "preprocessing-1", target: "feature-eng-1", type: "custom", animated: true, data: { label: "processed data" } },
        { id: "e3-4", source: "feature-eng-1", target: "model-1", type: "custom", animated: true, data: { label: "features" } },
        { id: "e4-5", source: "model-1", target: "evaluation-1", type: "custom", animated: true, data: { label: "predictions" } }
      ]
    }
  ];
  
  // Function to load a template pipeline
  const loadTemplateAction = (templateId: string) => {
    const template = pipelineTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    // Add unique timestamps to node IDs to avoid conflicts
    const timestamp = Date.now();
    const newNodes = template.nodes.map(node => ({
      ...node,
      id: `${node.id}-${timestamp}`
    }));
    
    // Update edge source and target references to match new node IDs
    const newEdges = template.edges.map(edge => ({
      ...edge,
      id: `${edge.id}-${timestamp}`,
      source: `${edge.source}-${timestamp}`,
      target: `${edge.target}-${timestamp}`
    }));
    
    // Set the pipeline with the template
    setPipelineName(`${template.name}`);
    setPipelineDescription(template.description);
    setNodes(newNodes);
    setEdges(newEdges);
    
    // Close the template selector
    setShowTemplates(false);
    
    toast({
      title: "Template loaded",
      description: `Loaded the ${template.name} template`,
    });
  };

  const handleFileDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const files = Array.from(event.dataTransfer.files)
      const csvFile = files.find((file) => file.name.endsWith(".csv"))

      if (csvFile) {
        // Create a data source node for the CSV
        const newNode: Node = {
          id: `data-source-${Date.now()}`,
          type: "data-source",
          position: { x: 100, y: 100 },
          data: {
            label: `CSV: ${csvFile.name}`,
            file: csvFile,
            type: "csv",
          },
        }

        setNodes((nodes) => [...nodes, newNode])

        toast({
          title: "CSV file added",
          description: `Added ${csvFile.name} as a data source`,
        })
      }
    },
    [setNodes, toast],
  )

  // Load saved pipelines from localStorage on initial load
  useEffect(() => {
    const savedPipelinesStr = localStorage.getItem("ml-saved-pipelines")
    if (savedPipelinesStr) {
      try {
        const parsed = JSON.parse(savedPipelinesStr) as PipelineData[]
        setSavedPipelines(parsed)
      } catch (e) {
        console.error("Failed to load saved pipelines from localStorage", e)
      }
    }

    // Load current pipeline if exists
    const currentPipeline = localStorage.getItem("ml-current-pipeline")
    if (currentPipeline) {
      try {
        const parsed = JSON.parse(currentPipeline) as PipelineData
        setPipelineName(parsed.name)
        setPipelineDescription(parsed.description || "")
        setNodes(parsed.nodes)
        setEdges(parsed.edges)
        if (parsed.lastSaved) {
          setLastSaved(new Date(parsed.lastSaved))
        }
        // Load snapshots for the current pipeline
        const savedSnapshotsStr = localStorage.getItem(`ml-snapshots-${parsed.id}`)
        if (savedSnapshotsStr) {
          try {
            const parsedSnapshots = JSON.parse(savedSnapshotsStr) as PipelineSnapshot[]
            // Ensure timestamps are Date objects
            setSnapshots(parsedSnapshots.map(s => ({ ...s, timestamp: new Date(s.timestamp) })))
          } catch (e) {
            console.error("Failed to load snapshots from localStorage", e)
          }
        }
        toast({
          title: "Pipeline loaded",
          description: `Loaded "${parsed.name}" from local storage`,
        })
      } catch (e) {
        console.error("Failed to load current pipeline from localStorage", e)
      }
    }
  }, [])

  // Auto-save current pipeline to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (nodes.length > 0) {
        saveCurrentPipelineToLocalStorage()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [nodes, edges, pipelineName, pipelineDescription])

  const saveCurrentPipelineToLocalStorage = () => {
    const now = new Date()
    setLastSaved(now)
    const pipelineData: PipelineData = {
      id: crypto.randomUUID(),
      name: pipelineName,
      description: pipelineDescription,
      nodes,
      edges,
      lastSaved: now,
    }
    localStorage.setItem("ml-current-pipeline", JSON.stringify(pipelineData))
  }

  const savePipeline = () => {
    setIsSaving(true)
    setTimeout(() => {
      const now = new Date()
      setLastSaved(now)

      // Create pipeline object
      const pipelineToSave: PipelineData = {
        id: crypto.randomUUID(),
        name: pipelineName,
        description: pipelineDescription,
        nodes,
        edges,
        lastSaved: now,
      }

      // Save current pipeline
      localStorage.setItem("ml-current-pipeline", JSON.stringify(pipelineToSave))

      // Add to saved pipelines (avoid duplicates by name)
      const existingIndex = savedPipelines.findIndex((p) => p.name === pipelineName)

      if (existingIndex >= 0) {
        // Update existing pipeline
        const updatedPipelines = [...savedPipelines]
        updatedPipelines[existingIndex] = pipelineToSave
        setSavedPipelines(updatedPipelines)
        localStorage.setItem("ml-saved-pipelines", JSON.stringify(updatedPipelines))
      } else {
        // Add new pipeline
        const newPipelines = [...savedPipelines, pipelineToSave]
        setSavedPipelines(newPipelines)
        localStorage.setItem("ml-saved-pipelines", JSON.stringify(newPipelines))
      }

      toast({
        title: "Pipeline saved",
        description: `Saved "${pipelineName}" to your pipelines collection`,
      })
      setIsSaving(false)
    }, 500)
  }

  const loadPipeline = (pipeline: PipelineData) => {
    setPipelineName(pipeline.name)
    setPipelineDescription(pipeline.description || "")
    setNodes(pipeline.nodes)
    setEdges(pipeline.edges)
    if (pipeline.lastSaved) {
      setLastSaved(new Date(pipeline.lastSaved))
    }
    setShowSavedPipelines(false)

    // Load snapshots for the newly loaded pipeline
    const savedSnapshotsStr = localStorage.getItem(`ml-snapshots-${pipeline.id}`)
    setSnapshots([]) // Clear old snapshots first
    if (savedSnapshotsStr) {
      try {
        const parsedSnapshots = JSON.parse(savedSnapshotsStr) as PipelineSnapshot[]
        setSnapshots(parsedSnapshots.map(s => ({ ...s, timestamp: new Date(s.timestamp) })))
      } catch (e) {
        console.error("Failed to load snapshots from localStorage", e)
        localStorage.removeItem(`ml-snapshots-${pipeline.id}`) // Clear corrupted data
      }
    }

    // Save as current pipeline
    localStorage.setItem("ml-current-pipeline", JSON.stringify(pipeline))

    toast({
      title: "Pipeline loaded",
      description: `Loaded "${pipeline.name}" successfully`,
    })
  }

  const deletePipeline = (id: string) => {
    const updatedPipelines = savedPipelines.filter((p) => p.id !== id)
    setSavedPipelines(updatedPipelines)
    localStorage.setItem("ml-saved-pipelines", JSON.stringify(updatedPipelines))

    toast({
      title: "Pipeline deleted",
      description: "The pipeline has been removed from your collection",
    })
  }

  // Add code generation functions for export options
  const generatePythonScript = (nodes: Node[], edges: Edge[]): string => {
    const imports = [
      "import pandas as pd",
      "import numpy as np",
      "from sklearn.preprocessing import StandardScaler, OneHotEncoder",
      "from sklearn.compose import ColumnTransformer",
      "from sklearn.pipeline import Pipeline",
      "from sklearn.impute import SimpleImputer",
      "from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV",
      "from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, mean_squared_error, r2_score",
      "import matplotlib.pyplot as plt",
      "import seaborn as sns",
    ]

    // Add model-specific imports based on nodes
    if (nodes.some((node) => node.type?.includes("sklearn"))) {
      imports.push(
        "from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier",
      )
      imports.push("from sklearn.linear_model import LogisticRegression, LinearRegression")
      imports.push("from sklearn.svm import SVC, SVR")
    }

    if (nodes.some((node) => node.type?.includes("xgboost"))) {
      imports.push("import xgboost as xgb")
    }

    if (nodes.some((node) => node.type?.includes("lightgbm"))) {
      imports.push("import lightgbm as lgb")
    }

    if (nodes.some((node) => node.type?.includes("tensorflow"))) {
      imports.push("import tensorflow as tf")
      imports.push("from tensorflow.keras.models import Sequential")
      imports.push("from tensorflow.keras.layers import Dense, Dropout")
    }

    // Add pipeline name as comment
    imports.push(`\n# Pipeline: ${pipelineName}`)

    // Add pipeline description as docstring
    imports.push(`"""`)
    imports.push(pipelineDescription || "ML Pipeline generated from Pipeline Builder")
    imports.push(`"""`)

    // Main function
    const mainCode = [
      "\n\ndef main():",
      "    # Pipeline parameters",
      `    random_state = 42`,
      `    test_size = 0.2`,
      "",
    ]

    // Generate code for each node
    const sortedNodes = getSortedNodes(nodes, edges)

    sortedNodes.forEach((node, index) => {
      const nodeType = node.type || ""
      const nodeName = node.data?.label || nodeType
      const variableName = `${nodeType.replace(/-/g, "_")}_${index}`

      if (nodeType.includes("data-source")) {
        mainCode.push(`    # ${nodeName}`)
        mainCode.push(`    # Load data from CSV, database, or API`)
        mainCode.push(`    data = pd.read_csv("your_data.csv")`)
        mainCode.push(`    print(f"Data shape: {data.shape}")`)
        mainCode.push(`    print(data.head())`)
        mainCode.push(`    print(data.info())`)
        mainCode.push(`    print(data.describe())`)
        mainCode.push(``)
      } else if (nodeType.includes("data-preprocessing")) {
        mainCode.push(`    # ${nodeName}`)
        mainCode.push(`    # Handle missing values`)
        mainCode.push(`    data = data.fillna(data.mean())`)
        mainCode.push(`    `)
        mainCode.push(`    # Identify numerical and categorical columns`)
        mainCode.push(`    numerical_cols = data.select_dtypes(include=['int64', 'float64']).columns.tolist()`)
        mainCode.push(`    categorical_cols = data.select_dtypes(include=['object', 'category']).columns.tolist()`)
        mainCode.push(`    `)
        mainCode.push(`    # Create preprocessing pipeline`)
        mainCode.push(`    numeric_transformer = Pipeline(steps=[`)
        mainCode.push(`        ('imputer', SimpleImputer(strategy='mean')),`)
        mainCode.push(`        ('scaler', StandardScaler())`)
        mainCode.push(`    ])`)
        mainCode.push(`    `)
        mainCode.push(`    categorical_transformer = Pipeline(steps=[`)
        mainCode.push(`        ('imputer', SimpleImputer(strategy='most_frequent')),`)
        mainCode.push(`        ('onehot', OneHotEncoder(handle_unknown='ignore'))`)
        mainCode.push(`    ])`)
        mainCode.push(`    `)
        mainCode.push(`    preprocessor = ColumnTransformer(`)
        mainCode.push(`        transformers=[`)
        mainCode.push(`            ('num', numeric_transformer, numerical_cols),`)
        mainCode.push(`            ('cat', categorical_transformer, categorical_cols)`)
        mainCode.push(`        ])`)
        mainCode.push(`    `)
      } else if (nodeType.includes("feature-engineering")) {
        mainCode.push(`    # ${nodeName}`)
        mainCode.push(`    # Feature engineering`)
        mainCode.push(`    # Example: Create interaction features`)
        mainCode.push(`    for i, col1 in enumerate(numerical_cols[:-1]):`)
        mainCode.push(`        for col2 in numerical_cols[i+1:]:`)
        mainCode.push(`            data[f"{col1}_{col2}_interaction"] = data[col1] * data[col2]`)
        mainCode.push(`    `)
        mainCode.push(`    # Example: Create polynomial features`)
        mainCode.push(`    for col in numerical_cols:`)
        mainCode.push(`        data[f"{col}_squared"] = data[col] ** 2`)
        mainCode.push(`    `)
      } else if (nodeType.includes("model")) {
        mainCode.push(`    # ${nodeName}`)
        mainCode.push(`    # Define target variable`)
        mainCode.push(`    target_column = "target"  # Replace with your target column name`)
        mainCode.push(`    X = data.drop(target_column, axis=1)`)
        mainCode.push(`    y = data[target_column]`)
        mainCode.push(`    `)
        mainCode.push(`    # Split data into train and test sets`)
        mainCode.push(
          `    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=random_state)`,
        )
        mainCode.push(`    `)

        if (nodeType.includes("sklearn")) {
          mainCode.push(`    # Create and train model`)
          mainCode.push(`    model = RandomForestClassifier(n_estimators=100, random_state=random_state)`)
          mainCode.push(`    model.fit(X_train, y_train)`)
          mainCode.push(`    `)
        } else if (nodeType.includes("xgboost")) {
          mainCode.push(`    # Create and train XGBoost model`)
          mainCode.push(`    model = xgb.XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=random_state)`)
          mainCode.push(`    model.fit(X_train, y_train)`)
          mainCode.push(`    `)
        } else if (nodeType.includes("lightgbm")) {
          mainCode.push(`    # Create and train LightGBM model`)
          mainCode.push(
            `    model = lgb.LGBMClassifier(n_estimators=100, learning_rate=0.1, random_state=random_state)`,
          )
          mainCode.push(`    model.fit(X_train, y_train)`)
          mainCode.push(`    `)
        } else if (nodeType.includes("tensorflow")) {
          mainCode.push(`    # Create and train TensorFlow model`)
          mainCode.push(`    model = Sequential([`)
          mainCode.push(`        Dense(128, activation='relu', input_shape=(X_train.shape[1],)),`)
          mainCode.push(`        Dropout(0.2),`)
          mainCode.push(`        Dense(64, activation='relu'),`)
          mainCode.push(`        Dropout(0.2),`)
          mainCode.push(`        Dense(1, activation='sigmoid')`)
          mainCode.push(`    ])`)
          mainCode.push(`    `)
          mainCode.push(`    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])`)
          mainCode.push(`    model.fit(X_train, y_train, epochs=10, batch_size=32, validation_split=0.2)`)
          mainCode.push(`    `)
        }
      } else if (nodeType.includes("hyperparameter-tuning")) {
        mainCode.push(`    # ${nodeName}`)
        mainCode.push(`    # Hyperparameter tuning`)
        mainCode.push(`    param_grid = {`)
        mainCode.push(`        'n_estimators': [50, 100, 200],`)
        mainCode.push(`        'max_depth': [None, 10, 20, 30],`)
        mainCode.push(`        'min_samples_split': [2, 5, 10]`)
        mainCode.push(`    }`)
        mainCode.push(`    `)
        mainCode.push(`    grid_search = GridSearchCV(`)
        mainCode.push(`        estimator=model,`)
        mainCode.push(`        param_grid=param_grid,`)
        mainCode.push(`        cv=5,`)
        mainCode.push(`        n_jobs=-1,`)
        mainCode.push(`        scoring='accuracy'`)
        mainCode.push(`    )`)
        mainCode.push(`    `)
        mainCode.push(`    grid_search.fit(X_train, y_train)`)
        mainCode.push(`    `)
        mainCode.push(`    print(f"Best parameters: {grid_search.best_params_}")`)
        mainCode.push(`    print(f"Best score: {grid_search.best_score_:.4f}")`)
        mainCode.push(`    `)
        mainCode.push(`    # Use the best model`)
        mainCode.push(`    model = grid_search.best_estimator_`)
        mainCode.push(`    `)
      } else if (nodeType.includes("model-evaluation")) {
        mainCode.push(`    # ${nodeName}`)
        mainCode.push(`    # Model evaluation`)
        mainCode.push(`    y_pred = model.predict(X_test)`)
        mainCode.push(`    `)
        mainCode.push(`    # Classification metrics`)
        mainCode.push(`    print("Classification Report:")`)
        mainCode.push(`    print(classification_report(y_test, y_pred))`)
        mainCode.push(`    `)
        mainCode.push(`    print("Confusion Matrix:")`)
        mainCode.push(`    cm = confusion_matrix(y_test, y_pred)`)
        mainCode.push(`    print(cm)`)
        mainCode.push(`    `)
        mainCode.push(`    # Visualize confusion matrix`)
        mainCode.push(`    plt.figure(figsize=(8, 6))`)
        mainCode.push(`    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')`)
        mainCode.push(`    plt.xlabel('Predicted')`)
        mainCode.push(`    plt.ylabel('Actual')`)
        mainCode.push(`    plt.title('Confusion Matrix')`)
        mainCode.push(`    plt.show()`)
        mainCode.push(`    `)
      } else if (nodeType.includes("visualization")) {
        mainCode.push(`    # ${nodeName}`)
        mainCode.push(`    # Visualizations`)
        mainCode.push(`    `)
        mainCode.push(`    # Feature importance`)
        mainCode.push(`    if hasattr(model, 'feature_importances_'):`)
        mainCode.push(`        feature_importance = pd.DataFrame({`)
        mainCode.push(`            'feature': X.columns,`)
        mainCode.push(`            'importance': model.feature_importances_`)
        mainCode.push(`        }).sort_values('importance', ascending=False)`)
        mainCode.push(`        `)
        mainCode.push(`        plt.figure(figsize=(10, 6))`)
        mainCode.push(`        sns.barplot(x='importance', y='feature', data=feature_importance.head(15))`)
        mainCode.push(`        plt.title('Feature Importance')`)
        mainCode.push(`        plt.tight_layout()`)
        mainCode.push(`        plt.show()`)
        mainCode.push(`    `)
        mainCode.push(`    # ROC curve for classification`)
        mainCode.push(`    if hasattr(model, 'predict_proba'):`)
        mainCode.push(`        from sklearn.metrics import roc_curve, auc`)
        mainCode.push(`        y_prob = model.predict_proba(X_test)[:, 1]`)
        mainCode.push(`        fpr, tpr, _ = roc_curve(y_test, y_prob)`)
        mainCode.push(`        roc_auc = auc(fpr, tpr)`)
        mainCode.push(`        `)
        mainCode.push(`        plt.figure(figsize=(8, 6))`)
        mainCode.push(`        plt.plot(fpr, tpr, label=f'ROC curve (area = {roc_auc:.2f})')`)
        mainCode.push(`        plt.plot([0, 1], [0, 1], 'k--')`)
        mainCode.push(`        plt.xlabel('False Positive Rate')`)
        mainCode.push(`        plt.ylabel('True Positive Rate')`)
        mainCode.push(`        plt.title('Receiver Operating Characteristic')`)
        mainCode.push(`        plt.legend(loc='lower right')`)
        mainCode.push(`        plt.show()`)
        mainCode.push(`    `)
      } else if (nodeType.includes("deployment")) {
        mainCode.push(`    # ${nodeName}`)
        mainCode.push(`    # Model deployment`)
        mainCode.push(`    import joblib`)
        mainCode.push(`    `)
        mainCode.push(`    # Save the model`)
        mainCode.push(`    joblib.dump(model, 'model.pkl')`)
        mainCode.push(`    print("Model saved as 'model.pkl'")`)
        mainCode.push(`    `)
        mainCode.push(`    # Example of loading the model`)
        mainCode.push(`    # loaded_model = joblib.load('model.pkl')`)
        mainCode.push(`    # predictions = loaded_model.predict(X_test)`)
        mainCode.push(`    `)
        mainCode.push(`    # Example Flask API for model deployment`)
        mainCode.push(`    '''`)
        mainCode.push(`    from flask import Flask, request, jsonify`)
        mainCode.push(`    import joblib`)
        mainCode.push(`    import pandas as pd`)
        mainCode.push(`    `)
        mainCode.push(`    app = Flask(__name__)`)
        mainCode.push(`    model = joblib.load('model.pkl')`)
        mainCode.push(`    `)
        mainCode.push(`    @app.route('/predict', methods=['POST'])`)
        mainCode.push(`    def predict():`)
        mainCode.push(`        data = request.get_json()`)
        mainCode.push(`        df = pd.DataFrame(data)`)
        mainCode.push(`        prediction = model.predict(df)`)
        mainCode.push(`        return jsonify({'prediction': prediction.tolist()})`)
        mainCode.push(`    `)
        mainCode.push(`    if __name__ == '__main__':`)
        mainCode.push(`        app.run(debug=True)`)
        mainCode.push(`    '''`)
        mainCode.push(`    `)
      }
    })

    // Main function call
    mainCode.push("\n\nif __name__ == '__main__':")
    mainCode.push("    main()")

    // Combine all code
    return [...imports, ...mainCode].join("\n")
  }

  const generateJupyterNotebook = (nodes: Node[], edges: Edge[]): string => {
    const pythonCode = generatePythonScript(nodes, edges)

    // Convert Python script to Jupyter notebook format
    const cells = pythonCode
      .split("\n\n")
      .map((cell) => cell.trim())
      .filter((cell) => cell)

    const notebookCells = cells.map((cell) => {
      return {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: cell.split("\n"),
      }
    })

    // Add markdown cells for documentation
    const markdownCells = [
      {
        cell_type: "markdown",
        metadata: {},
        outputs: [],
        execution_count: null,
        source: [
          "# Machine Learning Pipeline\n",
          "\n",
          "This notebook was automatically generated from the ML Pipeline Builder.\n",
          "\n",
          "## Pipeline Overview\n",
          "\n",
          "This pipeline includes the following steps:\n",
          `- ${nodes.map((node) => node.data?.label || node.type).join("\n- ")}`,
        ],
      },
    ]

    // Insert markdown cell at the beginning
    notebookCells.unshift(markdownCells[0])

    // Create notebook JSON
    const notebook = {
      cells: notebookCells,
      metadata: {
        kernelspec: {
          display_name: "Python 3",
          language: "python",
          name: "python3",
        },
        language_info: {
          codemirror_mode: {
            name: "ipython",
            version: 3,
          },
          file_extension: ".py",
          mimetype: "text/x-python",
          name: "python",
          nbconvert_exporter: "python",
          pygments_lexer: "ipython3",
          version: "3.8.10",
        },
      },
      nbformat: 4,
      nbformat_minor: 4,
    }

    return JSON.stringify(notebook, null, 2)
  }

  const generateSklearnPipeline = (nodes: Node[], edges: Edge[]): string => {
    const imports = [
      "import pandas as pd",
      "import numpy as np",
      "from sklearn.preprocessing import StandardScaler, OneHotEncoder",
      "from sklearn.compose import ColumnTransformer",
      "from sklearn.pipeline import Pipeline",
      "from sklearn.impute import SimpleImputer",
      "from sklearn.model_selection import train_test_split",
    ]

    // Add model-specific imports based on nodes
    if (nodes.some((node) => node.type?.includes("sklearn"))) {
      imports.push("from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor")
    }

    if (nodes.some((node) => node.type?.includes("xgboost"))) {
      imports.push("import xgboost as xgb")
    }

    // Add pipeline name as comment
    imports.push(`\n# Pipeline: ${pipelineName}`)
    if (pipelineDescription) {
      imports.push(`# ${pipelineDescription}`)
    }

    const code = [
      ...imports,
      "\n# Load your data",
      "# data = pd.read_csv('your_data.csv')",
      "# X = data.drop('target', axis=1)",
      "# y = data['target']",
      "\n# Define preprocessing for numerical columns (scale them)",
      "numerical_features = ['feature1', 'feature2']  # Replace with your numerical features",
      "numerical_transformer = Pipeline(steps=[",
      "    ('imputer', SimpleImputer(strategy='mean')),",
      "    ('scaler', StandardScaler())",
      "])",
      "\n# Define preprocessing for categorical columns (encode them)",
      "categorical_features = ['feature3', 'feature4']  # Replace with your categorical features",
      "categorical_transformer = Pipeline(steps=[",
      "    ('imputer', SimpleImputer(strategy='most_frequent')),",
      "    ('onehot', OneHotEncoder(handle_unknown='ignore'))",
      "])",
      "\n# Combine preprocessing steps",
      "preprocessor = ColumnTransformer(",
      "    transformers=[",
      "        ('num', numerical_transformer, numerical_features),",
      "        ('cat', categorical_transformer, categorical_features)",
      "    ])",
      "\n# Create the full pipeline with preprocessing and model",
    ]

    // Determine the model type based on nodes
    let modelCode = ""
    if (nodes.some((node) => node.type?.includes("sklearn"))) {
      modelCode = "RandomForestClassifier(n_estimators=100, random_state=42)"
    } else if (nodes.some((node) => node.type?.includes("xgboost"))) {
      modelCode = "xgb.XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=42)"
    } else {
      modelCode = "RandomForestClassifier()" // Default
    }

    code.push(`full_pipeline = Pipeline(steps=[`)
    code.push(`    ('preprocessor', preprocessor),`)
    code.push(`    ('model', ${modelCode})`)
    code.push(`])`)

    code.push("\n# Split data and fit the pipeline")
    code.push("# X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)")
    code.push("# full_pipeline.fit(X_train, y_train)")

    code.push("\n# Make predictions")
    code.push("# y_pred = full_pipeline.predict(X_test)")

    code.push("\n# Evaluate the model")
    code.push("# from sklearn.metrics import accuracy_score, classification_report")
    code.push("# print(f'Accuracy: {accuracy_score(y_test, y_pred):.4f}')")
    code.push("# print(classification_report(y_test, y_pred))")

    return code.join("\n")
  }

  // Helper function to sort nodes in topological order (for execution)
  const getSortedNodes = (nodes: Node[], edges: Edge[]): Node[] => {
    // Implementation of topological sort for a DAG (Directed Acyclic Graph)
    const graph: Record<string, string[]> = {}
    const visited: Record<string, boolean> = {}
    const sorted: Node[] = []

    // Initialize the graph
    nodes.forEach((node) => {
      graph[node.id] = []
      visited[node.id] = false
    })

    // Add edges to the graph
    edges.forEach((edge) => {
      if (graph[edge.source]) {
        graph[edge.source].push(edge.target)
      }
    })

    // Depth-first search to perform topological sort
    const dfs = (nodeId: string) => {
      if (visited[nodeId]) return

      visited[nodeId] = true

      if (graph[nodeId]) {
        graph[nodeId].forEach((neighborId) => {
          if (!visited[neighborId]) {
            dfs(neighborId)
          }
        })
      }

      // Add the current node to the sorted list after visiting all its neighbors
      const node = nodes.find((n) => n.id === nodeId)
      if (node) {
        sorted.unshift(node)
      }
    }

    // Run DFS for all nodes
    nodes.forEach((node) => {
      if (!visited[node.id]) {
        dfs(node.id)
      }
    })

    // If topological sort fails (due to cycles or unconnected nodes),
    // fall back to a simpler approach
    if (sorted.length !== nodes.length) {
      // Start with source nodes (those with no incoming edges)
      const sourceNodes = nodes.filter((node) => !edges.some((edge) => edge.target === node.id))

      // Then add the rest
      const otherNodes = nodes.filter((node) => !sourceNodes.some((sNode) => sNode.id === node.id))

      return [...sourceNodes, ...otherNodes]
    }

    return sorted
  }

  // Update the onExport function to handle different export types
  const handleExport = (type: string = "json") => {
    setIsExporting(true)
    
    // Use a valid type or default to json
    const validType = ["json", "python", "jupyter", "sklearn"].includes(type) 
      ? type as "json" | "python" | "jupyter" | "sklearn" 
      : "json";
      
    try {
      let content = ""
      let filename = `${pipelineName.replace(/\s+/g, "_").toLowerCase()}`
      let fileExtension = ""

      switch (validType) {
        case "json":
          content = JSON.stringify(
            {
              id: crypto.randomUUID(),
              name: pipelineName,
              nodes,
              edges,
              lastSaved: new Date(),
              description: pipelineDescription,
            },
            null,
            2,
          )
          fileExtension = ".json"
          break
        case "python":
          content = generatePythonScript(nodes, edges)
          fileExtension = ".py"
          break
        case "jupyter":
          content = generateJupyterNotebook(nodes, edges)
          fileExtension = ".ipynb"
          break
        case "sklearn":
          content = generateSklearnPipeline(nodes, edges)
          fileExtension = ".py"
          break
      }

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${filename}${fileExtension}`
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Export successful",
        description: `The pipeline was exported as ${validType} format`,
      })
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export failed",
        description: "There was an error exporting the pipeline",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const pipelineData = JSON.parse(content) as PipelineData

        // Validate pipeline data
        if (!pipelineData.nodes || !pipelineData.edges) {
          throw new Error("Invalid pipeline format")
        }

        // Update positions to ensure nodes are visible
        const updatedNodes = pipelineData.nodes.map((node, index) => ({
          ...node,
          position: {
            x: node.position?.x || index * 250 + 100,
            y: node.position?.y || 100,
          },
        }))

        setPipelineName(pipelineData.name)
        setPipelineDescription(pipelineData.description || "")
        setNodes(updatedNodes)
        setEdges(pipelineData.edges)

        // Save as current pipeline
        localStorage.setItem(
          "ml-current-pipeline",
          JSON.stringify({
            ...pipelineData,
            nodes: updatedNodes,
          }),
        )

        toast({
          title: "Pipeline imported",
          description: `Imported "${pipelineData.name}" successfully`,
        })

        // Fit view after import
        setTimeout(() => {
          const flowInstance = document.querySelector(".react-flow")
          if (flowInstance) {
            const event = new Event("resize")
            window.dispatchEvent(event)
          }
        }, 100)
      } catch (error) {
        console.error("Error importing pipeline:", error)
        toast({
          variant: "destructive",
          title: "Import failed",
          description: "The selected file is not a valid pipeline JSON",
        })
      }
    }
    reader.readAsText(file)

    // Reset the input value so the same file can be imported again
    event.target.value = ""
  }

  const handleImportAnyFormat = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const pipelineData = parseImportedPipeline(content)

        if (!pipelineData) {
          toast({
            variant: "destructive",
            title: "Import failed",
            description: "Could not parse the file as a pipeline",
          })
          return
        }

        setPipelineName(pipelineData.name)
        setPipelineDescription(pipelineData.description || "")
        setNodes(pipelineData.nodes)
        setEdges(pipelineData.edges)

        // Save as current pipeline
        localStorage.setItem("ml-current-pipeline", JSON.stringify(pipelineData))

        toast({
          title: "Pipeline imported",
          description: `Imported "${pipelineData.name}" successfully`,
        })
      } catch (error) {
        console.error("Error importing pipeline:", error)
        toast({
          variant: "destructive",
          title: "Import failed",
          description: "Could not parse the file as a pipeline",
        })
      }
    }
    reader.readAsText(file)

    // Reset the input value so the same file can be imported again
    event.target.value = ""
  }

  // Function to validate the pipeline and check for common issues
  const validatePipeline = (): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if there are nodes in the pipeline
    if (nodes.length === 0) {
      errors.push("Pipeline is empty. Add at least one node to proceed.");
      return { valid: false, errors, warnings };
    }
    
    // Check for disconnected nodes
    const connectedNodes = new Set<string>();
    
    // Add all nodes that are targets or sources in edges
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    // Find nodes that aren't connected
    const disconnectedNodes = nodes.filter(node => !connectedNodes.has(node.id));
    
    if (disconnectedNodes.length > 0) {
      const disconnectedNames = disconnectedNodes.map(node => node.data.label || node.id).join(", ");
      warnings.push(`Disconnected nodes detected: ${disconnectedNames}`);
    }
    
    // Check for nodes without a data source upstream
    // First, identify all data source nodes
    const dataSourceNodes = nodes.filter(node => node.type?.includes("data-source")).map(node => node.id);
    
    if (dataSourceNodes.length === 0) {
      errors.push("No data source node found. Add a data source to your pipeline.");
    }
    
    // Check for cyclical connections
    const edgeMap: Record<string, string[]> = {};
    edges.forEach(edge => {
      if (!edgeMap[edge.source]) {
        edgeMap[edge.source] = [];
      }
      edgeMap[edge.source].push(edge.target);
    });
    
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (nodeId: string): boolean => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        const neighbors = edgeMap[nodeId] || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && hasCycle(neighbor)) {
            return true;
          } else if (recursionStack.has(neighbor)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    // Check all nodes for cycles
    let cycleDetected = false;
    for (const node of nodes) {
      if (!visited.has(node.id) && hasCycle(node.id)) {
        cycleDetected = true;
        break;
      }
    }
    
    if (cycleDetected) {
      errors.push("Cyclical connections detected in pipeline. Remove cycles to ensure proper execution flow.");
    }
    
    // Check for unused preprocessing or feature engineering
    const allNodeTypes = nodes.map(node => node.type);
    const hasModels = allNodeTypes.some(type => type?.includes("model"));
    const hasFeatureEngineering = allNodeTypes.some(type => type?.includes("feature"));
    
    if (hasFeatureEngineering && !hasModels) {
      warnings.push("Feature engineering nodes detected but no model nodes. Consider adding a model node to use these features.");
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  };

  const handleRunPipeline = () => {
    // Validate the pipeline before running
    const validationResult = validatePipeline();
    
    if (!validationResult.valid) {
      // Display validation errors
      toast({
        title: "Pipeline validation failed",
        description: (
          <div>
            <p>Your pipeline has the following issues:</p>
            <ul className="list-disc pl-4 mt-2">
              {validationResult.errors.map((error, i) => (
                <li key={i} className="text-sm text-destructive">{error}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "destructive",
      });
      return;
    }
    
    // Show warnings if any, but allow running
    if (validationResult.warnings.length > 0) {
      toast({
        title: "Pipeline has warnings",
        description: (
          <div>
            <p>Your pipeline has the following warnings:</p>
            <ul className="list-disc pl-4 mt-2">
              {validationResult.warnings.map((warning, i) => (
                <li key={i} className="text-sm text-yellow-600 dark:text-yellow-500">{warning}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">The pipeline will run, but results may be affected.</p>
          </div>
        ),
        variant: "default",
      });
    }
    
    setIsRunning(true)
    setPipelineResults([])
    
    // Automatically save the pipeline before running
    saveCurrentPipelineToLocalStorage()

    // Sort nodes by topological order
    const sortedNodes = getSortedNodes(nodes, edges)

    // Create a list to store results
    const results: PipelineResult[] = []
    
    // Simulate running the pipeline with delays
    const runNextNode = (index: number) => {
      if (index >= sortedNodes.length) {
        // All nodes processed
        setTimeout(() => {
          setIsRunning(false)
          setShowResults(true) // Auto-show results when complete
          toast({
            title: "Pipeline execution complete",
            description: `Processed ${sortedNodes.length} nodes successfully`,
          })
        }, 500)
        return
      }

      // Calculate a delay for this node to simulate processing time
      const processingTime = Math.random() * 1000 + 500
      setTimeout(() => {
        const nodeResult = generateNodeResult(sortedNodes[index])
        results.push(nodeResult)
        runNextNode(index + 1)
      }, processingTime)
    }

    runNextNode(0)
  }

  // Generate a plausible result for a node
  const generateNodeResult = (node: Node): PipelineResult => {
    const nodeType = node.type || ""

    // Default metrics
    let metrics: { name: string; value: number }[] = []
    let output: any = null
    let status: "success" | "error" | "warning" = "success"
    let message = "Execution completed successfully"

    // Generate type-specific outputs and metrics
    if (nodeType.includes("data-source")) {
      // Realistic data source metrics and output
      const rows = Math.floor(Math.random() * 5000) + 1000
      const columns = Math.floor(Math.random() * 20) + 5
      const missingValues = Math.floor(Math.random() * (rows * columns * 0.05))
      const missingPercent = (missingValues / (rows * columns)) * 100
      const dataSizeMB = (rows * columns * 8) / (1024 * 1024) // Approx size in MB

      output = {
        rows,
        columns,
        missing_values: missingValues,
        data_preview: {
          column_types: {
            numerical: Math.floor(columns * 0.7),
            categorical: Math.floor(columns * 0.2),
            datetime: Math.floor(columns * 0.1),
          },
          memory_usage: `${dataSizeMB.toFixed(2)} MB`,
        },
      }

      metrics = [
        { name: "Data Size (MB)", value: Number.parseFloat(dataSizeMB.toFixed(2)) },
        { name: "Missing Values (%)", value: Number.parseFloat(missingPercent.toFixed(2)) },
        { name: "Load Time (s)", value: Number.parseFloat((Math.random() * 2 + 0.5).toFixed(2)) },
      ]

      // Add warning if too many missing values
      if (missingPercent > 10) {
        status = "warning"
        message = `Execution completed with warning: High percentage of missing values (${missingPercent.toFixed(1)}%)`
      }
    } else if (nodeType.includes("data-preprocessing") || nodeType.includes("feature")) {
      // Enhanced preprocessing metrics
      const inputFeatures = Math.floor(Math.random() * 15) + 5
      const outputFeatures = inputFeatures + Math.floor(Math.random() * 8)
      const outliers = Math.floor(Math.random() * 50)
      const memoryUsage = Math.random() * 200 + 50

      output = {
        features_processed: inputFeatures,
        features_after_processing: outputFeatures,
        new_features_created: outputFeatures - inputFeatures,
        outliers_detected: outliers,
        outliers_handled: outliers > 0 ? "Replaced with median" : "None detected",
        operations_applied: [
          "Missing value imputation",
          "Outlier detection",
          "Feature scaling",
          "Categorical encoding",
        ],
      }

      metrics = [
        { name: "Processing Time (s)", value: Number.parseFloat((Math.random() * 5).toFixed(2)) },
        { name: "Memory Usage (MB)", value: Number.parseFloat(memoryUsage.toFixed(2)) },
        { name: "Features Ratio", value: Number.parseFloat((outputFeatures / inputFeatures).toFixed(2)) },
      ]

      // Add warning for high feature expansion
      if (outputFeatures / inputFeatures > 3) {
        status = "warning"
        message = "Execution completed with warning: High feature expansion ratio may lead to overfitting"
      }
    } else if (nodeType.includes("model")) {
      // Use consistent model metrics from the pipeline run
      const accuracy = modelMetrics.accuracy || Math.random() * 0.25 + 0.7
      const f1 = modelMetrics.f1Score || Math.random() * 0.3 + 0.65
      const auc = modelMetrics.auc || Math.random() * 0.2 + 0.75
      const trainingTime = Math.random() * 30 + 5

      // Different outputs based on model type
      if (nodeType.includes("sklearn")) {
        output = {
          model_type: "RandomForestClassifier",
          parameters: {
            n_estimators: 100,
            max_depth: Math.floor(Math.random() * 20 + 5),
            min_samples_split: 2,
          },
          feature_importance: {
            feature_1: 0.23,
            feature_2: 0.18,
            feature_3: 0.15,
            feature_4: 0.12,
          },
        }
      } else if (nodeType.includes("xgboost")) {
        output = {
          model_type: "XGBoostClassifier",
          parameters: {
            learning_rate: 0.1,
            n_estimators: 100,
            max_depth: 5,
            subsample: 0.8,
          },
          training_iterations: Math.floor(Math.random() * 50 + 50),
        }
      } else if (nodeType.includes("tensorflow")) {
        output = {
          model_type: "Neural Network",
          architecture: {
            input_layer: Math.floor(Math.random() * 50 + 10),
            hidden_layers: [128, 64],
            output_layer: 1,
            activation: "relu",
          },
          training_epochs: Math.floor(Math.random() * 20 + 10),
          batch_size: 32,
        }
      } else {
        output = {
          model_type: getModelTypeFromNodeType(nodeType),
          parameters: {
            learning_rate: 0.01,
            max_depth: 5,
            n_estimators: 100,
          },
        }
      }

      metrics = [
        { name: "Accuracy", value: accuracy },
        { name: "F1 Score", value: f1 },
        { name: "AUC", value: auc },
        { name: "Training Time (s)", value: Number.parseFloat(trainingTime.toFixed(2)) },
      ]

      // Small chance of warning
      if (Math.random() < 0.15) {
        status = "warning"
        message = "Model trained with warnings: Consider tuning hyperparameters for better performance"
      }
    } else if (nodeType.includes("evaluation")) {
      // Use consistent metrics from the pipeline run
      const accuracy = modelMetrics.accuracy || Math.random() * 0.25 + 0.7
      const precision = modelMetrics.precision || Math.random() * 0.25 + 0.7
      const recall = modelMetrics.recall || Math.random() * 0.3 + 0.65

      const truePositives = Math.floor(Math.random() * 500) + 500
      const falsePositives = Math.floor(Math.random() * 100) + 50
      const trueNegatives = Math.floor(Math.random() * 500) + 500
      const falseNegatives = Math.floor(Math.random() * 100) + 50

      output = {
        evaluation_method: "Cross-validation (5-fold)",
        confusion_matrix: {
          true_positives: truePositives,
          false_positives: falsePositives,
          true_negatives: trueNegatives,
          false_negatives: falseNegatives,
        },
        classification_report: {
          class_0: {
            precision: precision,
            recall: recall,
            f1_score: Number.parseFloat(((2 * precision * recall) / (precision + recall)).toFixed(4)),
          },
          class_1: {
            precision: Number.parseFloat((truePositives / (truePositives + falsePositives)).toFixed(4)),
            recall: Number.parseFloat((truePositives / (truePositives + falseNegatives)).toFixed(4)),
            f1_score: Number.parseFloat(
              ((2 * truePositives) / (2 * truePositives + falsePositives + falseNegatives)).toFixed(4),
            ),
          },
        },
      }

      metrics = [
        { name: "Precision", value: precision },
        { name: "Recall", value: recall },
        { name: "Accuracy", value: accuracy },
        { name: "Evaluation Time (s)", value: Number.parseFloat((Math.random() * 15).toFixed(2)) },
      ]

      // Add warning if metrics are poor
      if (accuracy < 0.75) {
        status = "warning"
        message = "Evaluation completed with warnings: Model performance below target threshold"
      }
    } else if (nodeType.includes("deployment") || nodeType.includes("workflow")) {
      // Enhanced deployment metrics
      const apiLatency = Math.random() * 200 + 50
      const throughput = Math.floor(Math.random() * 100 + 20)

      output = {
        endpoint: "https://ml-api.example.com/predict",
        version: "1.0.0",
        status: "deployed",
        deployment_info: {
          environment: "production",
          instances: Math.floor(Math.random() * 3) + 1,
          api_framework: "Flask",
          container: "Docker",
          cloud_provider: "AWS",
        },
        monitoring: {
          health_status: "Online",
          uptime: "99.9%",
          request_count: Math.floor(Math.random() * 1000),
        },
      }

      metrics = [
        { name: "Deployment Time (s)", value: Number.parseFloat((Math.random() * 30).toFixed(2)) },
        { name: "API Latency (ms)", value: Number.parseFloat(apiLatency.toFixed(2)) },
        { name: "Throughput (req/s)", value: Number.parseFloat(throughput.toFixed(2)) },
      ]
    } else {
      // Generic output for other node types
      output = {
        status: "completed",
        message: "Node executed successfully",
      }

      metrics = [{ name: "Execution Time (s)", value: Number.parseFloat((Math.random() * 5).toFixed(2)) }]
    }

    // Small chance of error in any node (unless it's an important node that should succeed)
    if (Math.random() < 0.05 && !nodeType.includes("data-source")) {
      status = "error"
      message = "Execution failed: " + getRandomError(nodeType)
    }

    return {
      nodeId: node.id,
      nodeName: node.data?.label || nodeType,
      output,
      metrics,
      timestamp: new Date(),
      status,
      message,
    }
  }

  // Helper function to get model type from node type
  const getModelTypeFromNodeType = (nodeType: string): string => {
    if (nodeType.includes("sklearn")) return "Random Forest Classifier"
    if (nodeType.includes("tensorflow")) return "Neural Network"
    if (nodeType.includes("pytorch")) return "Deep Neural Network"
    if (nodeType.includes("xgboost")) return "XGBoost Classifier"
    if (nodeType.includes("lightgbm")) return "LightGBM"
    if (nodeType.includes("catboost")) return "CatBoost"
    return "ML Model"
  }

  // Generate a plausible error message
  const getRandomError = (nodeType: string): string => {
    const errors = [
      "Memory overflow during matrix calculation",
      "Incompatible data types detected",
      "Timeout exceeded for operation",
      "Invalid parameter configuration",
      "Missing dependency or library not found",
    ]

    const nodeSpecificErrors: Record<string, string[]> = {
      "data-source": [
        "Failed to connect to database",
        "Permission denied accessing data source",
        "File format not recognized",
      ],
      model: ["Convergence failed in training", "Insufficient training data", "Gradient explosion detected"],
      preprocessing: [
        "Invalid imputation strategy for data type",
        "Scaling error with non-numeric data",
        "Feature encoding failed",
      ],
    }

    // Try to get node-specific errors first
    for (const key in nodeSpecificErrors) {
      if (nodeType.includes(key) && nodeSpecificErrors[key].length > 0) {
        return nodeSpecificErrors[key][Math.floor(Math.random() * nodeSpecificErrors[key].length)]
      }
    }

    // Fall back to generic errors
    return errors[Math.floor(Math.random() * errors.length)]
  }

  const createNewPipeline = () => {
    setPipelineName("Untitled Pipeline")
    setPipelineDescription("")
    setNodes([])
    setEdges([])
    setLastSaved(null)
    setShowSavedPipelines(false)
    setPipelineResults([])
    setShowResults(false)

    // Clear current pipeline
    localStorage.removeItem("ml-current-pipeline")

    toast({
      title: "New pipeline created",
      description: "Started a fresh pipeline",
    })
  }

  // Add this function to run comparison between two pipelines
  const runPipelineComparison = (pipelineA: PipelineData, pipelineB: PipelineData) => {
    setIsComparing(true)
    setComparisonResultsA([])
    setComparisonResultsB([])
    
    toast({
      title: "Running comparison",
      description: `Comparing ${pipelineA.name} with ${pipelineB.name}...`,
    })
    
    // Simulate pipeline execution for Pipeline A
    const nodesA = pipelineA.nodes
    const edgesA = pipelineA.edges
    const sortedNodesA = getSortedNodes(nodesA, edgesA)
    
    // Simulate pipeline execution for Pipeline B
    const nodesB = pipelineB.nodes
    const edgesB = pipelineB.edges
    const sortedNodesB = getSortedNodes(nodesB, edgesB)
    
    // Run Pipeline A with a slight delay
    let timeOffsetA = 0
    sortedNodesA.forEach((node) => {
      const processingTime = Math.random() * 800 + 400
      timeOffsetA += processingTime
      
      setTimeout(() => {
        const nodeResult = generateNodeResult(node)
        setComparisonResultsA((prev) => [...prev, nodeResult])
      }, timeOffsetA)
    })
    
    // Run Pipeline B with a different delay
    let timeOffsetB = 0
    sortedNodesB.forEach((node) => {
      const processingTime = Math.random() * 800 + 400
      timeOffsetB += processingTime
      
      setTimeout(() => {
        const nodeResult = generateNodeResult(node)
        setComparisonResultsB((prev) => [...prev, nodeResult])
        
        // If it's the last node of the longer pipeline, mark comparison as complete
        if (
          node.id === sortedNodesB[sortedNodesB.length - 1].id && 
          timeOffsetB >= timeOffsetA
        ) {
          setIsComparing(false)
          toast({
            title: "Comparison completed",
            description: "A/B test between pipelines is complete",
          })
        }
      }, timeOffsetB)
    })
    
    // In case pipeline A is longer than B
    if (timeOffsetA > timeOffsetB) {
      setTimeout(() => {
        setIsComparing(false)
        toast({
          title: "Comparison completed",
          description: "A/B test between pipelines is complete",
        })
      }, timeOffsetA + 100)
    }
  }

  // --- Snapshot Functions ---
  const saveSnapshotsToLocalStorage = (pipelineId: string, currentSnapshots: PipelineSnapshot[]) => {
    localStorage.setItem(`ml-snapshots-${pipelineId}`, JSON.stringify(currentSnapshots))
  }

  const createSnapshot = (name?: string) => {
    const currentPipelineId = (JSON.parse(localStorage.getItem("ml-current-pipeline") || '{}') as PipelineData).id
    if (!currentPipelineId) {
      toast({ variant: "destructive", title: "Cannot create snapshot", description: "Save the pipeline first." })
      return
    }

    const newSnapshot: PipelineSnapshot = {
      timestamp: new Date(),
      name: name || undefined,
      nodes: nodes.map(n => ({ ...n })), // Deep copy nodes
      edges: edges.map(e => ({ ...e })), // Deep copy edges
    }

    const updatedSnapshots = [newSnapshot, ...snapshots].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    setSnapshots(updatedSnapshots)
    saveSnapshotsToLocalStorage(currentPipelineId, updatedSnapshots)

    toast({ title: "Snapshot created", description: `Saved state at ${newSnapshot.timestamp.toLocaleTimeString()}` })
  }

  const loadSnapshot = (snapshotToLoad: PipelineSnapshot) => {
    setNodes(snapshotToLoad.nodes.map(n => ({ ...n })))
    setEdges(snapshotToLoad.edges.map(e => ({ ...e })))
    // Optionally update pipeline name/desc if stored in snapshot, or keep current
    // setPipelineName(snapshotToLoad.name || pipelineName)
    setShowSnapshots(false)
    toast({ title: "Snapshot loaded", description: `Restored state from ${snapshotToLoad.timestamp.toLocaleString()}` })
    // Auto-save this loaded state as the current pipeline state
    saveCurrentPipelineToLocalStorage() 
  }

  const deleteSnapshot = (timestamp: Date) => {
    const currentPipelineId = (JSON.parse(localStorage.getItem("ml-current-pipeline") || '{}') as PipelineData).id
    if (!currentPipelineId) return

    const updatedSnapshots = snapshots.filter(s => s.timestamp.getTime() !== timestamp.getTime())
    setSnapshots(updatedSnapshots)
    saveSnapshotsToLocalStorage(currentPipelineId, updatedSnapshots)
    toast({ title: "Snapshot deleted" })
  }
  // --- End Snapshot Functions ---

  // Function to handle adding a node from the navbar search/favorites
  const handleAddNodeFromNavbar = (type: string) => {
    // Find good placement for the new node
    let position = { x: 100, y: 100 }
    
    // If there are existing nodes, place to the right or below, avoiding overlaps
    if (nodes.length > 0) {
      // Find the rightmost node
      const rightmostNode = [...nodes].sort((a, b) => b.position.x - a.position.x)[0]
      // Find the bottommost node
      const bottommostNode = [...nodes].sort((a, b) => b.position.y - a.position.y)[0]
      
      // If we have a rightmost node, place new node to its right
      if (rightmostNode) {
        position = {
          x: rightmostNode.position.x + 250,
          y: rightmostNode.position.y
        }
      }
      
      // If position might overlap with existing nodes, place it below
      const potentialOverlap = nodes.some(node => 
        Math.abs(node.position.x - position.x) < 150 && 
        Math.abs(node.position.y - position.y) < 100
      )
      
      if (potentialOverlap && bottommostNode) {
        position = {
          x: 100,  // Start from left
          y: bottommostNode.position.y + 150 // Place below the bottom node
        }
      }
    }
    
    // Create new node
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}` },
    }
    
    // Add to nodes state
    setNodes(currentNodes => [...currentNodes, newNode])
    
    // Show success toast
    toast({
      title: "Component added",
      description: `Added ${type.replace(/-/g, " ")} to the pipeline`,
    })
    
    // Update node usage statistics in localStorage
    const nodeUsage = JSON.parse(localStorage.getItem('nodeUsage') || '{}')
    nodeUsage[type] = (nodeUsage[type] || 0) + 1
    localStorage.setItem('nodeUsage', JSON.stringify(nodeUsage))
  }

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden bg-background transition-colors duration-300"
      style={{ height: '100vh', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
    >
      <Navbar
        pipelineName={pipelineName}
        setPipelineName={setPipelineName}
        pipelineDescription={pipelineDescription}
        setPipelineDescription={setPipelineDescription}
        onSave={savePipeline}
        onExport={handleExport}
        onImport={(e: React.ChangeEvent<HTMLInputElement>) => {
          // Detect file type and choose appropriate parser
          const file = e.target.files?.[0]
          if (!file) return

          // Check file extension
          if (file.name.endsWith(".json")) {
            handleImport(e)
          } else {
            handleImportAnyFormat(e)
          }
        }}
        onRun={handleRunPipeline}
        onNew={createNewPipeline}
        onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        onShowSavedPipelines={() => setShowSavedPipelines(true)}
        onShowPipelineInfo={() => setShowPipelineInfo(true)}
        onToggleResults={() => setShowResults(!showResults)}
        onShowComparison={() => setShowComparison(true)}
        onShowSnapshots={() => setShowSnapshots(true)}
        onShowTemplates={() => setShowTemplates(true)}
        isSaving={isSaving}
        isExporting={isExporting}
        isRunning={isRunning}
        lastSaved={lastSaved}
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        hasResults={pipelineResults.length > 0}
        onAddNode={handleAddNodeFromNavbar}
      />

      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
      <input
        type="file"
        ref={genericFileInputRef}
        onChange={handleImportAnyFormat}
        accept=".json,.py,.ipynb"
        className="hidden"
      />

      {showSavedPipelines && (
        <SavedPipelines
          pipelines={savedPipelines}
          onLoad={loadPipeline}
          onDelete={deletePipeline}
          onClose={() => setShowSavedPipelines(false)}
        />
      )}

      {showResults && (
        <PipelineResults results={pipelineResults} onClose={() => setShowResults(false)} isRunning={isRunning} />
      )}

      {showPipelineInfo && (
        <PipelineInfoModal
          isOpen={showPipelineInfo}
          onClose={() => setShowPipelineInfo(false)}
          pipeline={{
            id: crypto.randomUUID(),
            name: pipelineName,
            description: pipelineDescription,
            nodes,
            edges,
            lastSaved: lastSaved || undefined,
          }}
          modelMetrics={modelMetrics}
        />
      )}
      
      {showComparison && (
        <PipelineComparison
          savedPipelines={savedPipelines}
          onClose={() => setShowComparison(false)}
          onRunComparison={runPipelineComparison}
          resultsA={comparisonResultsA}
          resultsB={comparisonResultsB}
          isRunning={isComparing}
          onLoadPipeline={loadPipeline}
        />
      )}

      {showSnapshots && (
        <SnapshotHistory
          snapshots={snapshots}
          onCreateSnapshot={createSnapshot}
          onLoadSnapshot={loadSnapshot}
          onDeleteSnapshot={deleteSnapshot}
          onClose={() => setShowSnapshots(false)}
        />
      )}
      
      {showTemplates && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Pipeline Templates</CardTitle>
                <CardDescription>Choose a template to quickly start building your pipeline</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowTemplates(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            
            <ScrollArea className="flex-1 px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {pipelineTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => loadTemplateAction(template.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <div className="mr-4">
                          <span className="font-medium">{template.nodes.length}</span> nodes
                        </div>
                        <div>
                          <span className="font-medium">{template.edges.length}</span> connections
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="default" size="sm" className="w-full">
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            
            <CardFooter className="border-t p-4 mt-auto">
              <Button variant="outline" onClick={() => setShowTemplates(false)}>
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
      
      {showNodeHistory && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Node History</CardTitle>
                <CardDescription>View and restore previous versions of this node</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowNodeHistory(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            
            <ScrollArea className="flex-1 px-6 pb-6">
              {nodeVersions[showNodeHistory] && nodeVersions[showNodeHistory].length > 0 ? (
                <div className="space-y-4 pt-2">
                  {nodeVersions[showNodeHistory].map((version, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-sm font-medium">{version.label}</CardTitle>
                            <CardDescription className="text-xs">
                              {version.timestamp.toLocaleString()}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {index === 0 ? "Current" : `Version ${nodeVersions[showNodeHistory].length - index}`}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="bg-muted rounded-md p-2">
                          <pre className="text-xs overflow-auto max-h-24">
                            {JSON.stringify(version.data, null, 2)}
                          </pre>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        {index > 0 && (
                          <Button 
                            size="sm" 
                            onClick={() => restoreNodeVersion(showNodeHistory, version)}
                            className="w-full"
                          >
                            Restore This Version
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No history available for this node</p>
                  <p className="text-sm mt-2">Changes to the node will be tracked automatically</p>
                </div>
              )}
            </ScrollArea>
            
            <CardFooter className="border-t p-4 mt-auto">
              <Button variant="outline" onClick={() => setShowNodeHistory(null)}>
                Close
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-[600px]" style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {leftSidebarOpen && <ToolboxSidebar onClose={() => setLeftSidebarOpen(false)} />}

        <WorkflowEditor
          onNodeSelect={(nodeId) => setSelectedNode(nodeId)}
          selectedNode={selectedNode}
          nodes={nodes}
          setNodes={setNodes}
          edges={edges}
          setEdges={setEdges}
          leftSidebarOpen={leftSidebarOpen}
          rightSidebarOpen={rightSidebarOpen}
          pipelineResults={pipelineResults}
          onViewNodeHistory={(nodeId) => setShowNodeHistory(nodeId)}
        />

        {rightSidebarOpen && <AgentSidebar selectedNode={selectedNode} onClose={() => setRightSidebarOpen(false)} />}
      </div>
    </div>
  )
}

