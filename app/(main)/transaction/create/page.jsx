import { getUserAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/data/categories";
import { AddTransactionForm } from "../_components/transaction-form";
import { getTransaction } from "@/actions/transaction";

export default async function AddTransactionPage({ searchParams }) {
  // ✅ Await searchParams (Next.js 15/16 requirement)
  const params = await searchParams;

  let editId = null;
  if (params && typeof params.edit === "string" && params.edit.length > 0) {
    editId = params.edit;
  }

  let accounts = [];
  let initialData = null;
  let fetchErrors = [];

  // --- Fetch User Accounts ---
  try {
    accounts = await getUserAccounts();
  } catch (err) {
    console.error("Error fetching user accounts in AddTransactionPage:", err);
    fetchErrors.push({
      where: "getUserAccounts",
      message: err?.message || String(err),
    });
  }

  // --- Fetch Transaction if edit mode ---
  if (editId) {
    try {
      const transaction = await getTransaction(editId);
      initialData = transaction;
    } catch (err) {
      console.error(
        `Error fetching transaction id=${editId} in AddTransactionPage:`,
        err
      );
      fetchErrors.push({
        where: "getTransaction",
        id: editId,
        message: err?.message || String(err),
      });
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title">Add Transaction</h1>
      </div>

      {fetchErrors.length > 0 && (
        <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
          <strong>Notice:</strong> Some data couldn&rsquo;t be loaded. Check server
          logs for details.
          <ul className="mt-2 list-disc ml-5">
            {fetchErrors.map((e, i) => (
              <li key={i}>
                {e.where}
                {e.id ? ` (id=${e.id})` : ""}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        editMode={!!editId}
        initialData={initialData}
      />
    </div>
  );
}
