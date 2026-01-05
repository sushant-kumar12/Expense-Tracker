'use server';

import { db } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

// Helper function to convert Prisma Decimal to JSON-serializable number
const serializeDecimal = (obj) => {
  const serialized = { ...obj };

  if (obj.balance !== undefined && obj.balance !== null) {
    serialized.balance = Number(obj.balance);
  }

  if (obj.amount !== undefined && obj.amount !== null) {
    serialized.amount = Number(obj.amount);
  }

  return serialized;
};

// Get account with all transactions
export async function getAccountWithTransactions(accountId) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error('User not found');

  const account = await db.account.findFirst({
    where: {
      id: accountId,
      userId: user.id,
    },
    include: {
      transactions: {
        orderBy: { date: 'desc' },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!account) return null;

  return {
    ...serializeDecimal(account),
    transactions: account.transactions.map(serializeDecimal),
  };
}

// Bulk delete transactions
export async function bulkDeleteTransactions(transactionIds) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error('User not found');

    // Get transactions to calculate balance changes
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: user.id,
      },
    });

    // Group transactions by account to update balances
    const accountBalanceChanges = transactions.reduce((acc, transaction) => {
      const change =
        transaction.type === 'EXPENSE'
          ? transaction.amount
          : -transaction.amount;
      acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
      return acc;
    }, {});

    // Delete transactions and update account balances in a transaction
    await db.$transaction(async (tx) => {
      // Delete transactions
      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
        },
      });

      // Update account balances
      for (const [accountId, balanceChange] of Object.entries(
        accountBalanceChanges
      )) {
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }
    });

    revalidatePath('/dashboard');
    revalidatePath('/account/[id]');

    return { success: true };
  } catch (error) {
    console.error('Error bulk deleting transactions:', error);
    return { success: false, error: error.message };
  }
}

// Update default account
export async function updateDefaultAccount(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // First, unset any existing default account
    await db.account.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Then set the new default account
    const account = await db.account.update({
      where: {
        id: accountId,
        userId: user.id,
      },
      data: { isDefault: true },
    });

    revalidatePath('/dashboard');
    return { success: true, data: serializeDecimal(account) };
  } catch (error) {
    console.error('Error updating default account:', error);
    return { success: false, error: error.message };
  }
}

// Get all accounts for user
export async function getAccounts() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error('User not found');

    const accounts = await db.account.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      data: accounts.map(serializeDecimal),
    };
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Create new account
export async function createAccount(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error('User not found');

    // If this is the first account, make it default
    const existingAccounts = await db.account.count({
      where: { userId: user.id },
    });

    const account = await db.account.create({
      data: {
        ...data,
        userId: user.id,
        isDefault: existingAccounts === 0,
      },
    });

    revalidatePath('/dashboard');

    return {
      success: true,
      data: serializeDecimal(account),
      message: 'Account created successfully',
    };
  } catch (error) {
    console.error('Error creating account:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Update account
export async function updateAccount(accountId, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error('User not found');

    const account = await db.account.update({
      where: {
        id: accountId,
        userId: user.id,
      },
      data: {
        name: data.name,
        type: data.type,
        balance: data.balance,
      },
    });

    revalidatePath('/dashboard');

    return {
      success: true,
      data: serializeDecimal(account),
      message: 'Account updated successfully',
    };
  } catch (error) {
    console.error('Error updating account:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Delete account
export async function deleteAccount(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error('User not found');

    // Check if this is the default account
    const account = await db.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
    });

    if (!account) {
      return {
        success: false,
        error: 'Account not found',
      };
    }

    if (account.isDefault) {
      return {
        success: false,
        error: 'Cannot delete the default account. Set another account as default first.',
      };
    }

    // Check if account has transactions
    const transactionCount = await db.transaction.count({
      where: { accountId },
    });

    if (transactionCount > 0) {
      return {
        success: false,
        error: 'Cannot delete account with transactions. Delete transactions first.',
      };
    }

    await db.account.delete({
      where: { id: accountId },
    });

    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting account:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}