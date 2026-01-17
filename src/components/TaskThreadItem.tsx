import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { UserAvatar } from "./UserAvatar";
import {
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  CircleDot,
} from "lucide-react";
import type { TaskThreadWithDetails } from "~/data-access/task-conversation-links";

interface TaskThreadItemProps {
  thread: TaskThreadWithDetails;
  isActive: boolean;
  onClick: () => void;
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case "open":
      return <CircleDot className="h-3 w-3 text-blue-500" />;
    case "closed":
      return <XCircle className="h-3 w-3 text-muted-foreground" />;
    case "resolved":
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    default:
      return <CircleDot className="h-3 w-3 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string) {
  const statusConfig: Record<
    string,
    { variant: "default" | "secondary" | "outline"; className: string }
  > = {
    open: { variant: "default", className: "bg-blue-500" },
    closed: { variant: "secondary", className: "" },
    resolved: { variant: "default", className: "bg-green-500" },
  };

  const config = statusConfig[status] || statusConfig.open;

  return (
    <Badge variant={config.variant} className={cn("text-xs", config.className)}>
      {status}
    </Badge>
  );
}

export function TaskThreadItem({
  thread,
  isActive,
  onClick,
}: TaskThreadItemProps) {
  const { createdBy, participants, lastMessage } = thread;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 flex flex-col gap-2 text-left transition-colors rounded-lg",
        isActive
          ? "bg-primary/10 border-l-2 border-primary"
          : "hover:bg-muted/50"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {getStatusIcon(thread.status)}
          <span className="font-medium truncate text-sm">{thread.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {getStatusBadge(thread.status)}
        </div>
      </div>

      {/* Task info */}
      {thread.taskTitle && (
        <div className="text-xs text-muted-foreground truncate">
          Task: {thread.taskTitle}
        </div>
      )}

      {/* Last message preview */}
      {lastMessage && (
        <p className="text-sm text-muted-foreground truncate">
          <span className="font-medium">{lastMessage.sender.name}:</span>{" "}
          {lastMessage.content}
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {/* Participants */}
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{thread.participantCount}</span>
          </div>

          {/* Messages */}
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span>{thread.messageCount}</span>
          </div>
        </div>

        {/* Last activity */}
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatTimeAgo(thread.lastActivityAt)}</span>
        </div>
      </div>

      {/* Participant avatars */}
      {participants.length > 0 && (
        <div className="flex items-center -space-x-2">
          {participants.slice(0, 5).map((participant) => (
            <div
              key={participant.id}
              className="ring-2 ring-background rounded-full"
            >
              <UserAvatar
                imageKey={participant.user.image}
                name={participant.user.name}
                size="sm"
                className="h-6 w-6"
              />
            </div>
          ))}
          {participants.length > 5 && (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs ring-2 ring-background">
              +{participants.length - 5}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
