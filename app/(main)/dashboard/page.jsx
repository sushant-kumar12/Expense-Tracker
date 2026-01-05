// app/dashboard/page.jsx

"use client";

import { useState, useEffect } from "react";
import { getUserAccounts, getDashboardData } from "@/actions/dashboard";
import { getCurrentBudget } from "@/actions/budget";
import { AccountCard } from "./_components/account-card";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { BudgetProgress } from "./_components/budget-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DashboardOverview } from "./_components/transaction-overview";

// ==================== DASHBOARD PAGE ====================
export default function DashboardPage() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [accountsData, transactionsData] = await Promise.all([
          getUserAccounts(),
          getDashboardData(),
        ]);

        setAccounts(accountsData || []);
        setTransactions(transactionsData || []);

        const defaultAccount = accountsData?.find(a => a.isDefault);
        if (defaultAccount) {
          const budget = await getCurrentBudget(defaultAccount.id);
          setBudgetData(budget);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data");
      }
    }

    loadInitialData();
  }, []);

  return (
    <div className="space-y-8">
      <BudgetProgress
        initialBudget={budgetData?.budget}
        currentExpenses={budgetData?.currentExpenses || 0}
      />

      {error && (
        <Card>
          <CardContent className="py-4 text-red-600 text-center">
            {error}
          </CardContent>
        </Card>
      )}

      <DashboardOverview
        accounts={accounts}
        transactions={transactions || []}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="border-dashed cursor-pointer">
            <CardContent className="flex flex-col items-center pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p>Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>

        {accounts.map(account => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
