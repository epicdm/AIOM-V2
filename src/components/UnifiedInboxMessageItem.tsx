import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { FileText, Download } from "lucide-react";
import type { UnifiedInboxMessage, UnifiedInboxAttachment } from "~/db/schema";

interface UnifiedInboxMessageItemProps {
  message: UnifiedInboxMessage;
  showAvatar?: boolean;
}

function formatMessageTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentItem({ attachment }: { attachment: UnifiedInboxAttachment }) {
  const isImage = attachment.mimeType?.startsWith("image/");

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border border-white/10",
        "bg-white/5 hover:bg-white/10 transition-colors"
      )}
    >
      {isImage ? (
        <img
          src={attachment.url}
          alt={attachment.name}
          className="h-10 w-10 rounded object-cover"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-primary/20 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <Download className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

export function UnifiedInboxMessageItem({
  message,
  showAvatar = true,
}: UnifiedInboxMessageItemProps) {
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        message.isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
    >
      {showAvatar && !message.isOwnMessage && (
        <Avatar className="h-8 w-8 shrink-0">
          {message.authorAvatarUrl && (
            <AvatarImage src={message.authorAvatarUrl} alt={message.authorName} />
          )}
          <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground text-xs font-semibold">
            {getInitials(message.authorName)}
          </AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && !message.isOwnMessage && <div className="w-8 shrink-0" />}

      <div className={cn("max-w-[70%]", message.isOwnMessage && "items-end")}>
        {/* Author name for non-own messages */}
        {!message.isOwnMessage && showAvatar && (
          <p className="text-xs text-muted-foreground mb-1 px-1">
            {message.authorName}
          </p>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            message.isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          {/* HTML content support for Odoo messages */}
          {message.contentHtml ? (
            <div
              className="text-sm whitespace-pre-wrap break-words prose prose-sm prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: message.contentHtml }}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          <p
            className={cn(
              "text-xs mt-1",
              message.isOwnMessage
                ? "text-primary-foreground/70"
                : "text-muted-foreground"
            )}
          >
            {formatMessageTime(message.createdAt)}
          </p>
        </div>

        {/* Attachments */}
        {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <AttachmentItem key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
