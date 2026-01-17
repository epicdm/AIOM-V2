import { UserAvatar } from "./UserAvatar";
import { cn } from "~/lib/utils";
import { ApprovalRequestMessage } from "./chat-approvals/ApprovalRequestMessage";
import type { MessageWithSender } from "~/data-access/messages";
import type { ChatApprovalRequestWithDetails } from "~/data-access/chat-approvals";

interface MessageItemProps {
  message: MessageWithSender;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  approvalRequest?: ChatApprovalRequestWithDetails | null;
}

function formatMessageTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Check if a message content indicates it's an approval request message
function isApprovalRequestMessage(content: string): boolean {
  return content.startsWith("📋 Approval Request:");
}

export function MessageItem({
  message,
  isOwnMessage,
  showAvatar = true,
  approvalRequest,
}: MessageItemProps) {
  const hasApprovalRequest = approvalRequest !== null && approvalRequest !== undefined;
  const isApprovalMessage = isApprovalRequestMessage(message.content);

  // If this message has an approval request attached, render the approval card
  if (hasApprovalRequest && isApprovalMessage) {
    return (
      <div
        className={cn(
          "flex items-end gap-2",
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        )}
        data-testid="message-item"
      >
        {showAvatar && !isOwnMessage && (
          <UserAvatar
            imageKey={message.sender.image}
            name={message.sender.name}
            size="sm"
            className="shrink-0"
          />
        )}
        {!showAvatar && !isOwnMessage && <div className="w-8 shrink-0" />}

        <div className="max-w-[85%]">
          <ApprovalRequestMessage
            approvalRequest={approvalRequest}
            isOwnRequest={isOwnMessage}
          />
          <p
            className={cn(
              "text-xs mt-1",
              isOwnMessage ? "text-right" : "text-left",
              "text-muted-foreground"
            )}
          >
            {formatMessageTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  // Regular message rendering
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
      data-testid="message-item"
    >
      {showAvatar && !isOwnMessage && (
        <UserAvatar
          imageKey={message.sender.image}
          name={message.sender.name}
          size="sm"
          className="shrink-0"
        />
      )}
      {!showAvatar && !isOwnMessage && <div className="w-8 shrink-0" />}

      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p
          className={cn(
            "text-xs mt-1",
            isOwnMessage
              ? "text-primary-foreground/70"
              : "text-muted-foreground"
          )}
        >
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
