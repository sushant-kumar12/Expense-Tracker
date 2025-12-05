"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { cn } from "@/lib/utils";
import { createTransaction, updateTransaction } from "@/actions/transaction";
import { transactionSchema } from "@/app/lib/schema";
import ReceiptScanner from "./receipt-scanner";

export function AddTransactionForm({
  accounts,
  categories,
  editMode = false,
  initialData = null,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
    trigger,
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues:
      editMode && initialData
        ? {
            type: initialData.type,
            amount: initialData.amount.toString(),
            description: initialData.description,
            accountId: initialData.accountId,
            category: initialData.category ?? "",
            date: new Date(initialData.date),
            isRecurring: initialData.isRecurring,
            ...(initialData.recurringInterval && {
              recurringInterval: initialData.recurringInterval,
            }),
          }
        : {
            type: "EXPENSE",
            amount: "",
            description: "",
            accountId: accounts.find((ac) => ac.isDefault)?.id ?? (accounts[0]?.id ?? ""),
            category: "",
            date: new Date(),
            isRecurring: false,
          },
  });

  const {
    loading: transactionLoading,
    fn: transactionFn,
    data: transactionResult,
  } = useFetch(editMode ? updateTransaction : createTransaction);

  useEffect(() => {
    if (transactionResult?.success && !transactionLoading) {
      toast.success(
        editMode
          ? "Transaction updated successfully"
          : "Transaction created successfully"
      );
      reset();
      router.push(`/account/${transactionResult.data.accountId}`);
    }
  }, [transactionResult, transactionLoading, editMode, reset, router]);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  const type = watch("type");
  const isRecurring = watch("isRecurring");
  const date = watch("date");
  const watchedAccountId = watch("accountId");
  const watchedCategory = watch("category");

  // Map parsed category text to category ID
  const mapParsedCategoryToId = (catStr, targetType = null) => {
    if (!catStr) return null;
    const s = String(catStr).trim().toLowerCase();

    // 1) exact name match
    let matched = categories.find((c) => c.name && c.name.toLowerCase() === s);
    if (matched) return matched.id;

    // 2) contains match
    matched = categories.find(
      (c) =>
        (c.name && c.name.toLowerCase().includes(s)) ||
        (s.includes((c.name || "").toLowerCase()))
    );
    if (matched) return matched.id;

    // 3) heuristics
    const heuristics = {
      grocery: ["groc", "super", "market", "store"],
      food: ["restaurant", "cafe", "dine", "pizza", "burger", "food", "bistro"],
      transport: ["uber", "ola", "taxi", "bus", "metro", "train", "transport"],
      fuel: ["petrol", "diesel", "fuel", "gas station", "shell", "bp"],
      salary: ["salary", "payroll", "pay"],
      shopping: ["amazon", "flipkart", "myntra", "shop", "shopping", "store"],
      bills: ["electric", "water", "internet", "bill", "utility"],
      health: ["pharmacy", "hospital", "clinic", "medic", "doctor"],
      entertainment: ["cinema", "movie", "theatre", "netflix", "prime", "theater"],
      uncategorized: ["uncategorized", "uncat", "misc", "others", "other"],
    };

    for (const [key, kws] of Object.entries(heuristics)) {
      if (kws.some((kw) => s.includes(kw))) {
        const candidate = categories.find((c) =>
          (c.name || "").toLowerCase().includes(key) ||
          kws.some((kw) => (c.name || "").toLowerCase().includes(kw))
        );
        if (candidate) return candidate.id;
      }
    }

    // 4) fallback to first category matching type
    if (targetType) {
      const firstOfType = categories.find((c) => c.type === targetType);
      if (firstOfType) return firstOfType.id;
    }

    // 5) fallback to uncategorized or first
    const unc = categories.find((c) => {
      const n = (c.name || "").toLowerCase();
      return n === "uncategorized" || n === "uncat" || n.includes("uncategor");
    });
    if (unc) return unc.id;

    return categories[0]?.id ?? null;
  };

  const filteredCategories = categories.filter((category) => category.type === type);

  // Apply parsed receipt data to form
function applyParsedToForm(parsed) {
  if (!parsed || typeof parsed !== "object") {
    console.warn("Invalid parsed data:", parsed);
    return;
  }

  // Reject placeholder/fallback data
  if (!parsed.amount && !parsed.merchantName && !parsed.description) {
    console.warn("⚠️ No real data extracted from receipt. Please try a clearer image.");
    toast.error("Receipt image not readable. Try with better lighting.");
    return;
  }

  console.log("🔍 Applying parsed data to form:", parsed);


    // AMOUNT - only if empty
    try {
      const currentAmount = getValues("amount");
      if ((!currentAmount || currentAmount === "") && parsed.amount != null) {
        const amt =
          typeof parsed.amount === "number"
            ? String(parsed.amount)
            : String(parsed.amount).replace(/[^\d.-]/g, "");
        
        if (amt && amt !== "0" && amt !== "null") {
          setValue("amount", amt, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          console.log("✅ Amount set to:", amt);
        }
      }
    } catch (e) {
      console.warn("Amount error:", e);
    }

    // DESCRIPTION/MERCHANT - only if empty
    try {
      const currentDesc = getValues("description");
      const descVal =
        parsed.description ||
        parsed.merchantName ||
        parsed.merchant ||
        parsed.vendor ||
        parsed.name ||
        parsed.store ||
        null;

      if (
        (!currentDesc || currentDesc === "") &&
        descVal &&
        String(descVal).toLowerCase() !== "receipt parsed"
      ) {
        setValue("description", String(descVal), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        console.log("✅ Description set to:", descVal);
      }
    } catch (e) {
      console.warn("Description error:", e);
    }

    // DATE - only if empty
    try {
      const currentDate = getValues("date");
      if ((!currentDate || currentDate === "") && parsed.date) {
        let d = parsed.date;

        if (typeof d === "string") {
          const parsedDate = new Date(d);
          if (!isNaN(parsedDate.getTime())) {
            d = parsedDate;
          } else {
            const iso = d.match(/\d{4}-\d{2}-\d{2}/);
            if (iso) {
              d = new Date(iso[0]);
            } else {
              const alt = d.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
              if (alt) {
                const day = parseInt(alt[1], 10);
                const month = parseInt(alt[2], 10) - 1;
                const year = parseInt(alt[3], 10);
                d = new Date(year, month, day);
              }
            }
          }
        }

        if (d instanceof Date && !isNaN(d.getTime())) {
          setValue("date", d, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          console.log("✅ Date set to:", d);
        }
      }
    } catch (e) {
      console.warn("Date error:", e);
    }

    // CATEGORY - only if empty
    try {
      const currentCat = getValues("category");
      if (!currentCat || currentCat === "") {
        let chosenCategoryId = null;

        // Try to match from parsed category field
        if (parsed.category && String(parsed.category).toLowerCase() !== "uncategorized") {
          chosenCategoryId = mapParsedCategoryToId(parsed.category, getValues("type"));
        }

        // If not found, try merchant/description
        if (!chosenCategoryId) {
          const textSource = (
            parsed.merchantName ||
            parsed.description ||
            parsed.merchant ||
            parsed.vendor ||
            parsed.name ||
            ""
          ).toString();

          if (textSource && textSource !== "Receipt parsed") {
            chosenCategoryId = mapParsedCategoryToId(textSource, getValues("type"));
          }
        }

        // Final fallback
        if (!chosenCategoryId) {
          chosenCategoryId = mapParsedCategoryToId("uncategorized", getValues("type"));
        }

        if (chosenCategoryId) {
          setValue("category", chosenCategoryId, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          console.log("✅ Category set to:", chosenCategoryId);
        }
      }
    } catch (e) {
      console.warn("Category error:", e);
    }

    // Re-validate
    try {
      trigger(["amount", "description", "date", "category"]);
    } catch (e) {
      console.warn("Trigger error:", e);
    }
  }

  // Handle receipt parsed callback
  function handleParsed(parsed) {
    console.log("📸 Receipt scanned successfully:", parsed);
    setParsedData(parsed);
    applyParsedToForm(parsed);
    toast.success("Receipt scanned! Fields auto-filled where possible.");
  }

  function handleParsedError(errMsg) {
    console.error("❌ Receipt parse error:", errMsg);
    toast.error(errMsg || "Failed to scan receipt");
  }

  function resetParsed() {
    setParsedData(null);
  }

  const onSubmit = (data) => {
    const formData = {
      ...data,
      amount: parseFloat(data.amount),
    };

    if (editMode) {
      transactionFn(editId, formData);
    } else {
      transactionFn(formData);
    }
  };

  return (
    <div>
      {/* Prominent Scan Receipt area at top */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">New Transaction</h3>
          <div className="text-sm text-muted-foreground">
            You can scan a receipt first to pre-fill fields, then complete the form and submit.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setScannerOpen((s) => !s)}>
            {scannerOpen ? "Close Scanner" : "Scan Receipt"}
          </Button>

          {parsedData && (
            <Button variant="ghost" onClick={resetParsed}>
              Clear parsed data
            </Button>
          )}
        </div>
      </div>

      {/* Scanner panel (collapsible) */}
      {scannerOpen && (
        <div className="mb-4 rounded-md border p-3 bg-muted/30">
          <ReceiptScanner onParsed={handleParsed} onError={handleParsedError} />
          <div className="mt-2 text-xs text-muted-foreground">
            After scanning, review populated fields below. Fields not parsed will remain empty — fill them manually.
          </div>
          {parsedData && (
            <pre className="mt-2 text-xs bg-white/5 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* The actual form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-full">
        {/* Type (controlled) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <Select value={type} onValueChange={(value) => setValue("type", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
        </div>

        {/* Amount and Account */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Account</label>
            <Select value={watchedAccountId ?? ""} onValueChange={(value) => setValue("accountId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (${parseFloat(account.balance).toFixed(2)})
                  </SelectItem>
                ))}
                <CreateAccountDrawer>
                  <Button variant="ghost" className="w-full">
                    Create Account
                  </Button>
                </CreateAccountDrawer>
              </SelectContent>
            </Select>
            {errors.accountId && <p className="text-sm text-red-500">{errors.accountId.message}</p>}
          </div>
        </div>

        {/* Category (controlled) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={watchedCategory ?? ""} onValueChange={(value) => setValue("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full pl-3 text-left font-normal", !date && "text-muted-foreground")}
              >
                {date ? format(date, "PPP") : <span>Pick a date</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => setValue("date", d)}
                disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Input placeholder="Enter description" {...register("description")} />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Recurring */}
        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <label className="text-base font-medium">Recurring Transaction</label>
            <div className="text-sm text-muted-foreground">
              Set up a recurring schedule for this transaction
            </div>
          </div>
          <Switch
            checked={isRecurring}
            onCheckedChange={(checked) => setValue("isRecurring", checked)}
          />
        </div>

        {isRecurring && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Recurring Interval</label>
            <Select
              value={getValues("recurringInterval") ?? ""}
              onValueChange={(value) => setValue("recurringInterval", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
            {errors.recurringInterval && (
              <p className="text-sm text-red-500">{errors.recurringInterval.message}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto sm:mr-2"
            onClick={() => router.back()}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center"
            disabled={transactionLoading}
          >
            {transactionLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editMode ? "Updating..." : "Creating..."}
              </>
            ) : editMode ? (
              "Update Transaction"
            ) : (
              "Create Transaction"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddTransactionForm;
