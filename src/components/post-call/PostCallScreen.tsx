import * as React from "react";
import { useState } from "react";
import { ChevronLeft, Plus, ListTodo } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { CallSummaryCard } from "./CallSummaryCard";
import { CallDispositionForm } from "./CallDispositionForm";
import { CreateTaskForm } from "./CreateTaskForm";
import { TaskList } from "./TaskList";
import {
  useCreateCallDisposition,
  useCreateCallTask,
  useCompleteCallTask,
  useDeleteCallTask,
  useCallDispositionByCallRecord,
  useCallTasksByCallRecord,
} from "~/hooks/useCallDispositions";
import type { CallRecord } from "~/db/schema";
import type {
  DispositionType,
  CustomerSentiment,
  TaskPriority,
} from "~/fn/call-dispositions";

interface PostCallScreenProps {
  callRecord: CallRecord;
  onComplete?: () => void;
  onBack?: () => void;
}

export function PostCallScreen({
  callRecord,
  onComplete,
  onBack,
}: PostCallScreenProps) {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [dispositionSaved, setDispositionSaved] = useState(false);

  // Queries
  const { data: existingDisposition, isLoading: isLoadingDisposition } =
    useCallDispositionByCallRecord(callRecord.id);
  const { data: tasks = [], isLoading: isLoadingTasks } =
    useCallTasksByCallRecord(callRecord.id);

  // Mutations
  const createDisposition = useCreateCallDisposition();
  const createTask = useCreateCallTask();
  const completeTask = useCompleteCallTask();
  const deleteTask = useDeleteCallTask();

  const handleDispositionSubmit = async (data: {
    disposition: DispositionType;
    notes?: string;
    customerSentiment?: CustomerSentiment;
    followUpDate?: string;
    followUpReason?: string;
    escalationReason?: string;
    escalationPriority?: TaskPriority;
  }) => {
    try {
      await createDisposition.mutateAsync({
        callRecordId: callRecord.id,
        disposition: data.disposition,
        notes: data.notes,
        customerSentiment: data.customerSentiment,
        followUpDate: data.followUpDate,
        followUpReason: data.followUpReason,
        escalationReason: data.escalationReason,
        escalationPriority: data.escalationPriority,
      });
      setDispositionSaved(true);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
  }) => {
    try {
      await createTask.mutateAsync({
        callRecordId: callRecord.id,
        callDispositionId: existingDisposition?.id,
        title: data.title,
        description: data.description,
        priority: data.priority || "medium",
        dueDate: data.dueDate,
      });
      setShowTaskForm(false);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask.mutateAsync(taskId);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const hasExistingDisposition = !!existingDisposition || dispositionSaved;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-semibold">Post-Call Summary</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-3xl px-4 py-6">
        <div className="space-y-6">
          {/* Call Summary */}
          <section>
            <CallSummaryCard callRecord={callRecord} />
          </section>

          {/* Disposition Form or Summary */}
          <section>
            {isLoadingDisposition ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : hasExistingDisposition ? (
              <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium">Disposition Saved</span>
                </div>
                {existingDisposition && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      {existingDisposition.disposition?.replace("_", " ")}
                    </p>
                    {existingDisposition.notes && (
                      <p className="mt-1">
                        <span className="font-medium">Notes:</span>{" "}
                        {existingDisposition.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <CallDispositionForm
                onSubmit={handleDispositionSubmit}
                isSubmitting={createDisposition.isPending}
              />
            )}
          </section>

          {/* Tasks Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Follow-up Tasks
              </h2>
              {!showTaskForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTaskForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              )}
            </div>

            {showTaskForm && (
              <div className="mb-4">
                <CreateTaskForm
                  onSubmit={handleCreateTask}
                  isSubmitting={createTask.isPending}
                  onCancel={() => setShowTaskForm(false)}
                />
              </div>
            )}

            <TaskList
              tasks={tasks}
              onCompleteTask={handleCompleteTask}
              onDeleteTask={handleDeleteTask}
              isLoading={isLoadingTasks}
              emptyMessage="No follow-up tasks. Click 'Add Task' to create one."
            />
          </section>

          {/* Complete Button */}
          {hasExistingDisposition && onComplete && (
            <div className="flex justify-center pt-4">
              <Button size="lg" onClick={onComplete} className="min-w-[200px]">
                Complete
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
