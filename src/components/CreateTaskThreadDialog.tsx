import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useCreateTaskThread } from "~/hooks/useTaskConversationLinks";
import { Loader2, MessageSquarePlus } from "lucide-react";

interface CreateTaskThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  externalTaskId?: string;
  externalProjectId?: string;
  taskSource?: "odoo" | "manual" | "ai_suggested";
  taskTitle?: string;
  taskDeadline?: string;
  onSuccess?: (thread: { id: string }) => void;
}

export function CreateTaskThreadDialog({
  open,
  onOpenChange,
  externalTaskId = "",
  externalProjectId,
  taskSource = "manual",
  taskTitle,
  taskDeadline,
  onSuccess,
}: CreateTaskThreadDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskIdInput, setTaskIdInput] = useState(externalTaskId);

  const { mutate: createThread, isPending } = useCreateTaskThread();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !taskIdInput.trim()) return;

    createThread(
      {
        externalTaskId: taskIdInput.trim(),
        externalProjectId,
        taskSource,
        title: title.trim(),
        description: description.trim() || undefined,
        taskTitle,
        taskDeadline,
      },
      {
        onSuccess: (thread) => {
          setTitle("");
          setDescription("");
          setTaskIdInput(externalTaskId);
          onOpenChange(false);
          onSuccess?.(thread);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTitle("");
      setDescription("");
      setTaskIdInput(externalTaskId);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Create Task Thread
          </DialogTitle>
          <DialogDescription>
            Start a discussion thread for a task. Invite team members to
            collaborate on the task.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Task ID (if not pre-filled) */}
            {!externalTaskId && (
              <div className="space-y-2">
                <Label htmlFor="taskId">Task ID</Label>
                <Input
                  id="taskId"
                  placeholder="Enter the task ID"
                  value={taskIdInput}
                  onChange={(e) => setTaskIdInput(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The ID of the task you want to discuss
                </p>
              </div>
            )}

            {/* Pre-filled task info */}
            {taskTitle && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Task</p>
                <p className="text-sm font-medium">{taskTitle}</p>
                {externalTaskId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: {externalTaskId}
                  </p>
                )}
              </div>
            )}

            {/* Thread title */}
            <div className="space-y-2">
              <Label htmlFor="title">Thread Title</Label>
              <Input
                id="title"
                placeholder="e.g., Discuss implementation approach"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What should be discussed in this thread?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !title.trim() || !taskIdInput.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Thread"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
