import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Pin,
  Bell,
  BellOff,
  Archive,
  MoreVertical,
  MessageSquare,
  Hash,
  Bell as BellIcon,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { PriorityIndicator } from "~/components/priority-badge";
import type { UnifiedInboxThread, UnifiedInboxSourceType, PriorityLevel } from "~/db/schema";

interface UnifiedInboxThreadItemProps {
  thread: UnifiedInboxThread;
  isSelected?: boolean;
  onSelect: (thread: UnifiedInboxThread) => void;
  onMarkAsRead?: (threadId: string) => void;
  onTogglePinned?: (threadId: string, isPinned: boolean) => void;
  onToggleMuted?: (threadId: string, isMuted: boolean) => void;
  onArchive?: (threadId: string) => void;
  onScorePriority?: (threadId: string) => void;
  showPriority?: boolean;
}

const sourceTypeIcons: Record<UnifiedInboxSourceType, typeof MessageSquare> = {
  direct_message: MessageSquare,
  odoo_discuss: Hash,
  system_notification: BellIcon,
  push_notification: BellIcon,
};

const sourceTypeLabels: Record<UnifiedInboxSourceType, string> = {
  direct_message: "Direct Message",
  odoo_discuss: "Odoo Discuss",
  system_notification: "Notification",
  push_notification: "Push Notification",
};

const sourceTypeColors: Record<UnifiedInboxSourceType, string> = {
  direct_message: "bg-blue-500/20 text-blue-400",
  odoo_discuss: "bg-purple-500/20 text-purple-400",
  system_notification: "bg-amber-500/20 text-amber-400",
  push_notification: "bg-green-500/20 text-green-400",
};

function formatRelativeTime(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const messageDate = new Date(date);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UnifiedInboxThreadItem({
  thread,
  isSelected,
  onSelect,
  onMarkAsRead,
  onTogglePinned,
  onToggleMuted,
  onArchive,
  onScorePriority,
  showPriority = true,
}: UnifiedInboxThreadItemProps) {
  const SourceIcon = sourceTypeIcons[thread.sourceType as UnifiedInboxSourceType];
  const sourceLabel = sourceTypeLabels[thread.sourceType as UnifiedInboxSourceType];
  const sourceColor = sourceTypeColors[thread.sourceType as UnifiedInboxSourceType];

  // Get priority info from thread
  const priorityLevel = thread.priorityLevel as PriorityLevel | null;
  const isHighPriority = thread.isHighPriority;

  const handleClick = () => {
    onSelect(thread);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 cursor-pointer transition-all duration-200 border-b border-white/5",
        "hover:bg-white/5",
        isSelected && "bg-primary/10 border-l-2 border-l-primary",
        thread.unreadCount > 0 && "bg-white/[0.02]"
      )}
      onClick={handleClick}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          {thread.avatarUrl ? (
            <AvatarImage src={thread.avatarUrl} alt={thread.title} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-semibold">
            {getInitials(thread.title)}
          </AvatarFallback>
        </Avatar>
        {/* Source type indicator */}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 rounded-full p-1",
            sourceColor
          )}
        >
          <SourceIcon className="h-3 w-3" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h4
              className={cn(
                "font-medium truncate",
                thread.unreadCount > 0
                  ? "text-foreground"
                  : "text-muted-foreground",
                isHighPriority && "text-red-600 dark:text-red-400"
              )}
            >
              {thread.title}
            </h4>
            {showPriority && priorityLevel && priorityLevel !== "normal" && priorityLevel !== "low" && (
              <PriorityIndicator level={priorityLevel} />
            )}
            {thread.isPinned && (
              <Pin className="h-3 w-3 text-primary shrink-0" />
            )}
            {thread.isMuted && (
              <BellOff className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatRelativeTime(thread.lastMessageAt)}
          </span>
        </div>

        {/* Subtitle/Source type */}
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0", sourceColor)}
          >
            {sourceLabel}
          </Badge>
          {thread.subtitle && (
            <span className="text-xs text-muted-foreground truncate">
              {thread.subtitle}
            </span>
          )}
        </div>

        {/* Preview */}
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate",
              thread.unreadCount > 0
                ? "text-muted-foreground"
                : "text-muted-foreground/70"
            )}
          >
            {thread.lastMessagePreview || "No messages yet"}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {/* Unread count badge */}
            {thread.unreadCount > 0 && (
              <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs">
                {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
              </Badge>
            )}

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {thread.unreadCount > 0 && onMarkAsRead && (
                  <DropdownMenuItem onClick={() => onMarkAsRead(thread.id)}>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                {onTogglePinned && (
                  <DropdownMenuItem
                    onClick={() => onTogglePinned(thread.id, !thread.isPinned)}
                  >
                    <Pin className="h-4 w-4 mr-2" />
                    {thread.isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                )}
                {onToggleMuted && (
                  <DropdownMenuItem
                    onClick={() => onToggleMuted(thread.id, !thread.isMuted)}
                  >
                    {thread.isMuted ? (
                      <>
                        <Bell className="h-4 w-4 mr-2" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <BellOff className="h-4 w-4 mr-2" />
                        Mute
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {onScorePriority && (
                  <DropdownMenuItem
                    onClick={() => onScorePriority(thread.id)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Priority
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onArchive(thread.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
