"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Tag,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  RotateCcw,
  Edit2,
  Trash2,
  X,
  Check,
} from "lucide-react";

function TransactionsContent() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);

  // Add Transaction Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({
    accountId: "",
    transactionDate: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    categoryId: "",
    status: "POSTED",
    notes: "",
  });

  // Edit / Recategorize Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [createRule, setCreateRule] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set("page", pagination.page.toString());
      query.set("limit", "25");
      if (search) query.set("search", search);
      if (selectedAccount) query.set("accountId", selectedAccount);
      if (selectedCategory) query.set("categoryId", selectedCategory);
      if (selectedStatus) query.set("status", selectedStatus);
      if (selectedType) query.set("type", selectedType);
      if (needsReviewOnly) query.set("needsReview", "true");

      const res = await fetch(`/api/v1/transactions?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data.transactions);
        setPagination(json.data.pagination);
      }
    } catch (e) {
      console.error("Error fetching transactions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load accounts and categories
    async function initMeta() {
      const [accRes, catRes] = await Promise.all([
        fetch("/api/v1/accounts"),
        fetch("/api/v1/categories"),
      ]);
      if (accRes.ok) setAccounts((await accRes.json()).data);
      if (catRes.ok) setCategories((await catRes.json()).data);
    }
    initMeta();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, search, selectedAccount, selectedCategory, selectedStatus, selectedType, needsReviewOnly]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTx,
          amount: parseFloat(newTx.amount),
        }),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setNewTx({
          accountId: accounts[0]?.id || "",
          transactionDate: new Date().toISOString().split("T")[0],
          description: "",
          amount: "",
          categoryId: "",
          status: "POSTED",
          notes: "",
        });
        fetchTransactions();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to create transaction");
      }
    } catch (err) {
      console.error("Create error:", err);
    }
  };

  const handleSaveRecategorize = async () => {
    if (!editingTx) return;
    try {
      const res = await fetch(`/api/v1/transactions/${editingTx.id}/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: editCategoryId,
          createRule,
        }),
      });

      if (res.ok) {
        setEditModalOpen(false);
        fetchTransactions();
      }
    } catch (err) {
      console.error("Recategorize error:", err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await fetch(`/api/v1/transactions/${id}`, { method: "DELETE" });
      if (res.ok) fetchTransactions();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleMarkAsTransfer = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/transactions/${id}/mark-transfer`, {
        method: "POST",
      });
      if (res.ok) fetchTransactions();
    } catch (err) {
      console.error("Transfer error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transaction Ledger</h1>
          <p className="text-sm text-slate-500">
            Canonical record of normalized financial movements with source provenance
          </p>
        </div>
        <button
          onClick={() => {
            if (accounts.length > 0 && !newTx.accountId) {
              setNewTx((prev) => ({ ...prev, accountId: accounts[0].id }));
            }
            setAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search payee, merchant, memo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Account */}
          <div>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="POSTED">Posted (Settled)</option>
              <option value="PENDING">Pending</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              <option value="PURCHASE">Purchase / Expense</option>
              <option value="INCOME">Income / Deposit</option>
              <option value="TRANSFER">Internal Transfer</option>
              <option value="REFUND">Refund</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={needsReviewOnly}
              onChange={(e) => setNeedsReviewOnly(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show transactions needing review only</span>
          </label>
          <span className="text-slate-400">
            Found {pagination.total} transaction{pagination.total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Description / Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const amountNum = parseFloat(tx.amount);
                const isExpense = amountNum < 0 && tx.type !== "TRANSFER";
                const isIncome = amountNum > 0 && tx.type !== "TRANSFER" && tx.type !== "REFUND";
                const isTransfer = tx.type === "TRANSFER";
                const isRefund = tx.type === "REFUND";

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                      {tx.date}
                    </td>

                    {/* Account */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {tx.accountName}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">
                        {tx.merchant || tx.description}
                      </div>
                      {tx.merchant && (
                        <div className="text-[11px] text-slate-400 truncate">{tx.description}</div>
                      )}
                      {tx.needsReview && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                          <AlertCircle className="w-3 h-3" /> Needs review
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.category ? (
                        <button
                          onClick={() => {
                            setEditingTx(tx);
                            setEditCategoryId(tx.category.id);
                            setEditModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-200/80 hover:bg-slate-100 transition-colors"
                          style={{
                            backgroundColor: `${tx.category.color}15`,
                            color: tx.category.color || "#475569",
                          }}
                        >
                          <Tag className="w-3 h-3" />
                          <span>{tx.category.name}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingTx(tx);
                            setEditCategoryId("");
                            setEditModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-500 hover:bg-slate-200 font-medium"
                        >
                          <span>Uncategorized</span>
                        </button>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                      {isExpense && (
                        <span className="text-rose-600">
                          {tx.currency} {Math.abs(amountNum).toFixed(2)}
                        </span>
                      )}
                      {isIncome && (
                        <span className="text-emerald-600">
                          +{tx.currency} {amountNum.toFixed(2)}
                        </span>
                      )}
                      {isTransfer && (
                        <span className="text-indigo-600 inline-flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3" />
                          {tx.currency} {Math.abs(amountNum).toFixed(2)}
                        </span>
                      )}
                      {isRefund && (
                        <span className="text-cyan-600 inline-flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          +{tx.currency} {amountNum.toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {tx.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-semibold">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-medium">
                          Posted
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => {
                          setEditingTx(tx);
                          setEditCategoryId(tx.category?.id || "");
                          setEditModalOpen(true);
                        }}
                        title="Edit / Recategorize"
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {tx.type !== "TRANSFER" && (
                        <button
                          onClick={() => handleMarkAsTransfer(tx.id)}
                          title="Mark as internal transfer"
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        title="Delete transaction"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {transactions.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions match your search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="space-x-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Record Manual Transaction</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Financial Account</label>
                <select
                  required
                  value={newTx.accountId}
                  onChange={(e) => setNewTx({ ...newTx, accountId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={newTx.transactionDate}
                  onChange={(e) => setNewTx({ ...newTx, transactionDate: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Amount (Negative for expense, positive for income)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="-45.50 or 3200.00"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Description / Payee</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Whole Foods Market"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Category (Optional)</label>
                <select
                  value={newTx.categoryId}
                  onChange={(e) => setNewTx({ ...newTx, categoryId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="">Auto-categorize with deterministic engine</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Status</label>
                <select
                  value={newTx.status}
                  onChange={(e) => setNewTx({ ...newTx, status: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="POSTED">Posted (Settled)</option>
                  <option value="PENDING">Pending (Holding)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recategorize & Rule Creation Modal */}
      {editModalOpen && editingTx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Categorize Transaction</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-slate-500 mb-1">Transaction:</p>
              <p className="font-semibold text-slate-800 text-sm">{editingTx.description}</p>
              <p className="text-slate-400 font-mono mt-0.5">
                {editingTx.currency} {editingTx.amount} on {editingTx.date}
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Select Category</label>
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-start gap-2 text-slate-600 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={createRule}
                onChange={(e) => setCreateRule(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                Always categorize future transactions from <strong>{editingTx.merchant || editingTx.description.substring(0, 15)}</strong> into this category.
              </span>
            </label>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecategorize}
                disabled={!editCategoryId}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40"
              >
                Apply Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <AuthProvider>
      <AppShell>
        <TransactionsContent />
      </AppShell>
    </AuthProvider>
  );
}
