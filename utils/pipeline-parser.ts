/**
 * Utility functions for parsing ML pipelines from different formats
 */

import type { Edge, Node } from "reactflow"
import type { PipelineData } from "@/components/pipeline-builder"

/**
 * Parse a Python script into a pipeline representation
 */
export function parseFromPythonScript(pythonCode: string): PipelineData | null {
  try {
    // Initialize pipeline data
    const pipelineData: PipelineData = {
      id: crypto.randomUUID(),
      name: "Imported Python Pipeline",
      description: "Pipeline imported from Python script",
      nodes: [],
      edges: [],
      lastSaved: new Date(),
    }

    // Extract pipeline name
    const nameMatch = pythonCode.match(/# Pipeline: (.+)$/m)
    if (nameMatch) {
      pipelineData.name = nameMatch[1].trim()
    }

    // Extract pipeline description
    const descMatch = pythonCode.match(/"""(.+?)"""/s)
    if (descMatch) {
      pipelineData.description = descMatch[1].trim()
    }

    // Identify data source
    if (pythonCode.includes("pd.read_csv") || pythonCode.includes("pandas.read_csv")) {
      const dataSourceNode: Node = {
        id: `data-source-${Date.now()}`,
        type: "data-source",
        position: { x: 100, y: 100 },
        data: { label: "Data Source" },
      }
      pipelineData.nodes.push(dataSourceNode)
    }

    // Identify preprocessing
    if (
      pythonCode.includes("SimpleImputer") ||
      pythonCode.includes("StandardScaler") ||
      pythonCode.includes("fillna") ||
      pythonCode.includes("preprocessing")
    ) {
      const preprocessingNode: Node = {
        id: `data-preprocessing-${Date.now() + 1}`,
        type: "data-preprocessing",
        position: { x: 400, y: 100 },
        data: { label: "Data Preprocessing" },
      }
      pipelineData.nodes.push(preprocessingNode)
    }

    // Identify feature engineering
    if (
      pythonCode.includes("PolynomialFeatures") ||
      pythonCode.includes("feature_") ||
      pythonCode.includes("selectfrom") ||
      pythonCode.includes("interaction")
    ) {
      const featureEngNode: Node = {
        id: `feature-engineering-${Date.now() + 2}`,
        type: "feature-engineering",
        position: { x: 700, y: 100 },
        data: { label: "Feature Engineering" },
      }
      pipelineData.nodes.push(featureEngNode)
    }

    // Identify model type
    let modelNode: Node | null = null
    if (
      pythonCode.includes("RandomForest") ||
      pythonCode.includes("LogisticRegression") ||
      pythonCode.includes("sklearn")
    ) {
      modelNode = {
        id: `sklearn-models-${Date.now() + 3}`,
        type: "sklearn-models",
        position: { x: 1000, y: 100 },
        data: { label: "Scikit-Learn Model" },
      }
    } else if (pythonCode.includes("xgboost") || pythonCode.includes("XGBoost")) {
      modelNode = {
        id: `xgboost-models-${Date.now() + 3}`,
        type: "xgboost-models",
        position: { x: 1000, y: 100 },
        data: { label: "XGBoost Model" },
      }
    } else if (pythonCode.includes("lightgbm") || pythonCode.includes("LightGBM")) {
      modelNode = {
        id: `lightgbm-models-${Date.now() + 3}`,
        type: "lightgbm-models",
        position: { x: 1000, y: 100 },
        data: { label: "LightGBM Model" },
      }
    } else if (pythonCode.includes("keras") || pythonCode.includes("tensorflow")) {
      modelNode = {
        id: `tensorflow-models-${Date.now() + 3}`,
        type: "tensorflow-models",
        position: { x: 1000, y: 100 },
        data: { label: "TensorFlow Model" },
      }
    } else if (pythonCode.includes("torch") || pythonCode.includes("pytorch")) {
      modelNode = {
        id: `pytorch-models-${Date.now() + 3}`,
        type: "pytorch-models",
        position: { x: 1000, y: 100 },
        data: { label: "PyTorch Model" },
      }
    }

    if (modelNode) {
      pipelineData.nodes.push(modelNode)
    }

    // Identify evaluation
    if (
      pythonCode.includes("accuracy_score") ||
      pythonCode.includes("classification_report") ||
      pythonCode.includes("confusion_matrix") ||
      pythonCode.includes("mean_squared_error")
    ) {
      const evalNode: Node = {
        id: `model-evaluation-${Date.now() + 4}`,
        type: "model-evaluation",
        position: { x: 1300, y: 100 },
        data: { label: "Model Evaluation" },
      }
      pipelineData.nodes.push(evalNode)
    }

    // Identify hyperparameter tuning
    if (
      pythonCode.includes("GridSearchCV") ||
      pythonCode.includes("RandomizedSearchCV") ||
      pythonCode.includes("optuna") ||
      pythonCode.includes("hyperopt")
    ) {
      const tuningNode: Node = {
        id: `hyperparameter-tuning-${Date.now() + 5}`,
        type: "hyperparameter-tuning",
        position: { x: 1000, y: 300 },
        data: { label: "Hyperparameter Tuning" },
      }
      pipelineData.nodes.push(tuningNode)
    }

    // Create edges between nodes based on pipeline order
    for (let i = 0; i < pipelineData.nodes.length - 1; i++) {
      const edge: Edge = {
        id: `edge-${pipelineData.nodes[i].id}-${pipelineData.nodes[i + 1].id}`,
        source: pipelineData.nodes[i].id,
        target: pipelineData.nodes[i + 1].id,
        type: "custom",
        animated: true,
      }
      pipelineData.edges.push(edge)
    }

    // Return the parsed pipeline
    return pipelineData
  } catch (error) {
    console.error("Error parsing Python script:", error)
    return null
  }
}

/**
 * Parse a Jupyter notebook into a pipeline representation
 */
export function parseFromJupyterNotebook(notebookJson: string): PipelineData | null {
  try {
    const notebook = JSON.parse(notebookJson)

    // Extract all code cells and join them
    const codeCells = notebook.cells
      .filter((cell) => cell.cell_type === "code")
      .map((cell) => (Array.isArray(cell.source) ? cell.source.join("") : cell.source))
      .join("\n\n")

    // Get title from markdown cells if available
    let name = "Imported Jupyter Pipeline"
    let description = "Pipeline imported from Jupyter notebook"

    const markdownCells = notebook.cells.filter((cell) => cell.cell_type === "markdown")
    if (markdownCells.length > 0) {
      const firstMarkdown = Array.isArray(markdownCells[0].source)
        ? markdownCells[0].source.join("")
        : markdownCells[0].source

      // Try to extract title from markdown heading
      const titleMatch = firstMarkdown.match(/# (.+?)[\n$]/)
      if (titleMatch) {
        name = titleMatch[1].trim()
      }

      // Use the first paragraph as description
      const descMatch = firstMarkdown.match(/# .+?\n\n(.+?)(\n\n|$)/s)
      if (descMatch) {
        description = descMatch[1].trim()
      }
    }

    // Use the Python parser for the code content
    const pipeline = parseFromPythonScript(codeCells)

    if (!pipeline) return null

    pipeline.name = name
    pipeline.description = description

    return pipeline
  } catch (error) {
    console.error("Error parsing Jupyter notebook:", error)
    return null
  }
}

/**
 * Parse a sklearn pipeline into a pipeline representation
 */
export function parseFromSklearnPipeline(sklearnCode: string): PipelineData | null {
  try {
    // Initialize pipeline data
    const pipelineData: PipelineData = {
      id: crypto.randomUUID(),
      name: "Imported scikit-learn Pipeline",
      description: "Pipeline imported from scikit-learn Pipeline definition",
      nodes: [],
      edges: [],
      lastSaved: new Date(),
    }

    // Extract steps from the Pipeline definition
    const pipelineMatch = sklearnCode.match(/Pipeline\s*$$\s*steps\s*=\s*\[([\s\S]*?)\]\s*$$/)
    if (!pipelineMatch) {
      // Try to find ColumnTransformer or other pipeline variations
      const colTransMatch = sklearnCode.match(/ColumnTransformer\s*$$\s*transformers\s*=\s*\[([\s\S]*?)\]\s*$$/)
      if (colTransMatch) {
        // Process ColumnTransformer steps
        const transformers = colTransMatch[1]
        // Add a preprocessing node
        pipelineData.nodes.push({
          id: `data-preprocessing-${Date.now()}`,
          type: "data-preprocessing",
          position: { x: 100, y: 100 },
          data: { label: "Data Preprocessing" },
        })
      }
    } else {
      // Extract steps from the Pipeline match
      const stepsString = pipelineMatch[1]
      const stepMatches = [...stepsString.matchAll(/$$\s*['"]([^'"]+)['"]\s*,\s*([^()]+\([^)]*$$)/g)]

      // Position tracking
      let xPos = 100
      const yPos = 100
      const xStep = 300

      // Create nodes for each step
      for (const stepMatch of stepMatches) {
        const stepName = stepMatch[1]
        const stepImplementation = stepMatch[2].trim()

        let nodeType = ""
        let nodeLabel = stepName

        if (
          stepImplementation.includes("SimpleImputer") ||
          stepImplementation.includes("StandardScaler") ||
          stepImplementation.includes("OneHotEncoder")
        ) {
          nodeType = "data-preprocessing"
          nodeLabel = `Preprocessing: ${stepName}`
        } else if (
          stepImplementation.includes("PolynomialFeatures") ||
          stepImplementation.includes("PCA") ||
          stepImplementation.includes("SelectKBest")
        ) {
          nodeType = "feature-engineering"
          nodeLabel = `Feature Engineering: ${stepName}`
        } else if (
          stepImplementation.includes("RandomForest") ||
          stepImplementation.includes("LogisticRegression") ||
          stepImplementation.includes("SVC")
        ) {
          nodeType = "sklearn-models"
          nodeLabel = `Model: ${stepName}`
        } else if (stepImplementation.includes("XGBClassifier") || stepImplementation.includes("XGBRegressor")) {
          nodeType = "xgboost-models"
          nodeLabel = `Model: ${stepName}`
        } else {
          // Default to preprocessing for unknown steps
          nodeType = "data-preprocessing"
          nodeLabel = stepName
        }

        pipelineData.nodes.push({
          id: `${nodeType}-${Date.now() + pipelineData.nodes.length}`,
          type: nodeType,
          position: { x: xPos, y: yPos },
          data: { label: nodeLabel },
        })

        xPos += xStep
      }
    }

    // If we don't have a data source, add one
    if (!pipelineData.nodes.some((node) => node.type === "data-source")) {
      pipelineData.nodes.unshift({
        id: `data-source-${Date.now() - 1000}`,
        type: "data-source",
        position: { x: 100, y: 100 },
        data: { label: "Data Source" },
      })

      // Shift other nodes to the right
      pipelineData.nodes.forEach((node, index) => {
        if (index > 0) {
          node.position.x += 300
        }
      })
    }

    // If we don't have an evaluation, add one at the end
    if (!pipelineData.nodes.some((node) => node.type?.includes("evaluation"))) {
      pipelineData.nodes.push({
        id: `model-evaluation-${Date.now() + 1000}`,
        type: "model-evaluation",
        position: { x: 100 + pipelineData.nodes.length * 300, y: 100 },
        data: { label: "Model Evaluation" },
      })
    }

    // Create edges between nodes
    for (let i = 0; i < pipelineData.nodes.length - 1; i++) {
      const edge: Edge = {
        id: `edge-${pipelineData.nodes[i].id}-${pipelineData.nodes[i + 1].id}`,
        source: pipelineData.nodes[i].id,
        target: pipelineData.nodes[i + 1].id,
        type: "custom",
        animated: true,
      }
      pipelineData.edges.push(edge)
    }

    return pipelineData
  } catch (error) {
    console.error("Error parsing scikit-learn Pipeline:", error)
    return null
  }
}

/**
 * Detect pipeline format and parse accordingly
 */
export function parseImportedPipeline(content: string): PipelineData | null {
  try {
    // Try to parse as JSON first (our own format)
    try {
      const jsonData = JSON.parse(content)
      if (jsonData.nodes && jsonData.edges) {
        return {
          id: jsonData.id || crypto.randomUUID(),
          name: jsonData.name || "Imported Pipeline",
          description: jsonData.description || "",
          nodes: jsonData.nodes || [],
          edges: jsonData.edges || [],
          lastSaved: jsonData.lastSaved ? new Date(jsonData.lastSaved) : new Date(),
        }
      }
    } catch (e) {
      // Not valid JSON, continue to other formats
    }

    // Check if it's likely a Jupyter notebook
    if (content.includes('"cell_type"') && content.includes('"nbformat"')) {
      return parseFromJupyterNotebook(content)
    }

    // Check if it looks like a scikit-learn pipeline
    if (content.includes("Pipeline(") || content.includes("ColumnTransformer(")) {
      return parseFromSklearnPipeline(content)
    }

    // Default to Python script parsing
    return parseFromPythonScript(content)
  } catch (error) {
    console.error("Error parsing pipeline:", error)
    return null
  }
}

