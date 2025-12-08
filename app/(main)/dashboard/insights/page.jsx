import { auth } from '@clerk/nextjs/server';
import { InsightsGenerator } from '@/app/(main)/transaction/_components/InsightsGenerator';
import { redirect } from 'next/navigation';
import { db } from '@/lib/prisma';

async function getMonthlyStats(userId, date) {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return transactions.reduce(
    (stats, t) => {
      const amount = t.amount.toNumber();
      if (t.type === 'EXPENSE') {
        stats.totalExpenses += amount;
        stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + amount;
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    {
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {},
    }
  );
}

export default async function InsightsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const currentDate = new Date();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const stats = await getMonthlyStats(userId, currentDate);

  return (
    <div className="container mx-auto py-10">
      <InsightsGenerator
        userId={userId}
        transactionData={{
          month: monthName,
          year,
          totalIncome: stats.totalIncome,
          totalExpenses: stats.totalExpenses,
          categories: stats.byCategory,
        }}
      />
    </div>
  );
}
