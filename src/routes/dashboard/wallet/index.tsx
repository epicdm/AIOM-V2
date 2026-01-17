/**
 * Wallet Dashboard Route
 *
 * Main wallet page showing balance, quick actions, and recent transactions.
 */

import { createFileRoute } from "@tanstack/react-router";
import { WalletDashboard } from "~/components/wallet";

export const Route = createFileRoute("/dashboard/wallet/")({
  component: WalletPage,
});

function WalletPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Wallet</h1>
          <p className="text-muted-foreground mt-2">
            Manage your balance and transactions
          </p>
        </div>

        {/* Wallet Dashboard Component */}
        <WalletDashboard />
      </div>
    </div>
  );
}
