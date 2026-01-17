import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TaskThreadList } from "~/components/TaskThreadList";
import { TaskThreadDetail } from "~/components/TaskThreadDetail";
import { CreateTaskThreadDialog } from "~/components/CreateTaskThreadDialog";
import { useUnreadThreadCount } from "~/hooks/useTaskConversationLinks";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import type { TaskThreadWithDetails } from "~/data-access/task-conversation-links";

export const Route = createFileRoute("/dashboard/task-threads")({
  component: TaskThreadsPage,
});

function TaskThreadsPage() {
  const [selectedThread, setSelectedThread] = useState<TaskThreadWithDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: unreadCountData, isLoading: isLoadingUnread } = useUnreadThreadCount();
  const unreadCount = unreadCountData?.count ?? 0;

  // Get current user ID from session (this would normally come from auth context)
  // For now, we'll pass undefined and let the component handle it
  const currentUserId = undefined;

  const handleSelectThread = useCallback((thread: TaskThreadWithDetails) => {
    setSelectedThread(thread);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedThread(null);
  }, []);

  const handleCreateThread = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleThreadCreated = useCallback((thread: { id: string }) => {
    // We could navigate to the new thread here if needed
    console.log("Thread created:", thread.id);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Page Header */}
      <header className="border-b border-white/5 bg-background/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                Task Threads
                {!isLoadingUnread && unreadCount > 0 && (
                  <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Discuss tasks with your team
              </p>
            </div>
          </div>
          <Button onClick={handleCreateThread}>
            <Plus className="h-4 w-4 mr-2" />
            New Thread
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread List Panel */}
        <div
          className={cn(
            "w-full lg:w-[350px] xl:w-[400px] border-r border-white/5 flex flex-col bg-background/30 overflow-y-auto",
            selectedThread && "hidden lg:flex"
          )}
        >
          <TaskThreadList
            selectedThreadId={selectedThread?.id}
            onSelectThread={handleSelectThread}
            onCreateThread={handleCreateThread}
            className="p-4"
          />
        </div>

        {/* Thread Detail Panel */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-background/20",
            !selectedThread && "hidden lg:flex"
          )}
        >
          {selectedThread ? (
            <TaskThreadDetail
              threadId={selectedThread.id}
              onBack={handleBack}
              showBackButton={true}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">No Thread Selected</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Select a thread from the list to view the conversation, or create
                a new thread to start discussing a task.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleCreateThread}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Thread
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Thread Dialog */}
      <CreateTaskThreadDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleThreadCreated}
      />
    </div>
  );
}
