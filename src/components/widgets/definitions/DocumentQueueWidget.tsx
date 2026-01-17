import * as React from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileWarning,
  RefreshCw,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { WidgetDefinition, WidgetProps } from "../types";

/**
 * Document Item Interface
 */
export interface DocumentQueueItem {
  id: string;
  name: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  submittedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Document Queue Widget Data
 */
export interface DocumentQueueData {
  items: DocumentQueueItem[];
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

/**
 * Document Queue Widget Config
 */
export interface DocumentQueueConfig {
  maxItems: number;
  showCompletedItems: boolean;
  showProgress: boolean;
  autoRefresh: boolean;
}

/**
 * Status configuration mapping
 */
const statusConfig = {
  pending: {
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "Pending",
  },
  processing: {
    icon: Loader2,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Processing",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Completed",
  },
  failed: {
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "Failed",
  },
};

/**
 * Document Queue Widget Component
 */
function DocumentQueueWidgetComponent({
  data,
  isLoading,
  error,
  instance,
  onRefresh,
}: WidgetProps<DocumentQueueData, DocumentQueueConfig>) {
  const config = instance.config as unknown as DocumentQueueConfig;

  // Sample data for demonstration
  const sampleItems: DocumentQueueItem[] = [
    {
      id: "1",
      name: "Invoice_2024_001.pdf",
      type: "invoice",
      status: "processing",
      progress: 65,
      submittedAt: new Date(Date.now() - 300000),
    },
    {
      id: "2",
      name: "Receipt_Travel.jpg",
      type: "receipt",
      status: "pending",
      submittedAt: new Date(Date.now() - 600000),
    },
    {
      id: "3",
      name: "Contract_ClientA.pdf",
      type: "contract",
      status: "completed",
      submittedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3000000),
    },
    {
      id: "4",
      name: "Report_Q4.xlsx",
      type: "report",
      status: "failed",
      submittedAt: new Date(Date.now() - 7200000),
      error: "Invalid format",
    },
    {
      id: "5",
      name: "Expense_Report.pdf",
      type: "expense",
      status: "processing",
      progress: 30,
      submittedAt: new Date(Date.now() - 120000),
    },
  ];

  const sampleStats = {
    total: 25,
    pending: 10,
    processing: 5,
    completed: 8,
    failed: 2,
  };

  const items = data?.items ?? sampleItems;
  const stats = data?.stats ?? sampleStats;

  // Filter items based on config
  let filteredItems = config.showCompletedItems
    ? items
    : items.filter((i) => i.status !== "completed");

  filteredItems = filteredItems.slice(0, config.maxItems);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse flex flex-col space-y-3 w-full p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-destructive">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-lg bg-yellow-500/10">
          <div className="text-lg font-bold text-yellow-500">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10">
          <div className="text-lg font-bold text-blue-500">{stats.processing}</div>
          <div className="text-xs text-muted-foreground">Processing</div>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10">
          <div className="text-lg font-bold text-green-500">{stats.completed}</div>
          <div className="text-xs text-muted-foreground">Done</div>
        </div>
        <div className="p-2 rounded-lg bg-red-500/10">
          <div className="text-lg font-bold text-red-500">{stats.failed}</div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${(stats.completed / stats.total) * 100}%` }}
        />
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${(stats.processing / stats.total) * 100}%` }}
        />
        <div
          className="bg-yellow-500 transition-all"
          style={{ width: `${(stats.pending / stats.total) * 100}%` }}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${(stats.failed / stats.total) * 100}%` }}
        />
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No documents in queue</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const statusInfo = statusConfig[item.status];
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  "hover:bg-muted/50",
                  item.status === "failed" && "border-l-2 border-l-red-500"
                )}
              >
                <div className={cn("p-2 rounded-lg", statusInfo.bgColor)}>
                  <StatusIcon
                    className={cn(
                      "w-4 h-4",
                      statusInfo.color,
                      item.status === "processing" && "animate-spin"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{item.name}</span>
                    <span className={cn("text-xs font-medium", statusInfo.color)}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(item.submittedAt)}
                    </span>
                    {config.showProgress && item.progress !== undefined && item.status === "processing" && (
                      <span className="text-xs text-blue-500">{item.progress}%</span>
                    )}
                  </div>
                  {config.showProgress && item.progress !== undefined && item.status === "processing" && (
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.error && (
                    <p className="text-xs text-red-500 mt-1">{item.error}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View All / Refresh */}
      <div className="flex items-center justify-between pt-2 border-t">
        <button className="text-sm text-primary hover:underline">
          View all {stats.total} documents
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Document Queue Widget Definition
 */
export const DocumentQueueWidgetDefinition: WidgetDefinition<
  DocumentQueueData,
  DocumentQueueConfig
> = {
  id: "document-queue",
  name: "Document Queue",
  description: "Monitor document processing queue status and progress",
  category: "system",
  defaultSize: "medium",
  supportedSizes: ["medium", "large"],
  icon: FileText,
  dataRequirements: [
    {
      key: "documents",
      label: "Document Queue",
      description: "Documents in processing queue",
      required: true,
      type: "query",
    },
  ],
  configOptions: [
    {
      key: "maxItems",
      label: "Maximum Items",
      description: "Maximum number of documents to display",
      type: "number",
      defaultValue: 5,
      validation: { min: 1, max: 20 },
    },
    {
      key: "showCompletedItems",
      label: "Show Completed",
      description: "Include completed documents in the list",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "showProgress",
      label: "Show Progress",
      description: "Display processing progress bars",
      type: "boolean",
      defaultValue: true,
    },
    {
      key: "autoRefresh",
      label: "Auto Refresh",
      description: "Automatically refresh the queue",
      type: "boolean",
      defaultValue: true,
    },
  ],
  component: DocumentQueueWidgetComponent,
  defaultConfig: {
    maxItems: 5,
    showCompletedItems: false,
    showProgress: true,
    autoRefresh: true,
  },
  supportsRefresh: true,
  minRefreshInterval: 10000,
};
