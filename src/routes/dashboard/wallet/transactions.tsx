/**
 * Transaction History Route
 *
 * Full transaction history page with filtering and pagination.
 */

import { createFileRoute } from "@tanstack/react-router";
import { TransactionHistoryPage } from "~/components/wallet";

export const Route = createFileRoute("/dashboard/wallet/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <TransactionHistoryPage />
    </div>
  );
}
