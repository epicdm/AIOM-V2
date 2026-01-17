import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { UserAvatar } from "./UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  useTaskThread,
  useTaskThreadMessages,
  useSendTaskThreadMessage,
  useMarkThreadMessagesAsRead,
  useCloseTaskThread,
  useResolveTaskThread,
  useReopenTaskThread,
  useLeaveThread,
  useToggleThreadMute,
} from "~/hooks/useTaskConversationLinks";
import {
  ArrowLeft,
  Send,
  MoreVertical,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  BellOff,
  LogOut,
  Users,
  Loader2,
  MessageSquare,
  Calendar,
  ExternalLink,
} from "lucide-react";
import type { TaskThreadMessageWithSender } from "~/data-access/task-conversation-links";

interface TaskThreadDetailProps {
  threadId: string;
  onBack?: () => void;
  showBackButton?: boolean;
  currentUserId?: string;
}

function formatMessageTime(date: Date): string {
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.toDateString() === today.toDateString()) {
    return messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (messageDate.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function MessageItem({
  message,
  isOwn,
}: {
  message: TaskThreadMessageWithSender;
  isOwn: boolean;
}) {
  if (message.isSystemMessage) {
    return (
      <div className="flex justify-center py-2">
        <p className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[85%]",
        isOwn ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {!isOwn && (
        <UserAvatar
          imageKey={message.sender.image}
          name={message.sender.name}
          size="sm"
        />
      )}

      <div className={cn("space-y-1", isOwn && "text-right")}>
        {!isOwn && (
          <p className="text-xs text-muted-foreground">{message.sender.name}</p>
        )}
        <div
          className={cn(
            "px-3 py-2 rounded-lg text-sm",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted rounded-bl-sm"
          )}
        >
          {message.content}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function TaskThreadDetail({
  threadId,
  onBack,
  showBackButton = true,
  currentUserId,
}: TaskThreadDetailProps) {
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: thread, isLoading: isLoadingThread } = useTaskThread(threadId);
  const { data: messages, isLoading: isLoadingMessages } =
    useTaskThreadMessages(threadId);

  const { mutate: sendMessage, isPending: isSending } =
    useSendTaskThreadMessage();
  const { mutate: markAsRead } = useMarkThreadMessagesAsRead();
  const { mutate: closeThread, isPending: isClosing } = useCloseTaskThread();
  const { mutate: resolveThread, isPending: isResolving } =
    useResolveTaskThread();
  const { mutate: reopenThread, isPending: isReopening } =
    useReopenTaskThread();
  const { mutate: leaveThread } = useLeaveThread();
  const { mutate: toggleMute } = useToggleThreadMute();

  // Mark messages as read when viewing
  useEffect(() => {
    if (threadId) {
      markAsRead(threadId);
    }
  }, [threadId, markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!messageInput.trim() || !threadId) return;

    sendMessage(
      {
        threadId,
        content: messageInput.trim(),
      },
      {
        onSuccess: () => setMessageInput(""),
      }
    );
  }, [messageInput, threadId, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Find current user's participant record
  const currentParticipant = thread?.participants.find(
    (p) => p.userId === currentUserId
  );

  if (isLoadingThread) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-medium">Select a thread</p>
        <p className="text-xs text-muted-foreground mt-1">
          Choose a thread from the list to view messages
        </p>
      </div>
    );
  }

  const isOpen = thread.status === "open";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-white/5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {showBackButton && onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 lg:hidden"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold truncate">{thread.title}</h2>
                {getStatusBadge(thread.status)}
              </div>
              {thread.taskTitle && (
                <p className="text-xs text-muted-foreground truncate">
                  Task: {thread.taskTitle}
                </p>
              )}
              {thread.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {thread.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOpen ? (
                <>
                  <DropdownMenuItem
                    onClick={() => resolveThread({ threadId })}
                    disabled={isResolving}
                  >
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    {isResolving ? "Resolving..." : "Resolve Thread"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => closeThread({ threadId })}
                    disabled={isClosing}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isClosing ? "Closing..." : "Close Thread"}
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={() => reopenThread(threadId)}
                  disabled={isReopening}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isReopening ? "Reopening..." : "Reopen Thread"}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() =>
                  toggleMute({
                    threadId,
                    isMuted: !currentParticipant?.isMuted,
                  })
                }
              >
                {currentParticipant?.isMuted ? (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Unmute Thread
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Mute Thread
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => leaveThread(threadId)}
                className="text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thread info */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{thread.participantCount} participants</span>
          </div>
          {thread.taskDeadline && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {formatDate(thread.taskDeadline)}</span>
            </div>
          )}
          {thread.externalTaskId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Task
            </Button>
          )}
        </div>

        {/* Participant avatars */}
        <div className="flex items-center gap-1 mt-3">
          {thread.participants.slice(0, 8).map((participant) => (
            <div
              key={participant.id}
              className="ring-2 ring-background rounded-full"
              title={participant.user.name}
            >
              <UserAvatar
                imageKey={participant.user.image}
                name={participant.user.name}
                size="sm"
                className="h-6 w-6"
              />
            </div>
          ))}
          {thread.participants.length > 8 && (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs ring-2 ring-background">
              +{thread.participants.length - 8}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages && messages.length > 0 ? (
          <>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">
              Start the conversation!
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      {isOpen && (
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!messageInput.trim() || isSending}
              size="icon"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Closed thread notice */}
      {!isOpen && (
        <div className="border-t border-white/5 p-4 bg-muted/30">
          <p className="text-sm text-center text-muted-foreground">
            This thread has been {thread.status}.
            {thread.closedReason && (
              <span className="block mt-1 text-xs">
                Reason: {thread.closedReason}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
