import { useState, useRef, useEffect } from "react";
import { Send, Loader2, ClipboardCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tooltip } from "./ui/tooltip";
import { useSendMessage } from "~/hooks/useMessages";
import { CreateApprovalRequestDialog } from "./chat-approvals/CreateApprovalRequestDialog";

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useSendMessage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent || sendMessage.isPending) return;

    sendMessage.mutate(
      { conversationId, content: trimmedContent },
      {
        onSuccess: () => {
          setContent("");
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = (scrollHeight < 120 ? scrollHeight : 120) + "px";
    }
  }, [content]);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border p-4 bg-background"
      data-testid="message-input-form"
    >
      <div className="flex items-end gap-2">
        {/* Approval Request Button */}
        <Tooltip content="Request Approval">
          <CreateApprovalRequestDialog
            conversationId={conversationId}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-11 w-11"
                data-testid="approval-request-trigger"
              >
                <ClipboardCheck className="h-4 w-4" />
              </Button>
            }
          />
        </Tooltip>

        {/* Message Textarea */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
          disabled={sendMessage.isPending}
          data-testid="message-textarea"
        />

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={!content.trim() || sendMessage.isPending}
          className="shrink-0 h-11 w-11"
          data-testid="send-message-button"
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
  );
}
