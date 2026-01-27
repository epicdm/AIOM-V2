import { createFileRoute } from '@tanstack/react-router';
import { TopBar } from '~/components/ai-coo/TopBar';
import { AIConversationColumn } from '~/components/ai-coo/AIConversationColumn';
import { LiveActivityColumn } from '~/components/ai-coo/LiveActivityColumn';
import { MetricsInsightsColumn } from '~/components/ai-coo/MetricsInsightsColumn';

export const Route = createFileRoute('/dashboard/ai-coo/')({
  component: AICOODashboard,
});

function AICOODashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top Bar */}
      <TopBar />

      {/* Main Dashboard - 3 Column Layout */}
      <div className="flex flex-1 gap-4 p-6">
        {/* Left Column: AI Conversation */}
        <div className="w-[440px] flex-shrink-0">
          <AIConversationColumn />
        </div>

        {/* Middle Column: Live Activity */}
        <div className="flex-1">
          <LiveActivityColumn />
        </div>

        {/* Right Column: Metrics & Insights */}
        <div className="w-[326px] flex-shrink-0">
          <MetricsInsightsColumn />
        </div>
      </div>
    </div>
  );
}
