/**
 * Odoo Channel List Component
 *
 * Displays a list of Odoo Discuss channels with unread indicators
 * and sync functionality.
 */

import { RefreshCw, Hash, MessageSquare, Users, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useOdooChannels, useSyncOdooChannels } from "~/hooks/useOdooDiscuss";
import type { OdooChannel } from "~/db/schema";

interface OdooChannelListProps {
  onSelectChannel?: (channel: OdooChannel) => void;
  selectedChannelId?: string;
}

export function OdooChannelList({
  onSelectChannel,
  selectedChannelId,
}: OdooChannelListProps) {
  const { data, isLoading, isError, error } = useOdooChannels();
  const syncChannels = useSyncOdooChannels();

  const handleSync = () => {
    syncChannels.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Failed to load channels</p>
        <p className="text-sm text-muted-foreground">
          {error?.message || "Unknown error"}
        </p>
        <Button variant="outline" size="sm" onClick={handleSync} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const channels = data?.channels || [];
  const totalUnread = data?.totalUnread || 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Channels</h2>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSync}
          disabled={syncChannels.isPending}
          title="Sync channels from Odoo"
        >
          <RefreshCw
            className={`h-4 w-4 ${syncChannels.isPending ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {channels.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>No channels found</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              className="mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync from Odoo
            </Button>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {channels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isSelected={channel.id === selectedChannelId}
                onSelect={() => onSelectChannel?.(channel)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ChannelItemProps {
  channel: OdooChannel;
  isSelected: boolean;
  onSelect: () => void;
}

function ChannelItem({ channel, isSelected, onSelect }: ChannelItemProps) {
  const getChannelIcon = () => {
    switch (channel.channelType) {
      case "chat":
        return <MessageSquare className="h-4 w-4" />;
      case "group":
        return <Users className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  return (
    <Card
      className={`cursor-pointer p-3 transition-colors hover:bg-accent ${
        isSelected ? "bg-accent border-primary" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-muted-foreground">{getChannelIcon()}</span>
          <div className="min-w-0">
            <p className="truncate font-medium">{channel.name}</p>
            {channel.description && (
              <p className="truncate text-sm text-muted-foreground">
                {channel.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {channel.memberCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {channel.memberCount} members
            </span>
          )}
          {channel.unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {channel.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

export default OdooChannelList;
