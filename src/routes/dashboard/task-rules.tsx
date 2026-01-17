/**
 * Task Rules Dashboard Page
 *
 * Manage task auto-creation rules, view statistics, and execution logs.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "~/components/Page";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { RulesList, RulesStatistics, RuleForm } from "~/components/task-rules";
import {
  useTaskRules,
  useTaskRuleStatistics,
  useCreateTaskRule,
  useActivateRule,
  usePauseRule,
  useArchiveRule,
  useDeleteTaskRule,
  useManualTriggerRule,
  useInvalidateTaskRuleQueries,
} from "~/hooks/useTaskAutoCreationRules";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "sonner";
import { assertAuthenticatedFn } from "~/fn/guards";
import { Home, Zap, Settings, History } from "lucide-react";
import type { TaskRuleStatus, TaskRuleTriggerType } from "~/data-access/task-auto-creation-rules";

// =============================================================================
// Route Configuration
// =============================================================================

export const Route = createFileRoute("/dashboard/task-rules")({
  component: TaskRulesPage,
  beforeLoad: async () => {
    await assertAuthenticatedFn();
  },
});

// =============================================================================
// Component
// =============================================================================

function TaskRulesPage() {
  const navigate = useNavigate();
  const { invalidateAll } = useInvalidateTaskRuleQueries();

  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    status?: TaskRuleStatus;
    triggerType?: TaskRuleTriggerType;
  }>({});

  // Queries
  const { data: rulesData, isLoading: isLoadingRules, refetch: refetchRules } = useTaskRules(filters);
  const { data: statsData, isLoading: isLoadingStats } = useTaskRuleStatistics();

  // Mutations
  const createRuleMutation = useCreateTaskRule();
  const activateRuleMutation = useActivateRule();
  const pauseRuleMutation = usePauseRule();
  const archiveRuleMutation = useArchiveRule();
  const deleteRuleMutation = useDeleteTaskRule();
  const triggerRuleMutation = useManualTriggerRule();

  // Handlers
  const handleCreateRule = async (data: Parameters<typeof createRuleMutation.mutateAsync>[0]) => {
    try {
      await createRuleMutation.mutateAsync(data);
      setIsCreateDialogOpen(false);
      toast.success("Rule created successfully");
    } catch (error) {
      toast.error("Failed to create rule");
    }
  };

  const handleActivateRule = async (id: string) => {
    try {
      await activateRuleMutation.mutateAsync(id);
      toast.success("Rule activated");
    } catch (error) {
      toast.error("Failed to activate rule");
    }
  };

  const handlePauseRule = async (id: string) => {
    try {
      await pauseRuleMutation.mutateAsync(id);
      toast.success("Rule paused");
    } catch (error) {
      toast.error("Failed to pause rule");
    }
  };

  const handleArchiveRule = async (id: string) => {
    try {
      await archiveRuleMutation.mutateAsync(id);
      toast.success("Rule archived");
    } catch (error) {
      toast.error("Failed to archive rule");
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId) return;
    try {
      await deleteRuleMutation.mutateAsync(deleteRuleId);
      setDeleteRuleId(null);
      toast.success("Rule deleted");
    } catch (error) {
      toast.error("Failed to delete rule");
    }
  };

  const handleTriggerRule = async (id: string) => {
    try {
      const result = await triggerRuleMutation.mutateAsync({ id });
      if (result.result?.success) {
        toast.success(
          result.result.taskCreated
            ? "Rule triggered successfully - task created"
            : "Rule triggered - conditions not met"
        );
      } else {
        toast.error(`Failed to trigger: ${result.result?.error}`);
      }
    } catch (error) {
      toast.error("Failed to trigger rule");
    }
  };

  const handleEditRule = (id: string) => {
    // Navigate to edit page or open edit dialog
    toast.info("Edit functionality coming soon");
  };

  const handleFilterChange = (newFilters: {
    status?: TaskRuleStatus;
    triggerType?: TaskRuleTriggerType;
    search?: string;
  }) => {
    setFilters({
      status: newFilters.status,
      triggerType: newFilters.triggerType,
    });
  };

  const rules = rulesData?.rules || [];
  const statistics = statsData?.stats;

  return (
    <Page>
      {/* Breadcrumb */}
      <AppBreadcrumb
        items={[
          { label: "Home", href: "/dashboard", icon: Home },
          { label: "Task Rules", href: "/dashboard/task-rules", icon: Zap },
        ]}
      />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Task Auto-Creation Rules</h1>
        <p className="text-muted-foreground mt-1">
          Automate task creation based on triggers like new customers, overdue invoices, and more.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <RulesList
            rules={rules}
            isLoading={isLoadingRules}
            onCreateNew={() => setIsCreateDialogOpen(true)}
            onEdit={handleEditRule}
            onActivate={handleActivateRule}
            onPause={handlePauseRule}
            onArchive={handleArchiveRule}
            onDelete={(id) => setDeleteRuleId(id)}
            onTrigger={handleTriggerRule}
            onRefresh={() => refetchRules()}
            onFilterChange={handleFilterChange}
          />
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          <RulesStatistics statistics={statistics} isLoading={isLoadingStats} />
        </TabsContent>
      </Tabs>

      {/* Create Rule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Rule</DialogTitle>
            <DialogDescription>
              Define a trigger, conditions, and task template for automatic task creation.
            </DialogDescription>
          </DialogHeader>
          <RuleForm
            onSubmit={handleCreateRule}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createRuleMutation.isPending}
            submitLabel="Create Rule"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be undone.
              All execution history for this rule will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRule}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

export default TaskRulesPage;
