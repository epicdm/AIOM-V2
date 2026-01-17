import { eq, desc, and, or, lte, isNull } from "drizzle-orm";
import { database } from "~/db";
import {
  expenseWorkflowInstance,
  expenseWorkflowEvent,
  expenseWorkflowNotificationQueue,
  user,
  type ExpenseWorkflowInstance,
  type CreateExpenseWorkflowInstanceData,
  type UpdateExpenseWorkflowInstanceData,
  type ExpenseWorkflowEvent,
  type CreateExpenseWorkflowEventData,
  type ExpenseWorkflowNotificationQueue,
  type CreateExpenseWorkflowNotificationQueueData,
  type UpdateExpenseWorkflowNotificationQueueData,
  type ExpenseWorkflowState,
  type ExpenseWorkflowEventType,
} from "~/db/schema";

// Type for workflow instance with user info
export type WorkflowInstanceWithAssignee = ExpenseWorkflowInstance & {
  currentAssignee: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

// Type for workflow event with user info
export type WorkflowEventWithUser = ExpenseWorkflowEvent & {
  triggeredBy: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

// =============================================================================
// Workflow Instance Functions
// =============================================================================

/**
 * Create a new workflow instance for a voucher
 */
export async function createWorkflowInstance(
  data: CreateExpenseWorkflowInstanceData
): Promise<ExpenseWorkflowInstance> {
  const [result] = await database
    .insert(expenseWorkflowInstance)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return result;
}

/**
 * Find a workflow instance by ID
 */
export async function findWorkflowInstanceById(
  id: string
): Promise<ExpenseWorkflowInstance | null> {
  const [result] = await database
    .select()
    .from(expenseWorkflowInstance)
    .where(eq(expenseWorkflowInstance.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find a workflow instance by voucher ID
 */
export async function findWorkflowInstanceByVoucherId(
  voucherId: string
): Promise<ExpenseWorkflowInstance | null> {
  const [result] = await database
    .select()
    .from(expenseWorkflowInstance)
    .where(eq(expenseWorkflowInstance.voucherId, voucherId))
    .limit(1);

  return result || null;
}

/**
 * Find a workflow instance with assignee info
 */
export async function findWorkflowInstanceWithAssignee(
  id: string
): Promise<WorkflowInstanceWithAssignee | null> {
  const result = await database.query.expenseWorkflowInstance.findFirst({
    where: eq(expenseWorkflowInstance.id, id),
    with: {
      currentAssignee: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return result as WorkflowInstanceWithAssignee | null;
}

/**
 * Update a workflow instance
 */
export async function updateWorkflowInstance(
  id: string,
  data: UpdateExpenseWorkflowInstanceData
): Promise<ExpenseWorkflowInstance | null> {
  const [result] = await database
    .update(expenseWorkflowInstance)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(expenseWorkflowInstance.id, id))
    .returning();

  return result || null;
}

/**
 * Transition workflow to a new state
 */
export async function transitionWorkflowState(
  id: string,
  newState: ExpenseWorkflowState,
  assigneeId?: string | null
): Promise<ExpenseWorkflowInstance | null> {
  const instance = await findWorkflowInstanceById(id);
  if (!instance) return null;

  const updateData: UpdateExpenseWorkflowInstanceData = {
    previousState: instance.currentState,
    currentState: newState,
    stateEnteredAt: new Date(),
  };

  if (assigneeId !== undefined) {
    updateData.currentAssigneeId = assigneeId;
  }

  // Check for terminal states
  if (newState === "posted" || newState === "voided" || newState === "rejected") {
    updateData.isCompleted = true;
    updateData.completedAt = new Date();
    updateData.completionResult = newState === "posted" ? "success" : newState;
    updateData.currentAssigneeId = null;
  }

  return await updateWorkflowInstance(id, updateData);
}

/**
 * Get all active workflow instances for a user (as assignee)
 */
export async function getActiveWorkflowsForAssignee(
  assigneeId: string
): Promise<ExpenseWorkflowInstance[]> {
  return await database
    .select()
    .from(expenseWorkflowInstance)
    .where(
      and(
        eq(expenseWorkflowInstance.currentAssigneeId, assigneeId),
        eq(expenseWorkflowInstance.isCompleted, false)
      )
    )
    .orderBy(desc(expenseWorkflowInstance.createdAt));
}

/**
 * Get workflows with breached SLA
 */
export async function getWorkflowsWithBreachedSLA(): Promise<ExpenseWorkflowInstance[]> {
  return await database
    .select()
    .from(expenseWorkflowInstance)
    .where(
      and(
        eq(expenseWorkflowInstance.isCompleted, false),
        eq(expenseWorkflowInstance.slaBreached, true)
      )
    )
    .orderBy(desc(expenseWorkflowInstance.stateEnteredAt));
}

/**
 * Get workflows that are overdue
 */
export async function getOverdueWorkflows(): Promise<ExpenseWorkflowInstance[]> {
  const now = new Date();
  return await database
    .select()
    .from(expenseWorkflowInstance)
    .where(
      and(
        eq(expenseWorkflowInstance.isCompleted, false),
        lte(expenseWorkflowInstance.dueDate, now)
      )
    )
    .orderBy(expenseWorkflowInstance.dueDate);
}

/**
 * Mark workflow SLA as breached
 */
export async function markWorkflowSLABreached(
  id: string,
  escalationReason?: string
): Promise<ExpenseWorkflowInstance | null> {
  return await updateWorkflowInstance(id, {
    slaBreached: true,
    escalationReason,
  });
}

/**
 * Escalate a workflow
 */
export async function escalateWorkflow(
  id: string,
  newAssigneeId: string,
  reason: string
): Promise<ExpenseWorkflowInstance | null> {
  const instance = await findWorkflowInstanceById(id);
  if (!instance) return null;

  return await updateWorkflowInstance(id, {
    currentAssigneeId: newAssigneeId,
    escalationLevel: instance.escalationLevel + 1,
    escalatedAt: new Date(),
    escalationReason: reason,
  });
}

// =============================================================================
// Workflow Event Functions
// =============================================================================

/**
 * Create a workflow event
 */
export async function createWorkflowEvent(
  data: CreateExpenseWorkflowEventData
): Promise<ExpenseWorkflowEvent> {
  const [result] = await database
    .insert(expenseWorkflowEvent)
    .values(data)
    .returning();

  return result;
}

/**
 * Record a state transition event
 */
export async function recordStateTransitionEvent(
  workflowInstanceId: string,
  voucherId: string,
  eventType: ExpenseWorkflowEventType,
  fromState: string | null,
  toState: string,
  triggeredById: string | null,
  eventData?: Record<string, unknown>,
  comments?: string
): Promise<ExpenseWorkflowEvent> {
  return await createWorkflowEvent({
    id: crypto.randomUUID(),
    workflowInstanceId,
    voucherId,
    eventType,
    fromState,
    toState,
    triggeredById,
    eventData: eventData ? JSON.stringify(eventData) : null,
    comments,
  });
}

/**
 * Get all events for a workflow instance
 */
export async function getWorkflowEvents(
  workflowInstanceId: string
): Promise<ExpenseWorkflowEvent[]> {
  return await database
    .select()
    .from(expenseWorkflowEvent)
    .where(eq(expenseWorkflowEvent.workflowInstanceId, workflowInstanceId))
    .orderBy(expenseWorkflowEvent.occurredAt);
}

/**
 * Get all events for a voucher
 */
export async function getWorkflowEventsByVoucherId(
  voucherId: string
): Promise<ExpenseWorkflowEvent[]> {
  return await database
    .select()
    .from(expenseWorkflowEvent)
    .where(eq(expenseWorkflowEvent.voucherId, voucherId))
    .orderBy(expenseWorkflowEvent.occurredAt);
}

/**
 * Get workflow events with user info
 */
export async function getWorkflowEventsWithUsers(
  workflowInstanceId: string
): Promise<WorkflowEventWithUser[]> {
  const results = await database.query.expenseWorkflowEvent.findMany({
    where: eq(expenseWorkflowEvent.workflowInstanceId, workflowInstanceId),
    with: {
      triggeredBy: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: (event, { asc }) => [asc(event.occurredAt)],
  });

  return results as WorkflowEventWithUser[];
}

// =============================================================================
// Notification Queue Functions
// =============================================================================

/**
 * Create a notification in the queue
 */
export async function createWorkflowNotification(
  data: CreateExpenseWorkflowNotificationQueueData
): Promise<ExpenseWorkflowNotificationQueue> {
  const [result] = await database
    .insert(expenseWorkflowNotificationQueue)
    .values(data)
    .returning();

  return result;
}

/**
 * Queue a workflow notification
 */
export async function queueWorkflowNotification(
  workflowInstanceId: string,
  voucherId: string,
  recipientId: string,
  notificationType: string,
  title: string,
  body: string,
  actionUrl?: string,
  priority: "low" | "normal" | "high" | "urgent" = "normal",
  scheduledFor?: Date
): Promise<ExpenseWorkflowNotificationQueue> {
  return await createWorkflowNotification({
    id: crypto.randomUUID(),
    workflowInstanceId,
    voucherId,
    recipientId,
    notificationType,
    title,
    body,
    actionUrl,
    priority,
    scheduledFor: scheduledFor || new Date(),
    status: "pending",
  });
}

/**
 * Get pending notifications ready to be sent
 */
export async function getPendingNotifications(
  limit: number = 50
): Promise<ExpenseWorkflowNotificationQueue[]> {
  const now = new Date();
  return await database
    .select()
    .from(expenseWorkflowNotificationQueue)
    .where(
      and(
        eq(expenseWorkflowNotificationQueue.status, "pending"),
        lte(expenseWorkflowNotificationQueue.scheduledFor, now)
      )
    )
    .orderBy(expenseWorkflowNotificationQueue.priority)
    .limit(limit);
}

/**
 * Mark notification as sent
 */
export async function markNotificationSent(
  id: string
): Promise<ExpenseWorkflowNotificationQueue | null> {
  const [result] = await database
    .update(expenseWorkflowNotificationQueue)
    .set({
      status: "sent",
      sentAt: new Date(),
    })
    .where(eq(expenseWorkflowNotificationQueue.id, id))
    .returning();

  return result || null;
}

/**
 * Mark notification as delivered
 */
export async function markNotificationDelivered(
  id: string
): Promise<ExpenseWorkflowNotificationQueue | null> {
  const [result] = await database
    .update(expenseWorkflowNotificationQueue)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
    })
    .where(eq(expenseWorkflowNotificationQueue.id, id))
    .returning();

  return result || null;
}

/**
 * Mark notification as failed
 */
export async function markNotificationFailed(
  id: string,
  errorMessage: string
): Promise<ExpenseWorkflowNotificationQueue | null> {
  const notification = await database
    .select()
    .from(expenseWorkflowNotificationQueue)
    .where(eq(expenseWorkflowNotificationQueue.id, id))
    .limit(1);

  if (!notification[0]) return null;

  const newRetryCount = notification[0].retryCount + 1;
  const shouldRetry = newRetryCount < notification[0].maxRetries;

  const [result] = await database
    .update(expenseWorkflowNotificationQueue)
    .set({
      status: shouldRetry ? "pending" : "failed",
      failedAt: shouldRetry ? null : new Date(),
      errorMessage,
      retryCount: newRetryCount,
    })
    .where(eq(expenseWorkflowNotificationQueue.id, id))
    .returning();

  return result || null;
}

/**
 * Cancel pending notifications for a workflow
 */
export async function cancelWorkflowNotifications(
  workflowInstanceId: string
): Promise<number> {
  const result = await database
    .update(expenseWorkflowNotificationQueue)
    .set({
      status: "cancelled",
    })
    .where(
      and(
        eq(expenseWorkflowNotificationQueue.workflowInstanceId, workflowInstanceId),
        eq(expenseWorkflowNotificationQueue.status, "pending")
      )
    )
    .returning();

  return result.length;
}

/**
 * Get notifications for a recipient
 */
export async function getNotificationsForRecipient(
  recipientId: string,
  limit: number = 20,
  includeDelivered: boolean = false
): Promise<ExpenseWorkflowNotificationQueue[]> {
  const statusConditions = includeDelivered
    ? or(
        eq(expenseWorkflowNotificationQueue.status, "pending"),
        eq(expenseWorkflowNotificationQueue.status, "sent"),
        eq(expenseWorkflowNotificationQueue.status, "delivered")
      )
    : or(
        eq(expenseWorkflowNotificationQueue.status, "pending"),
        eq(expenseWorkflowNotificationQueue.status, "sent")
      );

  return await database
    .select()
    .from(expenseWorkflowNotificationQueue)
    .where(
      and(
        eq(expenseWorkflowNotificationQueue.recipientId, recipientId),
        statusConditions
      )
    )
    .orderBy(desc(expenseWorkflowNotificationQueue.createdAt))
    .limit(limit);
}
