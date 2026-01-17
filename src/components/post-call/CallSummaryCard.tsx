import * as React from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { CallRecord } from "~/db/schema";

interface CallSummaryCardProps {
  callRecord: CallRecord;
  className?: string;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CallSummaryCard({ callRecord, className }: CallSummaryCardProps) {
  const isInbound = callRecord.direction === "inbound";
  const DirectionIcon = isInbound ? PhoneIncoming : PhoneOutgoing;

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Direction Banner */}
      <div
        className={cn(
          "px-4 py-2",
          isInbound
            ? "bg-green-50 dark:bg-green-950/50"
            : "bg-blue-50 dark:bg-blue-950/50"
        )}
      >
        <div className="flex items-center gap-2">
          <DirectionIcon
            className={cn(
              "h-4 w-4",
              isInbound
                ? "text-green-600 dark:text-green-400"
                : "text-blue-600 dark:text-blue-400"
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              isInbound
                ? "text-green-700 dark:text-green-400"
                : "text-blue-700 dark:text-blue-400"
            )}
          >
            {isInbound ? "Inbound Call" : "Outbound Call"}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "ml-auto text-xs",
              callRecord.status === "completed"
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                : callRecord.status === "missed"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            {callRecord.status}
          </Badge>
        </div>
      </div>

      <CardContent className="pt-4">
        <div className="grid gap-4">
          {/* Caller/Recipient Info */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="font-medium">
                {isInbound
                  ? callRecord.callerName || callRecord.callerId
                  : callRecord.recipientName || callRecord.recipientId || "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isInbound ? callRecord.callerId : callRecord.recipientId}
              </p>
            </div>
          </div>

          {/* Call Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium">{formatDuration(callRecord.duration)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="font-medium text-sm">
                  {formatTimestamp(callRecord.callTimestamp)}
                </p>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          {callRecord.summary && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                AI Summary
              </p>
              <p className="text-sm">{callRecord.summary}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
