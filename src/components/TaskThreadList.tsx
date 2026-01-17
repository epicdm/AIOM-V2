import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { TaskThreadItem } from "./TaskThreadItem";
import { useUserTaskThreads } from "~/hooks/useTaskConversationLinks";
import {
  MessageSquare,
  Plus,
  Loader2,
  FolderOpen,
} from "lucide-react";
import type { TaskThreadWithDetails } from "~/data-access/task-conversation-links";

interface TaskThreadListProps {
  selectedThreadId?: string;
  onSelectThread: (thread: TaskThreadWithDetails) => void;
  onCreateThread?: () => void;
  className?: string;
}

export function TaskThreadList({
  selectedThreadId,
  onSelectThread,
  onCreateThread,
  className,
}: TaskThreadListProps) {
  const {
    data: threads,
    isLoading,
    error,
  } = useUserTaskThreads();

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <p className="text-sm text-destructive">Failed to load threads</p>
        <p className="text-xs text-muted-foreground mt-1">Please try again</p>
      </div>
    );
  }

  if (!threads || threads.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <div className="p-3 rounded-full bg-muted/50 mb-3">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No task threads yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create a thread to discuss a task with your team
        </p>
        {onCreateThread && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onCreateThread}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Thread
          </Button>
        )}
      </div>
    );
  }

  // Group threads by status
  const openThreads = threads.filter((t) => t.status === "open");
  const closedThreads = threads.filter((t) => t.status !== "open");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with create button */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Task Threads</span>
          <span className="text-xs text-muted-foreground">
            ({threads.length})
          </span>
        </div>
        {onCreateThread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onCreateThread}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Open threads */}
      {openThreads.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 uppercase tracking-wider">
            Open ({openThreads.length})
          </p>
          {openThreads.map((thread) => (
            <TaskThreadItem
              key={thread.id}
              thread={thread}
              isActive={selectedThreadId === thread.id}
              onClick={() => onSelectThread(thread)}
            />
          ))}
        </div>
      )}

      {/* Closed/Resolved threads */}
      {closedThreads.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 uppercase tracking-wider">
            Closed ({closedThreads.length})
          </p>
          {closedThreads.map((thread) => (
            <TaskThreadItem
              key={thread.id}
              thread={thread}
              isActive={selectedThreadId === thread.id}
              onClick={() => onSelectThread(thread)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
