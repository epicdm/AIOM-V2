import { useEffect, useRef, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { MessageItem } from "./MessageItem";
import { useMessages, useMarkMessagesAsRead } from "~/hooks/useMessages";
import { useApprovalRequestsByMessageIds } from "~/hooks/useChatApprovals";
import { authClient } from "~/lib/auth-client";

interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps) {
  const { data: session } = authClient.useSession();
  const { data, isLoading, error } = useMessages(conversationId);
  const markAsRead = useMarkMessagesAsRead();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMarkedAsRead = useRef(false);

  // Extract message IDs for approval request lookup
  const messageIds = useMemo(() => {
    if (!data?.messages) return [];
    // Only look up messages that might be approval requests
    return data.messages
      .filter((m) => m.content.startsWith("📋 Approval Request:"))
      .map((m) => m.id);
  }, [data?.messages]);

  // Fetch approval requests for messages that might have them
  const { data: approvalRequestsMap } = useApprovalRequestsByMessageIds(
    messageIds,
    messageIds.length > 0
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [data?.messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (
      conversationId &&
      data?.messages &&
      data.messages.length > 0 &&
      !hasMarkedAsRead.current
    ) {
      hasMarkedAsRead.current = true;
      markAsRead.mutate(conversationId);
    }
  }, [conversationId, data?.messages]);

  // Reset the read marker when conversation changes
  useEffect(() => {
    hasMarkedAsRead.current = false;
  }, [conversationId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Failed to load messages
        </p>
      </div>
    );
  }

  if (!data?.messages || data.messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No messages yet. Say hello!
        </p>
      </div>
    );
  }

  const currentUserId = session?.user?.id;

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof data.messages }[] = [];
  let currentDate = "";

  for (const message of data.messages) {
    const messageDate = new Date(message.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    if (messageDate !== currentDate) {
      currentDate = messageDate;
      groupedMessages.push({ date: messageDate, messages: [] });
    }

    groupedMessages[groupedMessages.length - 1].messages.push(message);
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      data-testid="message-list"
    >
      {groupedMessages.map((group) => (
        <div key={group.date} className="space-y-3">
          <div className="flex items-center justify-center">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {group.date}
            </span>
          </div>
          {group.messages.map((message, index) => {
            const prevMessage = group.messages[index - 1];
            const showAvatar =
              !prevMessage || prevMessage.senderId !== message.senderId;

            // Get approval request for this message if it exists
            const approvalRequest = approvalRequestsMap?.[message.id] ?? null;

            return (
              <MessageItem
                key={message.id}
                message={message}
                isOwnMessage={message.senderId === currentUserId}
                showAvatar={showAvatar}
                approvalRequest={approvalRequest}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
