import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  Send,
  MessageSquare,
  Hash,
  Bell as BellIcon,
  Pin,
  BellOff,
  ExternalLink,
} from "lucide-react";
import { UnifiedInboxMessageItem } from "./UnifiedInboxMessageItem";
import { useUnifiedInboxThread } from "~/hooks/useUnifiedInbox";
import { useSendMessage } from "~/hooks/useMessages";
import type { UnifiedInboxThread, UnifiedInboxSourceType, UnifiedInboxMessage } from "~/db/schema";

interface UnifiedInboxThreadDetailProps {
  thread: UnifiedInboxThread | null;
  onBack?: () => void;
  showBackButton?: boolean;
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UnifiedInboxThreadDetail({
  thread,
  onBack,
  showBackButton = false,
}: UnifiedInboxThreadDetailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [replyContent, setReplyContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { thread: threadWithMessages, isLoading, markAsRead } = useUnifiedInboxThread(
    thread?.id ?? null
  );

  // For direct messages, use the send message hook
  const sendMessage = useSendMessage();

  // Mark as read when viewing
  useEffect(() => {
    if (threadWithMessages && threadWithMessages.unreadCount > 0) {
      markAsRead();
    }
  }, [threadWithMessages?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [threadWithMessages?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [replyContent]);

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = replyContent.trim();
    if (!trimmedContent || !thread) return;

    // Only direct messages support replies for now
    if (thread.sourceType === "direct_message") {
      sendMessage.mutate(
        { conversationId: thread.sourceId, content: trimmedContent },
        {
          onSuccess: () => {
            setReplyContent("");
            if (textareaRef.current) {
              textareaRef.current.style.height = "auto";
            }
          },
        }
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply(e);
    }
  };

  // Empty state - no thread selected
  if (!thread) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="p-4 rounded-full bg-muted mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Select a conversation
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Choose a thread from the list to view messages and start replying.
        </p>
      </div>
    );
  }

  const SourceIcon = sourceTypeIcons[thread.sourceType as UnifiedInboxSourceType];
  const sourceLabel = sourceTypeLabels[thread.sourceType as UnifiedInboxSourceType];
  const sourceColor = sourceTypeColors[thread.sourceType as UnifiedInboxSourceType];

  // Check if replies are supported
  const canReply = thread.sourceType === "direct_message";

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-white/5 p-4 flex items-center gap-3 bg-background/50 backdrop-blur-sm">
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0 lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <Avatar className="h-10 w-10">
          {thread.avatarUrl ? (
            <AvatarImage src={thread.avatarUrl} alt={thread.title} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-semibold">
            {getInitials(thread.title)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground truncate">
              {thread.title}
            </h2>
            {thread.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
            {thread.isMuted && (
              <BellOff className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0", sourceColor)}
            >
              <SourceIcon className="h-3 w-3 mr-1" />
              {sourceLabel}
            </Badge>
            {thread.subtitle && (
              <span className="text-xs text-muted-foreground truncate">
                {thread.subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Open in source button for Odoo Discuss */}
        {thread.sourceType === "odoo_discuss" && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://odoo.example.com/discuss/channel/${thread.sourceId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Odoo
            </a>
          </Button>
        )}
      </div>

      {/* Messages */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !threadWithMessages?.messages || threadWithMessages.messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No messages yet</p>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupMessagesByDate(threadWithMessages.messages).map((group) => (
            <div key={group.date} className="space-y-3">
              <div className="flex items-center justify-center">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {group.date}
                </span>
              </div>
              {group.messages.map((message, index) => {
                const prevMessage = group.messages[index - 1];
                const showAvatar =
                  !prevMessage || prevMessage.authorId !== message.authorId;

                return (
                  <UnifiedInboxMessageItem
                    key={message.id}
                    message={message}
                    showAvatar={showAvatar}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Reply input - only for direct messages */}
      {canReply && (
        <form
          onSubmit={handleSubmitReply}
          className="border-t border-white/5 p-4 bg-background/50"
        >
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              disabled={sendMessage.isPending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!replyContent.trim() || sendMessage.isPending}
              className="shrink-0 h-11 w-11"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      )}

      {/* Info for non-replyable threads */}
      {!canReply && (
        <div className="border-t border-white/5 p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {thread.sourceType === "odoo_discuss"
              ? "Replies are sent through Odoo Discuss"
              : "This is a notification thread and cannot be replied to"}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to group messages by date
function groupMessagesByDate(
  messages: UnifiedInboxMessage[]
): { date: string; messages: UnifiedInboxMessage[] }[] {
  const groups: { date: string; messages: UnifiedInboxMessage[] }[] = [];
  let currentDate = "";

  for (const message of messages) {
    const messageDate = new Date(message.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    if (messageDate !== currentDate) {
      currentDate = messageDate;
      groups.push({ date: messageDate, messages: [] });
    }

    groups[groups.length - 1].messages.push(message);
  }

  return groups;
}
