/**
 * Odoo CRM Call Logging Service
 *
 * Automatically logs call summaries and notes to Odoo CRM with:
 * - Relationship linking to leads/opportunities
 * - Activity timeline updates
 * - Partner/contact association
 */

import type { OdooRecord, XmlRpcValue, ResPartner } from "./types";
import type { OdooClient } from "./client";

// =============================================================================
// CRM Types for Odoo
// =============================================================================

/**
 * CRM Lead/Opportunity (crm.lead model)
 */
export interface CrmLead extends OdooRecord {
  name: string;
  partner_id?: [number, string] | false;
  user_id?: [number, string] | false;
  team_id?: [number, string] | false;
  stage_id?: [number, string] | false;
  type?: "lead" | "opportunity";
  active?: boolean;
  probability?: number;
  expected_revenue?: number;
  phone?: string | false;
  mobile?: string | false;
  email_from?: string | false;
  contact_name?: string | false;
  description?: string | false;
  priority?: "0" | "1" | "2" | "3";
  date_deadline?: string | false;
  date_open?: string | false;
  date_closed?: string | false;
  lost_reason_id?: [number, string] | false;
  activity_ids?: number[];
  message_ids?: number[];
  create_date?: string;
  write_date?: string;
}

/**
 * Mail Activity (mail.activity model) - For activity timeline
 */
export interface MailActivity extends OdooRecord {
  res_model: string;
  res_model_id?: [number, string] | false;
  res_id: number;
  res_name?: string | false;
  activity_type_id: [number, string];
  summary?: string | false;
  note?: string | false;
  date_deadline: string;
  user_id: [number, string];
  state?: "overdue" | "today" | "planned";
  done?: boolean;
  automated?: boolean;
  create_date?: string;
  write_date?: string;
}

/**
 * Mail Activity Type (mail.activity.type model)
 */
export interface MailActivityType extends OdooRecord {
  name: string;
  summary?: string | false;
  res_model?: string | false;
  category?: "default" | "upload_file" | "phonecall" | "meeting";
  delay_count?: number;
  delay_unit?: "days" | "weeks" | "months";
  delay_from?: "previous_activity" | "current_date";
  icon?: string | false;
  decoration_type?: string | false;
  active?: boolean;
  create_date?: string;
  write_date?: string;
}

/**
 * Mail Message (mail.message model) - For message/note logging
 */
export interface MailMessage extends OdooRecord {
  model?: string | false;
  res_id?: number;
  body: string;
  message_type: "email" | "comment" | "notification" | "user_notification" | "auto_comment";
  subtype_id?: [number, string] | false;
  subject?: string | false;
  author_id?: [number, string] | false;
  partner_ids?: number[];
  attachment_ids?: number[];
  parent_id?: [number, string] | false;
  date?: string;
  create_date?: string;
  write_date?: string;
}

// =============================================================================
// Service Types
// =============================================================================

export interface CallLogEntry {
  /** Internal call record ID from our system */
  callRecordId: string;
  /** Direction of the call */
  direction: "inbound" | "outbound";
  /** Duration in seconds */
  duration: number;
  /** When the call occurred */
  callTimestamp: Date;
  /** Caller phone number or ID */
  callerId: string;
  /** Caller name if known */
  callerName?: string;
  /** Recipient phone number or ID */
  recipientId?: string;
  /** Recipient name if known */
  recipientName?: string;
  /** AI-generated summary */
  summary?: string;
  /** Key points from the call */
  keyPoints?: string[];
  /** Action items from the call */
  actionItems?: Array<{
    title: string;
    description?: string;
    dueDate?: string;
    priority?: "high" | "medium" | "low";
  }>;
  /** Sentiment of the call */
  sentiment?: "positive" | "neutral" | "negative" | "mixed";
  /** User notes about the call */
  notes?: string;
  /** Recording URL if available */
  recordingUrl?: string;
  /** Call status */
  status: string;
}

export interface CrmLogResult {
  /** Whether the logging was successful */
  success: boolean;
  /** The Odoo partner ID if linked */
  partnerId?: number;
  /** The Odoo lead/opportunity ID if linked */
  leadId?: number;
  /** The activity ID if created */
  activityId?: number;
  /** The message ID if created */
  messageId?: number;
  /** Error message if logging failed */
  error?: string;
  /** Error code if logging failed */
  errorCode?: string;
  /** Additional details about the logging */
  details?: {
    partnerName?: string;
    leadName?: string;
    activitySummary?: string;
    messagePreview?: string;
  };
}

export interface PartnerLinkResult {
  /** Whether a partner was found/created */
  found: boolean;
  /** The partner ID */
  partnerId?: number;
  /** The partner name */
  partnerName?: string;
  /** Whether this is a new partner */
  isNew?: boolean;
  /** Associated lead/opportunity IDs */
  leadIds?: number[];
}

export interface ActivityCreateOptions {
  /** Activity type name (e.g., "Call", "Phone Call") */
  activityTypeName?: string;
  /** Summary for the activity */
  summary?: string;
  /** Due date for the activity (ISO date string) */
  dueDate?: string;
  /** User ID to assign the activity to */
  userId?: number;
  /** Additional notes for the activity */
  notes?: string;
}

// =============================================================================
// CRM Call Logging Service Class
// =============================================================================

export class OdooCrmCallLoggingService {
  private client: OdooClient;
  private activityTypeCache: Map<string, MailActivityType> = new Map();

  constructor(client: OdooClient) {
    this.client = client;
  }

  // ===========================================================================
  // Partner Lookup & Linking
  // ===========================================================================

  /**
   * Finds a partner by phone number
   */
  async findPartnerByPhone(phoneNumber: string): Promise<PartnerLinkResult> {
    try {
      // Normalize phone number (remove spaces, dashes, etc.)
      const normalizedPhone = phoneNumber.replace(/[\s\-\(\)\.]/g, "");

      // Search in both phone and mobile fields
      const partners = await this.client.searchRead<ResPartner>(
        "res.partner",
        [
          "|",
          ["phone", "ilike", normalizedPhone],
          ["mobile", "ilike", normalizedPhone],
        ],
        {
          fields: ["id", "name", "phone", "mobile", "email", "is_company"],
          limit: 1,
        }
      );

      if (partners.length === 0) {
        return { found: false };
      }

      const partner = partners[0];

      // Get associated leads/opportunities
      const leads = await this.client.searchRead<CrmLead>(
        "crm.lead",
        [
          ["partner_id", "=", partner.id],
          ["active", "=", true],
        ],
        {
          fields: ["id"],
          limit: 10,
        }
      );

      return {
        found: true,
        partnerId: partner.id,
        partnerName: partner.name,
        isNew: false,
        leadIds: leads.map((l: CrmLead) => l.id),
      };
    } catch (error) {
      console.error("Error finding partner by phone:", error);
      return { found: false };
    }
  }

  /**
   * Finds a partner by email
   */
  async findPartnerByEmail(email: string): Promise<PartnerLinkResult> {
    try {
      const partners = await this.client.searchRead<ResPartner>(
        "res.partner",
        [["email", "ilike", email]],
        {
          fields: ["id", "name", "phone", "mobile", "email", "is_company"],
          limit: 1,
        }
      );

      if (partners.length === 0) {
        return { found: false };
      }

      const partner = partners[0];

      // Get associated leads/opportunities
      const leads = await this.client.searchRead<CrmLead>(
        "crm.lead",
        [
          ["partner_id", "=", partner.id],
          ["active", "=", true],
        ],
        {
          fields: ["id"],
          limit: 10,
        }
      );

      return {
        found: true,
        partnerId: partner.id,
        partnerName: partner.name,
        isNew: false,
        leadIds: leads.map((l: CrmLead) => l.id),
      };
    } catch (error) {
      console.error("Error finding partner by email:", error);
      return { found: false };
    }
  }

  /**
   * Creates a new partner from call data
   */
  async createPartnerFromCall(
    callEntry: CallLogEntry
  ): Promise<PartnerLinkResult> {
    try {
      const isInbound = callEntry.direction === "inbound";
      const phoneNumber = isInbound ? callEntry.callerId : callEntry.recipientId;
      const name =
        (isInbound ? callEntry.callerName : callEntry.recipientName) ||
        `Contact - ${phoneNumber}`;

      const partnerValues: Record<string, XmlRpcValue> = {
        name,
        phone: phoneNumber || false,
        customer_rank: 1, // Mark as customer
        comment: `Created from ${callEntry.direction} call on ${callEntry.callTimestamp.toISOString()}`,
      };

      const partnerId = await this.client.create("res.partner", partnerValues);

      return {
        found: true,
        partnerId,
        partnerName: name,
        isNew: true,
        leadIds: [],
      };
    } catch (error) {
      console.error("Error creating partner from call:", error);
      return { found: false };
    }
  }

  // ===========================================================================
  // Lead/Opportunity Operations
  // ===========================================================================

  /**
   * Finds open leads/opportunities for a partner
   */
  async findOpenLeadsForPartner(partnerId: number): Promise<CrmLead[]> {
    try {
      return await this.client.searchRead<CrmLead>(
        "crm.lead",
        [
          ["partner_id", "=", partnerId],
          ["active", "=", true],
          ["probability", "<", 100],
        ],
        {
          fields: [
            "id",
            "name",
            "stage_id",
            "type",
            "probability",
            "expected_revenue",
            "user_id",
          ],
          order: "write_date desc",
          limit: 5,
        }
      );
    } catch (error) {
      console.error("Error finding leads for partner:", error);
      return [];
    }
  }

  /**
   * Creates a new lead/opportunity from call data
   */
  async createLeadFromCall(
    callEntry: CallLogEntry,
    partnerId?: number
  ): Promise<number | null> {
    try {
      const isInbound = callEntry.direction === "inbound";
      const contactName =
        (isInbound ? callEntry.callerName : callEntry.recipientName) ||
        "Unknown Contact";
      const phone = isInbound ? callEntry.callerId : callEntry.recipientId;

      const leadValues: Record<string, XmlRpcValue> = {
        name: `${isInbound ? "Inbound" : "Outbound"} Call - ${contactName}`,
        type: "lead",
        phone: phone || false,
        contact_name: contactName,
        description: callEntry.summary || `Call recorded on ${callEntry.callTimestamp.toISOString()}`,
      };

      if (partnerId) {
        leadValues.partner_id = partnerId;
      }

      return await this.client.create("crm.lead", leadValues);
    } catch (error) {
      console.error("Error creating lead from call:", error);
      return null;
    }
  }

  // ===========================================================================
  // Activity Operations
  // ===========================================================================

  /**
   * Gets the phone call activity type
   */
  async getPhoneCallActivityType(): Promise<MailActivityType | null> {
    // Check cache first
    const cacheKey = "phonecall";
    if (this.activityTypeCache.has(cacheKey)) {
      return this.activityTypeCache.get(cacheKey)!;
    }

    try {
      // Search for phone call activity type
      const activityTypes = await this.client.searchRead<MailActivityType>(
        "mail.activity.type",
        [
          "|",
          ["category", "=", "phonecall"],
          "|",
          ["name", "ilike", "call"],
          ["name", "ilike", "phone"],
        ],
        {
          fields: ["id", "name", "summary", "category", "icon"],
          limit: 1,
        }
      );

      if (activityTypes.length > 0) {
        this.activityTypeCache.set(cacheKey, activityTypes[0]);
        return activityTypes[0];
      }

      // Fallback: Get any activity type
      const defaultTypes = await this.client.searchRead<MailActivityType>(
        "mail.activity.type",
        [["active", "=", true]],
        {
          fields: ["id", "name", "summary", "category", "icon"],
          limit: 1,
          order: "id asc",
        }
      );

      if (defaultTypes.length > 0) {
        this.activityTypeCache.set(cacheKey, defaultTypes[0]);
        return defaultTypes[0];
      }

      return null;
    } catch (error) {
      console.error("Error getting phone call activity type:", error);
      return null;
    }
  }

  /**
   * Creates an activity on a record (partner, lead, etc.)
   */
  async createActivity(
    model: string,
    resId: number,
    callEntry: CallLogEntry,
    options: ActivityCreateOptions = {}
  ): Promise<number | null> {
    try {
      const activityType = await this.getPhoneCallActivityType();
      if (!activityType) {
        console.warn("No activity type found for phone calls");
        return null;
      }

      // Build activity summary
      const directionLabel =
        callEntry.direction === "inbound" ? "Inbound" : "Outbound";
      const durationMinutes = Math.ceil(callEntry.duration / 60);
      const summary =
        options.summary ||
        `${directionLabel} Call (${durationMinutes} min)`;

      // Build activity notes
      let notes = "";
      if (callEntry.summary) {
        notes += `<p><strong>Call Summary:</strong></p><p>${callEntry.summary}</p>`;
      }
      if (callEntry.keyPoints && callEntry.keyPoints.length > 0) {
        notes += "<p><strong>Key Points:</strong></p><ul>";
        for (const point of callEntry.keyPoints) {
          notes += `<li>${point}</li>`;
        }
        notes += "</ul>";
      }
      if (callEntry.actionItems && callEntry.actionItems.length > 0) {
        notes += "<p><strong>Action Items:</strong></p><ul>";
        for (const item of callEntry.actionItems) {
          notes += `<li><strong>${item.title}</strong>`;
          if (item.description) notes += `: ${item.description}`;
          if (item.dueDate) notes += ` (Due: ${item.dueDate})`;
          notes += "</li>";
        }
        notes += "</ul>";
      }
      if (callEntry.sentiment) {
        notes += `<p><strong>Sentiment:</strong> ${callEntry.sentiment}</p>`;
      }
      if (callEntry.notes) {
        notes += `<p><strong>Notes:</strong></p><p>${callEntry.notes}</p>`;
      }
      if (options.notes) {
        notes += `<p>${options.notes}</p>`;
      }

      // Get the res_model_id
      const modelRecords = await this.client.searchRead<OdooRecord>(
        "ir.model",
        [["model", "=", model]],
        { fields: ["id"], limit: 1 }
      );

      const activityValues: Record<string, XmlRpcValue> = {
        res_model: model,
        res_model_id: modelRecords.length > 0 ? modelRecords[0].id : false,
        res_id: resId,
        activity_type_id: activityType.id,
        summary,
        note: notes || false,
        date_deadline:
          options.dueDate || new Date().toISOString().split("T")[0],
      };

      if (options.userId) {
        activityValues.user_id = options.userId;
      }

      return await this.client.create("mail.activity", activityValues);
    } catch (error) {
      console.error("Error creating activity:", error);
      return null;
    }
  }

  /**
   * Marks an activity as done
   */
  async markActivityDone(
    activityId: number,
    feedback?: string
  ): Promise<boolean> {
    try {
      await this.client.callMethodOnIds(
        "mail.activity",
        [activityId],
        "action_done",
        [],
        { feedback: feedback || false }
      );
      return true;
    } catch (error) {
      console.error("Error marking activity as done:", error);
      return false;
    }
  }

  // ===========================================================================
  // Message/Note Operations
  // ===========================================================================

  /**
   * Posts a message/note on a record
   */
  async postMessage(
    model: string,
    resId: number,
    callEntry: CallLogEntry
  ): Promise<number | null> {
    try {
      // Build message body
      const directionLabel =
        callEntry.direction === "inbound" ? "Inbound" : "Outbound";
      const durationMinutes = Math.ceil(callEntry.duration / 60);
      const dateStr = callEntry.callTimestamp.toLocaleString();

      let body = `<p><strong>📞 ${directionLabel} Call</strong></p>`;
      body += `<p><em>Duration: ${durationMinutes} min | Date: ${dateStr}</em></p>`;

      if (callEntry.status && callEntry.status !== "completed") {
        body += `<p><em>Status: ${callEntry.status}</em></p>`;
      }

      if (callEntry.summary) {
        body += `<hr/><p><strong>Summary:</strong></p><p>${callEntry.summary}</p>`;
      }

      if (callEntry.keyPoints && callEntry.keyPoints.length > 0) {
        body += "<p><strong>Key Points:</strong></p><ul>";
        for (const point of callEntry.keyPoints) {
          body += `<li>${point}</li>`;
        }
        body += "</ul>";
      }

      if (callEntry.actionItems && callEntry.actionItems.length > 0) {
        body += "<p><strong>Action Items:</strong></p><ul>";
        for (const item of callEntry.actionItems) {
          const priorityEmoji =
            item.priority === "high"
              ? "🔴"
              : item.priority === "low"
                ? "🟢"
                : "🟡";
          body += `<li>${priorityEmoji} <strong>${item.title}</strong>`;
          if (item.description) body += `: ${item.description}`;
          if (item.dueDate) body += ` (Due: ${item.dueDate})`;
          body += "</li>";
        }
        body += "</ul>";
      }

      if (callEntry.sentiment) {
        const sentimentEmoji =
          callEntry.sentiment === "positive"
            ? "😊"
            : callEntry.sentiment === "negative"
              ? "😞"
              : callEntry.sentiment === "mixed"
                ? "😐"
                : "😶";
        body += `<p><strong>Sentiment:</strong> ${sentimentEmoji} ${callEntry.sentiment}</p>`;
      }

      if (callEntry.notes) {
        body += `<hr/><p><strong>Notes:</strong></p><p>${callEntry.notes}</p>`;
      }

      if (callEntry.recordingUrl) {
        body += `<p><a href="${callEntry.recordingUrl}" target="_blank">🎙️ Listen to Recording</a></p>`;
      }

      // Post as internal note using message_post
      const messageId = await this.client.callMethodOnIds<number>(
        model,
        [resId],
        "message_post",
        [],
        {
          body,
          message_type: "comment",
          subtype_xmlid: "mail.mt_note",
        }
      );

      return typeof messageId === "number" ? messageId : null;
    } catch (error) {
      console.error("Error posting message:", error);
      return null;
    }
  }

  // ===========================================================================
  // Main Call Logging Function
  // ===========================================================================

  /**
   * Logs a call to Odoo CRM with full relationship linking
   */
  async logCallToCrm(
    callEntry: CallLogEntry,
    options: {
      createPartnerIfNotFound?: boolean;
      createLeadIfNoOpen?: boolean;
      createActivity?: boolean;
      postMessage?: boolean;
      preferLeadOverPartner?: boolean;
    } = {}
  ): Promise<CrmLogResult> {
    const {
      createPartnerIfNotFound = false,
      createLeadIfNoOpen = false,
      createActivity = true,
      postMessage = true,
      preferLeadOverPartner = true,
    } = options;

    try {
      // 1. Find or create partner
      const isInbound = callEntry.direction === "inbound";
      const phoneNumber = isInbound ? callEntry.callerId : callEntry.recipientId;

      let partnerResult: PartnerLinkResult = { found: false };

      if (phoneNumber) {
        partnerResult = await this.findPartnerByPhone(phoneNumber);
      }

      if (!partnerResult.found && createPartnerIfNotFound) {
        partnerResult = await this.createPartnerFromCall(callEntry);
      }

      // 2. Find or create lead
      let leadId: number | undefined;
      let leads: CrmLead[] = [];

      if (partnerResult.found && partnerResult.partnerId) {
        leads = await this.findOpenLeadsForPartner(partnerResult.partnerId);
        if (leads.length > 0) {
          leadId = leads[0].id;
        }
      }

      if (!leadId && createLeadIfNoOpen) {
        const newLeadId = await this.createLeadFromCall(
          callEntry,
          partnerResult.partnerId
        );
        if (newLeadId) {
          leadId = newLeadId;
        }
      }

      // 3. Determine where to log (lead or partner)
      let targetModel: string;
      let targetId: number;

      if (preferLeadOverPartner && leadId) {
        targetModel = "crm.lead";
        targetId = leadId;
      } else if (partnerResult.found && partnerResult.partnerId) {
        targetModel = "res.partner";
        targetId = partnerResult.partnerId;
      } else {
        return {
          success: false,
          error: "No partner or lead found to log the call",
          errorCode: "NO_TARGET_FOUND",
        };
      }

      // 4. Create activity if requested
      let activityId: number | undefined;
      if (createActivity) {
        const actId = await this.createActivity(
          targetModel,
          targetId,
          callEntry
        );
        if (actId) {
          activityId = actId;
          // Mark the activity as done since the call already happened
          await this.markActivityDone(actId, "Call logged automatically");
        }
      }

      // 5. Post message if requested
      let messageId: number | undefined;
      if (postMessage) {
        const msgId = await this.postMessage(targetModel, targetId, callEntry);
        if (msgId) {
          messageId = msgId;
        }
      }

      return {
        success: true,
        partnerId: partnerResult.partnerId,
        leadId,
        activityId,
        messageId,
        details: {
          partnerName: partnerResult.partnerName,
          leadName: leads.length > 0 ? leads[0].name : undefined,
          activitySummary: activityId
            ? `${callEntry.direction} call activity created`
            : undefined,
          messagePreview: messageId
            ? callEntry.summary?.substring(0, 100)
            : undefined,
        },
      };
    } catch (error) {
      console.error("Error logging call to CRM:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error during CRM logging",
        errorCode: "LOGGING_FAILED",
      };
    }
  }

  /**
   * Bulk log multiple calls to CRM
   */
  async bulkLogCallsToCrm(
    callEntries: CallLogEntry[],
    options: {
      createPartnerIfNotFound?: boolean;
      createLeadIfNoOpen?: boolean;
      createActivity?: boolean;
      postMessage?: boolean;
      preferLeadOverPartner?: boolean;
    } = {}
  ): Promise<{ results: CrmLogResult[]; successCount: number; failureCount: number }> {
    const results: CrmLogResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const entry of callEntries) {
      const result = await this.logCallToCrm(entry, options);
      results.push(result);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return { results, successCount, failureCount };
  }

  /**
   * Clears the activity type cache
   */
  clearCache(): void {
    this.activityTypeCache.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a new CRM Call Logging service instance
 */
export function createCrmCallLoggingService(
  client: OdooClient
): OdooCrmCallLoggingService {
  return new OdooCrmCallLoggingService(client);
}
