import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';
import * as Collapsible from '@radix-ui/react-collapsible';
import { authClient } from '~/lib/auth-client';

interface RecommendedAction {
  step: number;
  description: string;
  status: 'needs_approval' | 'draft' | 'auto_executable';
}

interface AIDecisionCardProps {
  id: string;
  priority: 'critical' | 'attention' | 'info' | 'automated';
  title: string;
  body: string;
  impacted: string;
  sources: string;
  riskAssessment: string;
  recommendedPlan: RecommendedAction[];
}

const statusConfig = {
  needs_approval: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    label: 'Needs approval',
  },
  draft: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    label: 'Draft ready',
  },
  auto_executable: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    label: 'Auto-executable',
  },
};

const borderColors = {
  critical: 'border-l-red-500',
  attention: 'border-l-amber-500',
  info: 'border-l-blue-500',
  automated: 'border-l-gray-500',
};

export function AIDecisionCard({
  id,
  priority,
  title,
  body,
  impacted,
  sources,
  riskAssessment,
  recommendedPlan,
}: AIDecisionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: session } = authClient.useSession();

  // Generate one-line summary from body (first sentence)
  const summary = body.split('.')[0] + '.';

  // Handler for Approve & Execute button
  const handleApproveAndExecute = async () => {
    if (!session?.user?.id) {
      setExecutionStatus('error');
      setErrorMessage('You must be logged in to approve actions');
      return;
    }

    setIsExecuting(true);
    setExecutionStatus('idle');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/ai-coo/approve-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId: id,
          userId: session.user.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setExecutionStatus('success');
        console.log('[AI COO] Action executed successfully:', data);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setExecutionStatus('idle');
        }, 3000);
      } else {
        setExecutionStatus('error');
        setErrorMessage(data.error || data.message || 'Failed to execute action');
        console.error('[AI COO] Action execution failed:', data);
      }
    } catch (error) {
      setExecutionStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Network error occurred'
      );
      console.error('[AI COO] Network error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-[10px] border border-gray-200 border-l-4 ${borderColors[priority]} bg-white p-[17px] transition-shadow hover:shadow-md`}
    >
      <Collapsible.Root open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Priority Badge */}
        <div className="mb-4">
          <PriorityBadge priority={priority} />
        </div>

        {/* Title */}
        <h3 className="mb-3 text-[16px] font-medium leading-[22px] text-[#0A0A0A]">{title}</h3>

        {/* Summary (always visible) */}
        <p className="mb-4 text-[14px] leading-[23px] text-[#717182]">{summary}</p>

        {/* Collapsible Content */}
        <Collapsible.Content>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                {/* Full Body (only show if different from summary) */}
                {body !== summary && (
                  <p className="mb-4 text-sm leading-relaxed text-gray-600">{body}</p>
                )}

                {/* Impacted & Sources */}
                <div className="mb-4 space-y-0.5 text-xs text-gray-500">
                  <div className="flex gap-2">
                    <span className="font-medium">Impacted:</span>
                    <span>{impacted}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium">Sources:</span>
                    <span>{sources}</span>
                  </div>
                </div>

                {/* Risk Assessment Box */}
                <div className="mb-4 rounded-lg bg-[#F9FAFB] p-3">
                  <p className="text-[14px] leading-5 text-[#0A0A0A]">{riskAssessment}</p>
                </div>

                {/* Recommended Plan */}
                <div className="mb-4">
                  <p className="mb-2 text-[12px] font-normal leading-4 text-[#717182]">Recommended Plan:</p>
                  <div className="space-y-[6px]">
                    {recommendedPlan.map((action) => (
                      <div key={action.step} className="flex gap-[17.75px]">
                        <div className="flex h-5 w-[10px] flex-shrink-0 items-center justify-start text-[14px] font-normal leading-5 text-[#3B82F6]">
                          {action.step}.
                        </div>
                        <div className="flex-1">
                          <p className="mb-1 text-[14px] leading-5 text-[#0A0A0A]">{action.description}</p>
                          <span
                            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${statusConfig[action.status].bg} ${statusConfig[action.status].text} ${statusConfig[action.status].border}`}
                          >
                            {statusConfig[action.status].label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Collapsible.Content>

        {/* Execution Status Message */}
        {executionStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-3 flex items-center gap-2 rounded-lg p-3 ${
              executionStatus === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {executionStatus === 'success' ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Action executed successfully!</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{errorMessage || 'Execution failed'}</span>
              </>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleApproveAndExecute}
            disabled={isExecuting || executionStatus === 'success'}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-[14px] font-medium leading-5 text-white ${
              isExecuting || executionStatus === 'success'
                ? 'cursor-not-allowed bg-blue-400'
                : 'bg-[#3B82F6] hover:bg-blue-700'
            }`}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : executionStatus === 'success' ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Executed
              </>
            ) : (
              'Approve & Execute'
            )}
          </button>
          <button className="inline-flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-3 py-2 text-[14px] font-medium leading-5 text-[#0A0A0A] hover:bg-gray-50">
            Review Each
          </button>
          <button className="inline-flex items-center justify-center gap-[6px] rounded-lg px-3 py-2 text-[14px] font-medium leading-5 text-[#0A0A0A] hover:bg-gray-50">
            <Sparkles className="h-4 w-4" />
            Ask AI
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-[14px] font-medium leading-5 text-[#0A0A0A] hover:bg-gray-50"
          >
            Tell Me More
          </button>
          <button className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-[14px] font-medium leading-5 text-[#0A0A0A] hover:bg-gray-50">
            Dismiss
          </button>
        </div>

        {/* Expand/Collapse Toggle */}
        <Collapsible.Trigger asChild>
          <button className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show Details
              </>
            )}
          </button>
        </Collapsible.Trigger>
      </Collapsible.Root>
    </motion.div>
  );
}
