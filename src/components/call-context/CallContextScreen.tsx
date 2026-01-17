/**
 * Call Context Screen Component
 * Mobile UI for displaying customer context during active calls
 * Features swipeable cards showing history, status, and recommended actions
 */

import * as React from "react";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { SwipeableCards, SwipeableCard } from "~/components/ui/swipeable-cards";
import { useActiveCallContext } from "~/hooks/useCallContext";
import type {
  CustomerInfo,
  RecentInteraction,
  OpenTicket,
  SuggestedTalkingPoint,
} from "~/data-access/call-context";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  Clock,
  Mail,
  CreditCard,
  Calendar,
  History,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  ChevronRight,
  PhoneIncoming,
  PhoneOutgoing,
  Receipt,
  Bell,
  Bot,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface CallContextScreenProps {
  phoneOrUserId: string;
  direction?: "inbound" | "outbound";
  onEndCall?: () => void;
  onMuteToggle?: (muted: boolean) => void;
  onSpeakerToggle?: (speaker: boolean) => void;
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get account status color
 */
function getAccountStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "pending":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "suspended":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "inactive":
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}

/**
 * Get priority color
 */
function getPriorityColor(priority?: string): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500/10 text-red-600";
    case "high":
      return "bg-orange-500/10 text-orange-600";
    case "medium":
      return "bg-yellow-500/10 text-yellow-600";
    case "low":
      return "bg-blue-500/10 text-blue-600";
    default:
      return "bg-gray-500/10 text-gray-600";
  }
}

/**
 * Get interaction type icon
 */
function getInteractionIcon(type: string) {
  switch (type) {
    case "call":
      return Phone;
    case "notification":
      return Bell;
    case "ai_conversation":
      return Bot;
    case "expense_request":
      return Receipt;
    default:
      return MessageSquare;
  }
}

/**
 * Get category color
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case "account":
      return "bg-blue-500/10 text-blue-600";
    case "billing":
      return "bg-purple-500/10 text-purple-600";
    case "support":
      return "bg-orange-500/10 text-orange-600";
    case "follow_up":
      return "bg-green-500/10 text-green-600";
    case "general":
      return "bg-gray-500/10 text-gray-600";
    default:
      return "bg-gray-500/10 text-gray-600";
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Customer Info Card
 */
function CustomerInfoCard({
  customer,
  isLoading,
}: {
  customer: CustomerInfo | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Customer Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!customer) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Customer Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Unknown Caller
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No customer record found
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full" data-testid="customer-info-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-4 h-4" />
          Customer Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Avatar and Name */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            {customer.image ? (
              <AvatarImage src={customer.image} alt={customer.name} />
            ) : (
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(customer.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{customer.name}</h3>
            <Badge
              className={cn(
                "mt-1 text-xs",
                getAccountStatusColor(customer.accountStatus)
              )}
            >
              {customer.accountStatus.charAt(0).toUpperCase() +
                customer.accountStatus.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Customer Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span className="truncate">{customer.email}</span>
          </div>
          {customer.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{customer.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span className="capitalize">{customer.plan} Plan</span>
            {customer.subscriptionStatus && (
              <Badge variant="outline" className="text-xs ml-1">
                {customer.subscriptionStatus}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Customer since {customer.createdAt.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Subscription Expiry Warning */}
        {customer.subscriptionExpiresAt && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>
                Subscription expires on{" "}
                {customer.subscriptionExpiresAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Recent Interactions Card
 */
function RecentInteractionsCard({
  interactions,
  isLoading,
}: {
  interactions: RecentInteraction[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full" data-testid="recent-interactions-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" />
          Recent History
          {interactions.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {interactions.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {interactions.length === 0 ? (
          <div className="text-center py-6">
            <History className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent interactions</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {interactions.map((interaction) => {
              const Icon = getInteractionIcon(interaction.type);
              return (
                <div
                  key={interaction.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-full bg-muted">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {interaction.title}
                    </p>
                    {interaction.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {interaction.summary}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(interaction.timestamp)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Open Tickets Card
 */
function OpenTicketsCard({
  tickets,
  isLoading,
}: {
  tickets: OpenTicket[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Open Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-muted">
                <div className="h-4 bg-background rounded w-3/4 mb-2" />
                <div className="h-3 bg-background rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const highPriorityCount = tickets.filter(
    (t) => t.priority === "high" || t.priority === "urgent"
  ).length;

  return (
    <Card className="h-full" data-testid="open-tickets-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Open Issues
          {tickets.length > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                "ml-auto text-xs",
                highPriorityCount > 0 && "bg-red-500/10 text-red-600"
              )}
            >
              {tickets.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No open issues</p>
            <p className="text-xs text-muted-foreground mt-1">
              All tickets resolved
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-2">
                    {ticket.title}
                  </p>
                  {ticket.priority && (
                    <Badge
                      className={cn(
                        "text-xs shrink-0",
                        getPriorityColor(ticket.priority)
                      )}
                    >
                      {ticket.priority}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {ticket.status}
                  </Badge>
                  <span>•</span>
                  <span>{formatDate(ticket.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Suggested Actions Card
 */
function SuggestedActionsCard({
  talkingPoints,
  isLoading,
}: {
  talkingPoints: SuggestedTalkingPoint[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Suggested Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-muted">
                <div className="h-4 bg-background rounded w-full mb-2" />
                <div className="h-3 bg-background rounded w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full" data-testid="suggested-actions-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          Suggested Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {talkingPoints.length === 0 ? (
          <div className="text-center py-6">
            <Lightbulb className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No suggestions</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {talkingPoints.map((point, index) => (
              <div
                key={point.id}
                className="p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{point.point}</p>
                    {point.context && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {point.context}
                      </p>
                    )}
                    <Badge
                      className={cn(
                        "text-xs mt-2",
                        getCategoryColor(point.category)
                      )}
                    >
                      {point.category}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Call Controls Component
 */
function CallControls({
  formattedDuration,
  direction,
  onEndCall,
  onMuteToggle,
  onSpeakerToggle,
}: {
  formattedDuration: string;
  direction?: "inbound" | "outbound";
  onEndCall?: () => void;
  onMuteToggle?: (muted: boolean) => void;
  onSpeakerToggle?: (speaker: boolean) => void;
}) {
  const [isMuted, setIsMuted] = React.useState(false);
  const [isSpeaker, setIsSpeaker] = React.useState(false);

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onMuteToggle?.(newMuted);
  };

  const handleSpeakerToggle = () => {
    const newSpeaker = !isSpeaker;
    setIsSpeaker(newSpeaker);
    onSpeakerToggle?.(newSpeaker);
  };

  const DirectionIcon = direction === "inbound" ? PhoneIncoming : PhoneOutgoing;

  return (
    <div className="bg-primary text-primary-foreground rounded-xl p-4" data-testid="call-controls">
      {/* Call Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DirectionIcon className="w-5 h-5" />
          <span className="text-sm font-medium capitalize">
            {direction || "Call"} Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-lg font-semibold" data-testid="call-duration">
            {formattedDuration}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-12 h-12 rounded-full",
            isMuted
              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
              : "bg-primary-foreground/10 hover:bg-primary-foreground/20"
          )}
          onClick={handleMuteToggle}
          data-testid="mute-button"
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
          onClick={onEndCall}
          data-testid="end-call-button"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-12 h-12 rounded-full",
            isSpeaker
              ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
              : "bg-primary-foreground/10 hover:bg-primary-foreground/20"
          )}
          onClick={handleSpeakerToggle}
          data-testid="speaker-button"
        >
          {isSpeaker ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CallContextScreen({
  phoneOrUserId,
  direction = "inbound",
  onEndCall,
  onMuteToggle,
  onSpeakerToggle,
  className,
}: CallContextScreenProps) {
  const {
    customer,
    recentInteractions,
    openTickets,
    suggestedTalkingPoints,
    isLoading,
    isRefetching,
    formattedDuration,
    refresh,
    error,
  } = useActiveCallContext(phoneOrUserId, {
    enableAutoRefresh: true,
    refreshInterval: 30000,
  });

  const [activeCard, setActiveCard] = React.useState(0);

  const cardLabels = ["Customer", "History", "Issues", "Actions"];

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background",
        className
      )}
      data-testid="call-context-screen"
    >
      {/* Call Controls Header */}
      <div className="p-4 pb-0">
        <CallControls
          formattedDuration={formattedDuration}
          direction={direction}
          onEndCall={onEndCall}
          onMuteToggle={onMuteToggle}
          onSpeakerToggle={onSpeakerToggle}
        />
      </div>

      {/* Refresh indicator */}
      {isRefetching && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Updating...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() => refresh()}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Card Section Labels */}
      <div className="flex justify-center gap-1 px-4 pt-4 pb-2">
        {cardLabels.map((label, index) => (
          <button
            key={label}
            onClick={() => setActiveCard(index)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
              activeCard === index
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Swipeable Cards */}
      <div className="flex-1 py-2 overflow-hidden">
        <SwipeableCards
          showNavigation={false}
          initialIndex={activeCard}
          onCardChange={setActiveCard}
        >
          <SwipeableCard>
            <CustomerInfoCard customer={customer} isLoading={isLoading} />
          </SwipeableCard>
          <SwipeableCard>
            <RecentInteractionsCard
              interactions={recentInteractions}
              isLoading={isLoading}
            />
          </SwipeableCard>
          <SwipeableCard>
            <OpenTicketsCard tickets={openTickets} isLoading={isLoading} />
          </SwipeableCard>
          <SwipeableCard>
            <SuggestedActionsCard
              talkingPoints={suggestedTalkingPoints}
              isLoading={isLoading}
            />
          </SwipeableCard>
        </SwipeableCards>
      </div>

      {/* Quick Info Footer */}
      {customer && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                {customer.image ? (
                  <AvatarImage src={customer.image} alt={customer.name} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="font-medium truncate max-w-[150px]">
                {customer.name}
              </span>
            </div>
            <Badge className={cn("text-xs", getAccountStatusColor(customer.accountStatus))}>
              {customer.plan}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

export default CallContextScreen;
