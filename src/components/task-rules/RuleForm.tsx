/**
 * RuleForm Component
 *
 * Form for creating and editing task auto-creation rules.
 * Supports trigger configuration, conditions, and task templates.
 */

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Plus, Trash2, Zap } from "lucide-react";
import type {
  TaskTemplateConfig,
  TaskRuleConditionsConfig,
  TaskRuleTriggerType,
  TaskRuleConditionOperator,
} from "~/data-access/task-auto-creation-rules";

// =============================================================================
// Schema
// =============================================================================

const conditionSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.enum([
    "equals",
    "not_equals",
    "greater_than",
    "less_than",
    "greater_than_or_equals",
    "less_than_or_equals",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
    "in",
    "not_in",
  ]),
  value: z.string(),
});

const ruleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  triggerType: z.enum([
    "new_customer",
    "overdue_invoice",
    "low_inventory",
    "expense_approved",
    "expense_rejected",
    "call_completed",
    "customer_inactive",
    "subscription_expiring",
    "manual",
    "scheduled",
    "custom",
  ]),
  conditionsLogic: z.enum(["and", "or"]).optional(),
  conditions: z.array(conditionSchema).optional(),
  taskTitle: z.string().min(1, "Task title is required"),
  taskDescription: z.string().optional(),
  taskPriority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueInDays: z.number().int().min(0).optional(),
  dueInHours: z.number().int().min(0).optional(),
  assigneeId: z.string().optional(),
  assigneeRole: z.string().optional(),
  cooldownMinutes: z.number().int().min(0).optional(),
  maxTriggersPerDay: z.number().int().min(1).optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

type RuleFormData = z.infer<typeof ruleFormSchema>;

// =============================================================================
// Types
// =============================================================================

interface RuleFormProps {
  defaultValues?: Partial<RuleFormData>;
  onSubmit: (data: {
    name: string;
    description?: string;
    triggerType: TaskRuleTriggerType;
    conditions?: TaskRuleConditionsConfig;
    taskTemplate: TaskTemplateConfig;
    cooldownMinutes?: number;
    maxTriggersPerDay?: number;
    priority?: number;
  }) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TRIGGER_TYPES: { value: TaskRuleTriggerType; label: string; description: string }[] = [
  { value: "new_customer", label: "New Customer", description: "Triggered when a new customer is created" },
  { value: "overdue_invoice", label: "Overdue Invoice", description: "Triggered when an invoice becomes overdue" },
  { value: "low_inventory", label: "Low Inventory", description: "Triggered when inventory falls below threshold" },
  { value: "expense_approved", label: "Expense Approved", description: "Triggered when an expense is approved" },
  { value: "expense_rejected", label: "Expense Rejected", description: "Triggered when an expense is rejected" },
  { value: "call_completed", label: "Call Completed", description: "Triggered when a call is completed" },
  { value: "customer_inactive", label: "Customer Inactive", description: "Triggered when a customer becomes inactive" },
  { value: "subscription_expiring", label: "Subscription Expiring", description: "Triggered when a subscription is about to expire" },
  { value: "manual", label: "Manual", description: "Triggered manually by user action" },
  { value: "scheduled", label: "Scheduled", description: "Triggered on a schedule" },
  { value: "custom", label: "Custom", description: "Custom trigger type" },
];

const OPERATORS: { value: TaskRuleConditionOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "greater_than_or_equals", label: "Greater or Equal" },
  { value: "less_than_or_equals", label: "Less or Equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
  { value: "in", label: "In List" },
  { value: "not_in", label: "Not In List" },
];

// =============================================================================
// Component
// =============================================================================

export function RuleForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Create Rule",
}: RuleFormProps) {
  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      triggerType: defaultValues?.triggerType || "manual",
      conditionsLogic: defaultValues?.conditionsLogic || "and",
      conditions: defaultValues?.conditions || [],
      taskTitle: defaultValues?.taskTitle || "",
      taskDescription: defaultValues?.taskDescription || "",
      taskPriority: defaultValues?.taskPriority || "medium",
      dueInDays: defaultValues?.dueInDays,
      dueInHours: defaultValues?.dueInHours,
      assigneeId: defaultValues?.assigneeId || "",
      assigneeRole: defaultValues?.assigneeRole || "",
      cooldownMinutes: defaultValues?.cooldownMinutes || 0,
      maxTriggersPerDay: defaultValues?.maxTriggersPerDay,
      priority: defaultValues?.priority || 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  const handleSubmit = (data: RuleFormData) => {
    const taskTemplate: TaskTemplateConfig = {
      title: data.taskTitle,
      description: data.taskDescription,
      priority: data.taskPriority,
      dueInDays: data.dueInDays,
      dueInHours: data.dueInHours,
      assigneeId: data.assigneeId || undefined,
      assigneeRole: data.assigneeRole || undefined,
    };

    const conditions: TaskRuleConditionsConfig | undefined =
      data.conditions && data.conditions.length > 0
        ? {
            conditions: data.conditions.map((c) => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
            })),
            logic: data.conditionsLogic || "and",
          }
        : undefined;

    onSubmit({
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      conditions,
      taskTemplate,
      cooldownMinutes: data.cooldownMinutes,
      maxTriggersPerDay: data.maxTriggersPerDay,
      priority: data.priority,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Follow up on new customers" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this rule does..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triggerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trigger" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRIGGER_TYPES.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span>{trigger.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {TRIGGER_TYPES.find((t) => t.value === field.value)?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conditions (Optional)</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ field: "", operator: "equals", value: "" })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length > 0 && (
              <FormField
                control={form.control}
                name="conditionsLogic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="and">All conditions</SelectItem>
                        <SelectItem value="or">Any condition</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`conditions.${index}.field`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Field name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`conditions.${index}.operator`}
                  render={({ field }) => (
                    <FormItem className="w-40">
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`conditions.${index}.value`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Value" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="mt-0"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No conditions added. The rule will trigger for all events of this type.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Task Template */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="taskTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Follow up with {{customer.name}}"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use {"{{fieldName}}"} to insert dynamic values
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taskDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the task..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taskPriority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueInDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due In (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g., 3"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="User ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigneeRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee Role (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., sales" {...field} />
                    </FormControl>
                    <FormDescription>Assign to users with this role</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cooldownMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooldown (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>Minimum time between triggers</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxTriggersPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Triggers/Day</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Unlimited"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Leave empty for unlimited</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Priority</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>Higher = runs first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default RuleForm;
