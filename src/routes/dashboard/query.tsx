/**
 * Natural Language Query Page
 * Dashboard route for the chat-style business operations query interface
 */

import { createFileRoute } from "@tanstack/react-router";
import { NaturalLanguageQueryView } from "~/components/NaturalLanguageQueryView";

export const Route = createFileRoute("/dashboard/query")({
  component: QueryPage,
});

function QueryPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 h-[calc(100vh-3.5rem)]">
      <NaturalLanguageQueryView className="h-full" />
    </div>
  );
}
