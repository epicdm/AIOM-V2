/**
 * Odoo Message List Component
 *
 * Displays messages from an Odoo Discuss channel with
 * support for loading more and refreshing.
 */

import { useEffect, useRef } from "react";
import { RefreshCw, Loader2, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { OdooMessage } from "~/db/schema";

interface OdooMessageListProps {
  messages: OdooMessage[];
  isLoading?: boolean;
  hasMore?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  isRefreshing?: boolean;
}

export function OdooMessageList({
  messages,
  isLoading,
  hasMore,
  onRefresh,
  onLoadMore,
  isRefreshing,
}: OdooMessageListProps) {
  const listEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <p>No messages yet</p>
        <p className="text-sm">Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Refresh button */}
      <div className="flex justify-center border-b p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Syncing..." : "Sync messages"}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center pb-4">
            <Button variant="outline" size="sm" onClick={onLoadMore}>
              Load earlier messages
            </Button>
          </div>
        )}

        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        <div ref={listEndRef} />
      </div>
    </div>
  );
}

interface MessageItemProps {
  message: OdooMessage;
}

function MessageItem({ message }: MessageItemProps) {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Remove HTML tags from body for display
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const formattedDate = message.odooCreatedAt
    ? formatDistanceToNow(new Date(message.odooCreatedAt), { addSuffix: true })
    : message.createdAt
    ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
    : "";

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">
          {message.authorName ? (
            getInitials(message.authorName)
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">
            {message.authorName || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          {message.isStarred && (
            <span className="text-yellow-500 text-xs">★</span>
          )}
        </div>
        <div
          className="mt-1 text-sm prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: message.body }}
        />
        {message.hasAttachments && message.attachmentCount > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            📎 {message.attachmentCount} attachment
            {message.attachmentCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

export default OdooMessageList;
