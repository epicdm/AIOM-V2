/**
 * KYC Tier Configuration API Route
 *
 * Get available KYC tier configurations and their requirements.
 *
 * GET /api/kyc/tiers
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  getAllKycTierConfigs,
  initializeDefaultTierConfigs,
} from "~/data-access/kyc-verification";

export const Route = createFileRoute("/api/kyc/tiers")({
  server: {
    handlers: {
      /**
       * GET /api/kyc/tiers
       * Get all active KYC tier configurations
       */
      GET: async () => {
        try {
          // Initialize default configs if not already done
          await initializeDefaultTierConfigs();

          const tiers = await getAllKycTierConfigs();

          return Response.json({
            success: true,
            data: tiers.map((tier) => ({
              id: tier.id,
              tierLevel: tier.tierLevel,
              name: tier.name,
              description: tier.description,
              requiredDocuments: tier.requiredDocuments
                ? JSON.parse(tier.requiredDocuments)
                : [],
              limits: {
                daily: tier.dailyTransactionLimit,
                weekly: tier.weeklyTransactionLimit,
                monthly: tier.monthlyTransactionLimit,
                single: tier.singleTransactionLimit,
                annual: tier.annualTransactionLimit,
              },
              features: {
                canWithdraw: tier.canWithdraw,
                canDeposit: tier.canDeposit,
                canTransfer: tier.canTransfer,
                canTrade: tier.canTrade,
              },
              requirements: {
                phoneVerification: tier.requiresPhoneVerification,
                emailVerification: tier.requiresEmailVerification,
                addressVerification: tier.requiresAddressVerification,
                manualReview: tier.requiresManualReview,
              },
              validityDays: tier.validityDays,
              priority: tier.priority,
            })),
          });
        } catch (error) {
          console.error("Error fetching KYC tiers:", error);
          return Response.json(
            {
              success: false,
              error: "Failed to fetch tier configurations",
              message:
                error instanceof Error
                  ? error.message
                  : "An unexpected error occurred",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
