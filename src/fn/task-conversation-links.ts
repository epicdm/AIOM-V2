import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createTaskConversationLink,
  findTaskLinksByConversationId,
  findTaskLinksByExternalTaskId,
  updateTaskConversationLink,
  deleteTaskConversationLink,
  createTaskSuggestion,
  createMultipleTaskSuggestions,
  findTaskSuggestionsByConversationId,
  findPendingTaskSuggestions,
  acceptTaskSuggestion,
  dismissTaskSuggestion,
  createTaskThread,
  findTaskThreadById,
  findTaskThreadByIdWithDetails,
  findTaskThreadsByExternalTaskId,
  findTaskThreadsByUserId,
  updateTaskThread,
  closeTaskThread,
  resolveTaskThread,
  reopenTaskThread,
  createTaskThreadMessage,
  findTaskThreadMessages,
  markTaskThreadMessagesAsRead,
  addTaskThreadParticipant,
  findTaskThreadParticipants,
  isUserParticipantInThread,
  removeTaskThreadParticipant,
  updateParticipantMuteStatus,
  getUnreadThreadCount,
} from "~/data-access/task-conversation-links";
import { isUserParticipantInConversation } from "~/data-access/conversations";

// =============================================================================
// Task Conversation Link Server Functions
// =============================================================================

// Create a link between a conversation and a task
export const createTaskLinkFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      conversationId: z.string().min(1, "Conversation ID is required"),
      externalTaskId: z.string().min(1, "External task ID is required"),
      externalProjectId: z.string().optional(),
      taskSource: z.enum(["odoo", "manual", "ai_suggested"]).default("manual"),
      linkReason: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant in the conversation
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      data.conversationId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this conversation");
    }

    const link = await createTaskConversationLink({
      id: crypto.randomUUID(),
      conversationId: data.conversationId,
      externalTaskId: data.externalTaskId,
      externalProjectId: data.externalProjectId,
      taskSource: data.taskSource,
      linkedById: context.userId,
      linkReason: data.linkReason,
    });

    return link;
  });

// Get task links for a conversation
export const getTaskLinksByConversationFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      conversationId: z.string().min(1, "Conversation ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant in the conversation
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      data.conversationId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this conversation");
    }

    return await findTaskLinksByConversationId(data.conversationId);
  });

// Get task links for an external task
export const getTaskLinksByExternalTaskFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      externalTaskId: z.string().min(1, "External task ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    return await findTaskLinksByExternalTaskId(data.externalTaskId);
  });

// Update a task link
export const updateTaskLinkFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      linkId: z.string().min(1, "Link ID is required"),
      status: z.enum(["active", "completed", "archived"]).optional(),
      linkReason: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const updateData: { status?: string; linkReason?: string } = {};
    if (data.status) updateData.status = data.status;
    if (data.linkReason !== undefined) updateData.linkReason = data.linkReason;

    return await updateTaskConversationLink(data.linkId, updateData);
  });

// Delete a task link
export const deleteTaskLinkFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      linkId: z.string().min(1, "Link ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    await deleteTaskConversationLink(data.linkId);
    return { success: true };
  });

// =============================================================================
// Task Suggestion Server Functions
// =============================================================================

// Create a task suggestion
export const createTaskSuggestionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      conversationId: z.string().min(1, "Conversation ID is required"),
      suggestedTaskId: z.string().optional(),
      suggestedProjectId: z.string().optional(),
      suggestionReason: z.string().min(1, "Suggestion reason is required"),
      confidenceScore: z.number().min(0).max(1).optional(),
      relevanceKeywords: z.array(z.string()).optional(),
      taskTitle: z.string().optional(),
      taskDescription: z.string().optional(),
      taskPriority: z.string().optional(),
      taskDeadline: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const suggestion = await createTaskSuggestion({
      id: crypto.randomUUID(),
      conversationId: data.conversationId,
      suggestedTaskId: data.suggestedTaskId,
      suggestedProjectId: data.suggestedProjectId,
      suggestionReason: data.suggestionReason,
      confidenceScore: data.confidenceScore,
      relevanceKeywords: data.relevanceKeywords
        ? JSON.stringify(data.relevanceKeywords)
        : null,
      taskTitle: data.taskTitle,
      taskDescription: data.taskDescription,
      taskPriority: data.taskPriority,
      taskDeadline: data.taskDeadline ? new Date(data.taskDeadline) : null,
    });

    return suggestion;
  });

// Create multiple task suggestions (for AI batch suggestions)
export const createBatchTaskSuggestionsFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      conversationId: z.string().min(1, "Conversation ID is required"),
      suggestions: z.array(
        z.object({
          suggestedTaskId: z.string().optional(),
          suggestedProjectId: z.string().optional(),
          suggestionReason: z.string().min(1, "Suggestion reason is required"),
          confidenceScore: z.number().min(0).max(1).optional(),
          relevanceKeywords: z.array(z.string()).optional(),
          taskTitle: z.string().optional(),
          taskDescription: z.string().optional(),
          taskPriority: z.string().optional(),
          taskDeadline: z.string().optional(),
        })
      ),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const suggestionData = data.suggestions.map((s) => ({
      id: crypto.randomUUID(),
      conversationId: data.conversationId,
      suggestedTaskId: s.suggestedTaskId,
      suggestedProjectId: s.suggestedProjectId,
      suggestionReason: s.suggestionReason,
      confidenceScore: s.confidenceScore,
      relevanceKeywords: s.relevanceKeywords
        ? JSON.stringify(s.relevanceKeywords)
        : null,
      taskTitle: s.taskTitle,
      taskDescription: s.taskDescription,
      taskPriority: s.taskPriority,
      taskDeadline: s.taskDeadline ? new Date(s.taskDeadline) : null,
    }));

    return await createMultipleTaskSuggestions(suggestionData);
  });

// Get task suggestions for a conversation
export const getTaskSuggestionsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      conversationId: z.string().min(1, "Conversation ID is required"),
      status: z.enum(["pending", "accepted", "dismissed"]).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant in the conversation
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      data.conversationId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this conversation");
    }

    return await findTaskSuggestionsByConversationId(
      data.conversationId,
      data.status
    );
  });

// Get pending task suggestions for a conversation
export const getPendingTaskSuggestionsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      conversationId: z.string().min(1, "Conversation ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant in the conversation
    const isParticipant = await isUserParticipantInConversation(
      context.userId,
      data.conversationId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this conversation");
    }

    return await findPendingTaskSuggestions(data.conversationId);
  });

// Accept a task suggestion
export const acceptTaskSuggestionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      suggestionId: z.string().min(1, "Suggestion ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await acceptTaskSuggestion(data.suggestionId, context.userId);
  });

// Dismiss a task suggestion
export const dismissTaskSuggestionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      suggestionId: z.string().min(1, "Suggestion ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return await dismissTaskSuggestion(data.suggestionId, context.userId);
  });

// =============================================================================
// Task Thread Server Functions
// =============================================================================

// Create a new task thread
export const createTaskThreadFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      externalTaskId: z.string().min(1, "External task ID is required"),
      externalProjectId: z.string().optional(),
      taskSource: z.enum(["odoo", "manual", "ai_suggested"]).default("odoo"),
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      taskTitle: z.string().optional(),
      taskDeadline: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Create the thread
    const thread = await createTaskThread({
      id: crypto.randomUUID(),
      externalTaskId: data.externalTaskId,
      externalProjectId: data.externalProjectId,
      taskSource: data.taskSource,
      title: data.title,
      description: data.description,
      createdById: context.userId,
      taskTitle: data.taskTitle,
      taskDeadline: data.taskDeadline ? new Date(data.taskDeadline) : null,
    });

    // Add creator as participant
    await addTaskThreadParticipant({
      id: crypto.randomUUID(),
      threadId: thread.id,
      userId: context.userId,
    });

    return thread;
  });

// Get a task thread by ID
export const getTaskThreadFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const thread = await findTaskThreadByIdWithDetails(data.threadId);

    if (!thread) {
      throw new Error("Thread not found");
    }

    // Verify user is a participant
    const isParticipant = await isUserParticipantInThread(
      data.threadId,
      context.userId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this thread");
    }

    return thread;
  });

// Get threads for a task
export const getTaskThreadsByTaskFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      externalTaskId: z.string().min(1, "External task ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    return await findTaskThreadsByExternalTaskId(data.externalTaskId);
  });

// Get threads for the current user
export const getUserTaskThreadsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await findTaskThreadsByUserId(context.userId);
  });

// Update a task thread
export const updateTaskThreadFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
      title: z.string().optional(),
      description: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant
    const isParticipant = await isUserParticipantInThread(
      data.threadId,
      context.userId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this thread");
    }

    const updateData: { title?: string; description?: string } = {};
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    return await updateTaskThread(data.threadId, updateData);
  });

// Close a task thread
export const closeTaskThreadFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
      closedReason: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant
    const isParticipant = await isUserParticipantInThread(
      data.threadId,
      context.userId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this thread");
    }

    return await closeTaskThread(
      data.threadId,
      context.userId,
      data.closedReason
    );
  });

// Resolve a task thread
export const resolveTaskThreadFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
      closedReason: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant
    const isParticipant = await isUserParticipantInThread(
      data.threadId,
      context.userId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this thread");
    }

    return await resolveTaskThread(
      data.threadId,
      context.userId,
      data.closedReason
    );
  });

// Reopen a task thread
export const reopenTaskThreadFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant
    const isParticipant = await isUserParticipantInThread(
      data.threadId,
      context.userId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this thread");
    }

    return await reopenTaskThread(data.threadId);
  });

// =============================================================================
// Task Thread Message Server Functions
// =============================================================================

// Send a message to a task thread
export const sendTaskThreadMessageFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
      content: z.string().min(1, "Content is required"),
      originalMessageId: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant
    const isParticipant = await isUserParticipantInThread(
      data.threadId,
      context.userId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this thread");
    }

    return await createTaskThreadMessage({
      id: crypto.randomUUID(),
      threadId: data.threadId,
      senderId: context.userId,
      content: data.content,
      originalMessageId: data.originalMessageId,
    });
  });

// Get messages from a task thread
export const getTaskThreadMessagesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant
    const isParticipant = await isUserParticipantInThread(
      data.threadId,
      context.userId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this thread");
    }

    return await findTaskThreadMessages(data.threadId, data.limit, data.offset);
  });

// Mark thread messages as read
export const markThreadMessagesAsReadFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await markTaskThreadMessagesAsRead(data.threadId, context.userId);
    return { success: true };
  });

// =============================================================================
// Task Thread Participant Server Functions
// =============================================================================

// Add a participant to a thread
export const addThreadParticipantFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
      userId: z.string().min(1, "User ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify current user is a participant
    const isParticipant = await isUserParticipantInThread(
      data.threadId,
      context.userId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this thread");
    }

    return await addTaskThreadParticipant({
      id: crypto.randomUUID(),
      threadId: data.threadId,
      userId: data.userId,
    });
  });

// Get thread participants
export const getThreadParticipantsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user is a participant
    const isParticipant = await isUserParticipantInThread(
      data.threadId,
      context.userId
    );

    if (!isParticipant) {
      throw new Error("You are not a participant in this thread");
    }

    return await findTaskThreadParticipants(data.threadId);
  });

// Leave a thread
export const leaveThreadFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await removeTaskThreadParticipant(data.threadId, context.userId);
    return { success: true };
  });

// Mute/unmute a thread
export const toggleThreadMuteFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      threadId: z.string().min(1, "Thread ID is required"),
      isMuted: z.boolean(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    await updateParticipantMuteStatus(
      data.threadId,
      context.userId,
      data.isMuted
    );
    return { success: true };
  });

// Get unread thread count for current user
export const getUnreadThreadCountFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const count = await getUnreadThreadCount(context.userId);
    return { count };
  });
