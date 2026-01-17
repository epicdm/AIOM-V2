import { FileText, Receipt, Link2, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import type { UnmatchedExpenseRequest, UnmatchedVoucher } from "~/data-access/expense-reconciliation";

interface UnmatchedRequestCardProps {
  data: UnmatchedExpenseRequest;
  onLink?: (data: UnmatchedExpenseRequest) => void;
}

export function UnmatchedRequestCard({ data, onLink }: UnmatchedRequestCardProps) {
  const { expenseRequest, suggestedVouchers } = data;

  const formatCurrency = (amount: string, currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      CAD: "C$",
      AUD: "A$",
    };
    return `${symbols[currency] || currency}${parseFloat(amount).toLocaleString()}`;
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`unmatched-request-${expenseRequest.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{expenseRequest.purpose}</span>
                <Badge variant="outline" className="text-xs">
                  {expenseRequest.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Expense Request - No voucher linked
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => onLink?.(data)} data-testid="link-request-button">
            <Link2 className="h-4 w-4 mr-1" />
            Link Voucher
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={expenseRequest.requester.image || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(expenseRequest.requester.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{expenseRequest.requester.name}</span>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              {formatCurrency(expenseRequest.amount, expenseRequest.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(expenseRequest.submittedAt)}
            </p>
          </div>
        </div>

        {expenseRequest.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {expenseRequest.description}
          </p>
        )}

        {suggestedVouchers.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Suggested matches ({suggestedVouchers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedVouchers.slice(0, 3).map((v) => (
                <Badge key={v.id} variant="secondary" className="text-xs">
                  {v.voucherNumber} - {formatCurrency(v.amount, v.currency)}
                </Badge>
              ))}
              {suggestedVouchers.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{suggestedVouchers.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UnmatchedVoucherCardProps {
  data: UnmatchedVoucher;
  onLink?: (data: UnmatchedVoucher) => void;
}

export function UnmatchedVoucherCard({ data, onLink }: UnmatchedVoucherCardProps) {
  const { expenseVoucher, suggestedRequests } = data;

  const formatCurrency = (amount: string, currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      CAD: "C$",
      AUD: "A$",
    };
    return `${symbols[currency] || currency}${parseFloat(amount).toLocaleString()}`;
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`unmatched-voucher-${expenseVoucher.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Receipt className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-primary">
                  {expenseVoucher.voucherNumber}
                </span>
                <Badge variant="outline" className="text-xs">
                  {expenseVoucher.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Expense Voucher - No request linked
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => onLink?.(data)} data-testid="link-voucher-button">
            <Link2 className="h-4 w-4 mr-1" />
            Link Request
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={expenseVoucher.submitter.image || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(expenseVoucher.submitter.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{expenseVoucher.submitter.name}</span>
          </div>
          <div className="text-right">
            <p className="font-semibold">
              {formatCurrency(expenseVoucher.amount, expenseVoucher.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(expenseVoucher.createdAt)}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {expenseVoucher.description}
        </p>

        {expenseVoucher.vendorName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Vendor: {expenseVoucher.vendorName}</span>
          </div>
        )}

        {suggestedRequests.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Suggested matches ({suggestedRequests.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedRequests.slice(0, 3).map((r) => (
                <Badge key={r.id} variant="secondary" className="text-xs">
                  {r.purpose.slice(0, 20)}... - {formatCurrency(r.amount, r.currency)}
                </Badge>
              ))}
              {suggestedRequests.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{suggestedRequests.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
