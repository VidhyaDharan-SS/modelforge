"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  Lightbulb,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  Code,
  Copy,
  Check,
  X,
  BarChart3,
  HelpCircle,
  RefreshCw,
  Trash2,
  Smile,
  Mic,
  Settings as SettingsIcon,
  ArrowDownCircle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTheme } from "next-themes";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow, prism } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  threadId?: string;
  parentId?: string;
  codeBlocks?: {
    language: string;
    code: string;
  }[];
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface AgentSidebarProps {
  selectedNode: string | null;
  onClose: () => void;
}

export const AgentSidebar = ({ selectedNode, onClose }: AgentSidebarProps) => {
  // Smart suggestions update
  const smartSuggestions: string[] = [
    "Show pipeline summary",
    "Give me a fun ML fact",
    "Export pipeline as JSON",
    "Show data preview",
    "Suggest best model",
    "How do I add a node?",
    "Show recent errors",
    "How to deploy?",
    "Clear conversation",
    "Switch theme",
  ];

  // Pin message handler (stub)
  const pinMessage = (id: string) => {
    // Implement pinning logic here (e.g., move to top, highlight, etc.)
    alert("Pinned message " + id);
  };

  // Reply handler (new feature)
  const replyToMessage = (msg: Message) => {
    // Prepend quoted message text into the input field
    setInput(`> ${msg.content}\n\n`);
  };

  // Retry last message handler (stub)
  const retryLastMessage = () => {
    if (messages.length > 1) {
      setInput(messages[messages.length - 2].content);
      handleSendMessage();
    }
  };

  // Clear conversation handler
  const clearConversation = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hello! I'm your ML assistant. I can help you build your pipeline and suggest optimizations. What are you working on today?",
        timestamp: new Date(),
      },
    ]);
  };

  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your ML assistant. I can help you build your pipeline and suggest optimizations. What are you working on today?",
      timestamp: new Date(),
    },
  ]);
  const [threads, setThreads] = useState<Thread[]>([
    {
      id: "main",
      title: "Main Conversation",
      messages: [],
      createdAt: new Date(),
    },
  ]);
  const [activeThread, setActiveThread] = useState("main");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // New feature: auto-resizing chat input
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll only if user is at the bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current && scrollContainerRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages, autoScroll]);

  // Monitor scroll position to toggle autoScroll mode
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // If near bottom, enable autoScroll. Otherwise, disable.
      if (scrollHeight - scrollTop - clientHeight < 50) {
        setAutoScroll(true);
      } else {
        setAutoScroll(false);
      }
    }
  };

  useEffect(() => {
    if (copiedCode) {
      const timer = setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedCode]);

  useEffect(() => {
    if(textAreaRef.current){
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      threadId: activeThread,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");

    const loadingId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      {
        id: loadingId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
        threadId: activeThread,
      },
    ]);

    setIsTyping(true);

    const response = getAssistantResponse(input, selectedNode);
    let displayedResponse = "";
    let index = 0;

    const typingInterval = setInterval(() => {
      if (index < response.length) {
        displayedResponse += response.charAt(index);
        setMessages(prev =>
          prev.map(msg =>
            msg.id === loadingId
              ? { ...msg, content: displayedResponse, isLoading: true }
              : msg
          )
        );
        index++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);

        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const codeBlocks = [];
        let match;

        while ((match = codeBlockRegex.exec(response)) !== null) {
          codeBlocks.push({
            language: match[1] || "python",
            code: match[2].trim(),
          });
        }

        setMessages(prev =>
          prev.map(msg =>
            msg.id === loadingId
              ? {
                  ...msg,
                  content: response,
                  isLoading: false,
                  codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
                }
              : msg
          )
        );
      }
    }, 10);

    return () => clearInterval(typingInterval);
  };

  const getCurrentTimeString = () => {
    return "2025-04-21 11:14";
  };

  const getFunFact = () => {
    const facts = [
      "Did you know? The first neural network was invented in the 1950s!",
      "Tip: Feature scaling can dramatically improve model convergence.",
      "Motivation: Every pipeline error is a step closer to a robust solution!",
      "Fact: The term 'machine learning' was coined by Arthur Samuel in 1959.",
      "Remember: Data quality beats model complexity!",
    ];
    return facts[Math.floor(Math.random() * facts.length)];
  };

  const getPipelineSummary = () => {
    try {
      const nodes = JSON.parse(localStorage.getItem("ml-previous-nodes") || "[]");
      if (!nodes.length) return "Your pipeline is currently empty.";
      const nodeTypes = nodes.map((n: any) => n.type).join(", ");
      return `Pipeline has ${nodes.length} nodes: ${nodeTypes}.`;
    } catch {
      return "Unable to summarize pipeline.";
    }
  };

  const getAssistantResponse = (
    userInput: string,
    nodeId: string | null
  ): string => {
    const lowerInput = userInput.toLowerCase();

    if (/time|date|clock/.test(lowerInput)) {
      return `It's currently ${getCurrentTimeString()} (local time). Ready to code anytime!`;
    }

    if (/fact|motivat|tip|quote/.test(lowerInput)) {
      return getFunFact();
    }

    if (/pipeline summary|what is in my pipeline|show pipeline/.test(lowerInput)) {
      return getPipelineSummary();
    }

    if (/(code|python|script|function|example)/.test(lowerInput)) {
      if (/preprocessing|clean/.test(lowerInput)) {
        return `Here's a robust preprocessing example in Python:\n\n\
import pandas as pd\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.preprocessing import StandardScaler\n\ndef preprocess(df, target):\n    num_cols = df.select_dtypes(include=['number']).columns.tolist()\n    cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()\n    num_cols = [col for col in num_cols if col !== target]\n    cat_cols = [col for col in cat_cols if col !== target]\n    imputer = SimpleImputer(strategy='mean')\n    df[num_cols] = imputer.fit_transform(df[num_cols])\n    scaler = StandardScaler()\n    df[num_cols] = scaler.fit_transform(df[num_cols])\n    return df`;
      }
      if (/feature/.test(lowerInput)) {
        return `Feature engineering tip: Try polynomial features for non-linear patterns or use domain knowledge to create new columns.`;
      }
      if (/model|train/.test(lowerInput)) {
        return `Here's a quick model training snippet:\n\n\
from sklearn.ensemble import RandomForestClassifier\nmodel = RandomForestClassifier()\nmodel.fit(X_train, y_train)`;
      }
      return `Could you specify which part of the pipeline you want code for? (e.g., preprocessing, training, evaluation)`;
    }

    if (nodeId) {
      switch (nodeId) {
        case "data-source":
          return "🗂️ Data Source node: Bring your data to life! Import from CSV, DB, or API. Pro tip: Clean data = happy models.";
        case "data-preprocessing":
          return "🧹 Preprocessing node: I'm your data janitor! Handle missing values, normalize, and encode features. Need a cleaning recipe?";
        case "feature-engineering":
          return "🛠️ Feature Engineering: Time to get creative! Try polynomial, interaction, or domain-inspired features. Want a feature idea?";
        case "sklearn-models":
          return "🤖 Model node: Choose your fighter! RandomForest, XGBoost, or something else? Let me know your data and I'll suggest the best.";
        case "model-evaluation":
          return "📊 Evaluation node: Let's see how your model performs! Accuracy, F1, ROC-AUC—I've got the metrics. Want to visualize results?";
        default:
          return `You're working on the ${nodeId} node. Ask me for tips, code, or best practices!`;
      }
    }

    if (/(model|algorithm|classifier|regressor)/.test(lowerInput)) {
      if (/compare|best|choose/.test(lowerInput)) {
        return "For tabular data, Random Forest and XGBoost are strong choices. For deep learning, try TensorFlow or PyTorch models. Want a visual comparison or code example?";
      }
      if (/explain|difference|vs/.test(lowerInput)) {
        return "Random Forest: Ensemble of decision trees, great for tabular data. XGBoost: Gradient boosting, often wins competitions. Neural Net: Best for images/text. Want more details?";
      }
      return "Tell me your data type (tabular, image, text) and I'll suggest the best model!";
    }

    if (/data preview|show data|columns|shape|sample row|sample data/.test(lowerInput)) {
      try {
        const pipeline = JSON.parse(localStorage.getItem("ml-previous-nodes") || "[]");
        if (pipeline.length > 0 && pipeline[0].data && pipeline[0].data.preview) {
          const preview = pipeline[0].data.preview;
          let sample = "";
          if (
            preview.sample &&
            Array.isArray(preview.sample) &&
            preview.sample.length > 0
          ) {
            sample = "\nSample row: " + JSON.stringify(preview.sample[0]);
          }
          return `Data shape: ${preview.shape || "Unknown"}\nColumns: ${
            Array.isArray(preview.columns)
              ? preview.columns.join(", ")
              : "Unknown"
          }${sample}`;
        }
        return "No preview data available.";
      } catch {
        return "No preview data available.";
      }
    }

    if (/status|run|execution|progress|how is my pipeline/.test(lowerInput)) {
      const statuses = [
        "Idle. Ready when you are!",
        "Running... crunching numbers and optimizing magic!",
        "Success! Your pipeline executed flawlessly.",
        "Error: Oops, something went wrong. Check your data and try again.",
      ];
      const idx = Math.floor(Math.random() * statuses.length);
      return `Pipeline status: ${statuses[idx]}`;
    }

    if (/export|download|json|save pipeline/.test(lowerInput)) {
      return "Just click the 'Export Pipeline as JSON' button below to save your pipeline. Need help importing it later?";
    }

    if (/hello|hi|hey/.test(lowerInput)) {
      return "👋 Hello! I'm your ML copilot. What can we build together today?";
    }
    if (/help|assist|support|how to|usage/.test(lowerInput)) {
      return "I'm here to help! Ask about data, models, evaluation, pipeline export, or even for a fun ML fact.";
    }
    if (/thank/.test(lowerInput)) {
      return "You're welcome! 🚀 Ready for your next ML adventure?";
    }
    if (/joke|funny/.test(lowerInput)) {
      return "Why did the data scientist break up with the spreadsheet? Too many issues with commitment (columns)!";
    }
    if (/who are you|your name/.test(lowerInput)) {
      return "I'm your friendly ML assistant, always here to help you build, debug, and optimize your pipelines!";
    }
    if (/bored|tired/.test(lowerInput)) {
      return "Take a break! Even the best models need time to converge. ☕";
    }

    return [
      "I'm ready to help. Ask about any ML step, code, or pipeline feature!",
      "What challenge in your pipeline can I solve for you today?",
      "Curious about a model, metric, or data step? Just ask!",
      "Let's make your ML workflow smoother. What do you need?",
      getFunFact(),
    ][Math.floor(Math.random() * 5)];
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
  };

  const renderMessageContent = (message: Message) => {
    if (message.isLoading && message.content === "") {
      return (
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Thinking...</span>
        </div>
      );
    }

    if (message.codeBlocks && message.codeBlocks.length > 0) {
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let lastIndex = 0;
      const parts = [];
      let match;
      const content = message.content;

      while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <p key={`text-${lastIndex}`} className="whitespace-pre-wrap mb-4">
              {content.substring(lastIndex, match.index)}
            </p>
          );
        }

        const language = match[1] || "python";
        const code = match[2].trim();
        parts.push(
          <div key={`code-${match.index}`} className="relative mb-4 rounded-md overflow-hidden">
            <div className="flex items-center justify-between bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <span>{language}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(code)}
                >
                  {copiedCode === code ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => replyToMessage(message)}
                  title="Reply"
                >
                  <ReplyIcon />
                </Button>
              </div>
            </div>
            <SyntaxHighlighter
              language={language}
              style={theme === "dark" ? tomorrow : prism}
              customStyle={{
                margin: 0,
                padding: "1rem",
                borderRadius: "0 0 0.375rem 0.375rem",
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < content.length) {
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {content.substring(lastIndex)}
          </p>
        );
      }

      return <>{parts}</>;
    }

    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };

  // Custom Reply Icon Component
  const ReplyIcon = () => (
    // Simple reply icon using an SVG path
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10l9-9m0 0l9 9M4 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3" />
    </svg>
  );

  return (
    <div
      className={cn(
        "border-l h-full bg-background flex flex-col z-10 transition-all duration-300",
        expanded ? "w-[40rem]" : "w-80"
      )}
    >
      <div className="border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold px-4 py-2 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          ML Assistant
        </h2>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="mr-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        className="flex flex-col h-screen w-[340px] min-w-[320px] max-w-[380px] bg-sidebar-background border-l border-sidebar-border shadow-lg"
      >
        <Tabs defaultValue="chat" className="flex flex-col h-full">
          <TabsList className="sticky top-0 z-20 bg-sidebar-background border-b border-sidebar-border grid w-full grid-cols-4">
            <TabsTrigger value="chat" className="relative">
              Chat
              {isTyping && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="settings">
              <SettingsIcon className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex flex-col flex-1 min-h-0">
            <div
              className="flex-1 min-h-0 overflow-y-auto"
              ref={scrollContainerRef}
              onScroll={handleScroll}
            >
              <ScrollArea className="h-full px-2">
                <div className="space-y-4 pt-2 pb-6">
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex group",
                        msg.role === "assistant"
                          ? "justify-start"
                          : "justify-end"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <Avatar className={cn("h-8 w-8 transition-all", isTyping && idx === messages.length - 1 ? "animate-bounce" : "")}>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <Bot size={16} />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "rounded-lg p-3 max-w-[85%] transition-all relative",
                          msg.role === "assistant"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {renderMessageContent(msg)}
                        <div className="mt-1 text-xs opacity-70 text-right">
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {/* Pin/Copy/Reply actions */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={() => pinMessage(msg.id)} title="Pin message">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={() => copyToClipboard(msg.content)} title="Copy message">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={() => replyToMessage(msg)} title="Reply">
                            <ReplyIcon />
                          </Button>
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <User size={16} />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>
            {/* Show a "Scroll to Bottom" button when autoScroll is off */}
            {!autoScroll && (
              <div className="sticky bottom-16 z-20 flex justify-end pr-4 pb-2">
                <Button variant="ghost" size="icon" onClick={() => {
                  setAutoScroll(true);
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }} title="Scroll to Bottom">
                  <ArrowDownCircle className="h-5 w-5" />
                </Button>
              </div>
            )}
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" /> Assistant is typing...
              </div>
            )}
            {/* Enhanced Chat input bar */}
            <div className="border-t p-3 bg-background flex flex-col gap-2 sticky bottom-0 z-10">
              {/* Smart suggestions */}
              <div className="flex flex-wrap gap-2 mb-1">
                {smartSuggestions.map((s, i) => (
                  <Button key={i} size="sm" variant="outline" className="text-xs" onClick={() => setInput(s)}>{s}</Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={textAreaRef}
                    placeholder={isTyping ? "Assistant is typing..." : "Type your message..."}
                    value={input}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isTyping}
                    className="w-full resize-none p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {/* Additional UI buttons */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                    <Button variant="ghost" size="icon" title="Emoji Picker">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Voice Input">
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={isTyping || !input.trim()}
                        className={cn("transition-all", !input.trim() && "opacity-70")}
                        aria-label="Send message"
                      >
                        {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send message (Enter)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto px-2 py-4">
            <div className="text-xs font-semibold mb-2">Recent Conversations</div>
            {threads.length > 1 ? (
              <div className="space-y-2">
                {threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={cn(
                      "p-2 rounded border cursor-pointer",
                      thread.id === activeThread ? "bg-primary/10 border-primary" : "bg-muted border-muted"
                    )}
                    onClick={() => setActiveThread(thread.id)}
                  >
                    <div className="font-medium truncate">{thread.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {thread.messages.length} messages • {thread.createdAt.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No conversation history yet.</div>
            )}
          </TabsContent>

          <TabsContent value="faq" className="flex-1 overflow-y-auto px-2 py-4">
            <div className="font-semibold text-xs mb-2">Frequently Asked Questions</div>
            <div className="space-y-2">
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="w-full text-left font-medium text-xs px-2 py-1 bg-muted rounded hover:bg-muted-foreground/10">
                  How do I add a new node?
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-1 text-xs">
                  Drag a component from the left sidebar onto the canvas.
                </CollapsibleContent>
              </Collapsible>
              <Collapsible>
                <CollapsibleTrigger className="w-full text-left font-medium text-xs px-2 py-1 bg-muted rounded hover:bg-muted-foreground/10">
                  How do I export my pipeline?
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-1 text-xs">
                  Use the 'Export Pipeline as JSON' button at the bottom of this sidebar.
                </CollapsibleContent>
              </Collapsible>
              <Collapsible>
                <CollapsibleTrigger className="w-full text-left font-medium text-xs px-2 py-1 bg-muted rounded hover:bg-muted-foreground/10">
                  How can I get code for a step?
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-1 text-xs">
                  Ask the ML assistant in the Chat tab for code examples or explanations for any node.
                </CollapsibleContent>
              </Collapsible>
              <Collapsible>
                <CollapsibleTrigger className="w-full text-left font-medium text-xs px-2 py-1 bg-muted rounded hover:bg-muted-foreground/10">
                  How do I view pipeline status?
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-1 text-xs">
                  Check the Pipeline Execution Status card at the bottom of this sidebar for real-time updates.
                </CollapsibleContent>
              </Collapsible>
              <Collapsible>
                <CollapsibleTrigger className="w-full text-left font-medium text-xs px-2 py-1 bg-muted rounded hover:bg-muted-foreground/10">
                  Where can I see a data preview?
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-1 text-xs">
                  See the Data Preview card at the bottom of this sidebar for columns and shape.
                </CollapsibleContent>
              </Collapsible>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-y-auto px-2 py-4">
            <div className="font-semibold text-xs mb-2">Settings</div>
            <div className="space-y-4">
              <Card className="border p-2">
                <CardHeader className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium">Theme</CardTitle>
                  <Button
                    size="sm"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    variant="outline"
                  >
                    Toggle Theme
                  </Button>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Switch between dark and light mode.
                </CardContent>
              </Card>
              <Card className="border p-2">
                <CardHeader>
                  <CardTitle className="text-xs font-medium">Customize Experience</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Future settings for notifications, auto-save, & more.
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 w-full z-10 bg-sidebar-background border-t border-sidebar-border pt-2 pb-2 px-2">
          <Card className="mb-2 border-primary/30 bg-primary/5 dark:bg-primary/10">
            <CardHeader className="py-2 flex flex-row items-center gap-2">
              <Sparkles className="h-4 w-4 mr-2 text-primary" />
              <CardTitle className="text-xs font-semibold">Quick Tip</CardTitle>
            </CardHeader>
            <CardContent className="py-1 text-xs">
              <span>
                {[
                  "Use the search bar to quickly find components.",
                  "Drag nodes to rearrange your pipeline visually.",
                  "Click a node for contextual help in this sidebar.",
                  "Export your pipeline for reuse anytime.",
                  "Ask me for a fun ML fact!"
                ][Math.floor(Date.now() / 60000) % 5]}
              </span>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Card className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader className="py-2">
                <CardTitle className="text-xs font-medium flex items-center">
                  <Code className="h-4 w-4 mr-2 text-blue-500" />
                  Export Pipeline as JSON
                </CardTitle>
              </CardHeader>
              <CardContent className="py-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const pipeline =
                      localStorage.getItem("ml-previous-nodes") || "[]";
                    const blob = new Blob([pipeline], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "pipeline.json";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Download Pipeline JSON
                </Button>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader className="py-2">
                <CardTitle className="text-xs font-medium flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 text-yellow-500 animate-spin" />
                  Pipeline Execution Status
                </CardTitle>
              </CardHeader>
              <CardContent className="py-1">
                <div className="text-xs">Monitor pipeline run status and get instant feedback here.</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">Idle</Badge>
                  <Badge variant="outline" className="text-xs">Running</Badge>
                  <Badge variant="outline" className="text-xs">Success</Badge>
                  <Badge variant="outline" className="text-xs">Error</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CardHeader className="py-2">
                <CardTitle className="text-xs font-medium flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-green-500" />
                  Data Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="py-1">
                <div className="text-xs">
                  {(() => {
                    try {
                      const pipeline = JSON.parse(
                        localStorage.getItem("ml-previous-nodes") || "[]"
                      );
                      if (
                        pipeline.length > 0 &&
                        pipeline[0].data &&
                        pipeline[0].data.preview
                      ) {
                        const preview = pipeline[0].data.preview;
                        return (
                          <>
                            <div>Shape: {preview.shape || "Unknown"}</div>
                            <div>
                              Columns:{" "}
                              {Array.isArray(preview.columns)
                                ? preview.columns.join(", ")
                                : "Unknown"}
                            </div>
                          </>
                        );
                      }
                      return "No preview data available.";
                    } catch {
                      return "No preview data available.";
                    }
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};