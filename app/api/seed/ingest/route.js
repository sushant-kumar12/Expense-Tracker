// app/api/inngest/route.ts

import { serve } from "inngest/next";
import { inngest } from "@/lib/ingest/client";
import {
  checkBudgetAlerts,
  generateMonthlyReports,
  processRecurringTransaction,
  triggerRecurringTransactions,
  cleanupOldData,
} from "@/lib/ingest/function";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processRecurringTransaction,
    triggerRecurringTransactions,
    generateMonthlyReports,
    checkBudgetAlerts,
    cleanupOldData,
    processRecurringTransaction,
  ],
});

