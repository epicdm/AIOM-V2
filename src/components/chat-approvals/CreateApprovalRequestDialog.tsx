import { useState } from "react";
import { Loader2, ClipboardCheck, DollarSign, Calendar, Package, FileText, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useCreateApprovalRequest } from "~/hooks/useChatApprovals";
import { cn } from "~/lib/utils";
import type { ChatApprovalType } from "~/db/schema";

interface CreateApprovalRequestDialogProps {
  conversationId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const approvalTypes: {
  value: ChatApprovalType;
  label: string;
  icon: typeof FileText;
  description: string;
}[] = [
  {
    value: "expense",
    label: "Expense",
    icon: DollarSign,
    description: "Request reimbursement for expenses",
  },
  {
    value: "time_off",
    label: "Time Off",
    icon: Calendar,
    description: "Request time off or leave",
  },
  {
    value: "purchase",
    label: "Purchase",
    icon: Package,
    description: "Request approval for a purchase",
  },
  {
    value: "document",
    label: "Document",
    icon: FileText,
    description: "Request approval for a document",
  },
  {
    value: "general",
    label: "General",
    icon: AlertCircle,
    description: "General approval request",
  },
];

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "PHP", label: "PHP - Philippine Peso" },
  { value: "JPY", label: "JPY - Japanese Yen" },
];

export function CreateApprovalRequestDialog({
  conversationId,
  trigger,
  onSuccess,
}: CreateApprovalRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<ChatApprovalType>("general");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");

  const createRequest = useCreateApprovalRequest();

  const showAmountField = approvalType === "expense" || approvalType === "purchase";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    try {
      await createRequest.mutateAsync({
        conversationId,
        approvalType,
        title: title.trim(),
        description: description.trim() || undefined,
        amount: showAmountField && amount.trim() ? amount.trim() : undefined,
        currency: showAmountField ? currency : undefined,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setAmount("");
      setCurrency("USD");
      setApprovalType("general");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAmount("");
    setCurrency("USD");
    setApprovalType("general");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="create-approval-request-button">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Request Approval
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Approval Request</DialogTitle>
            <DialogDescription>
              Send an approval request to the other person in this conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Approval Type */}
            <div className="space-y-2">
              <Label htmlFor="approval-type">Request Type</Label>
              <Select
                value={approvalType}
                onValueChange={(value) => setApprovalType(value as ChatApprovalType)}
              >
                <SelectTrigger id="approval-type">
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  {approvalTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {approvalTypes.find((t) => t.value === approvalType)?.description}
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Brief title for your request..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide additional details about your request..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={3}
              />
            </div>

            {/* Amount (conditional) */}
            {showAmountField && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((curr) => (
                        <SelectItem key={curr.value} value={curr.value}>
                          {curr.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createRequest.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createRequest.isPending || !title.trim()}
              data-testid="submit-approval-request-button"
            >
              {createRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
