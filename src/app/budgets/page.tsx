"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import {
  Target,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  X,
  Trash2,
  BellRing,
} from "lucide-react";

function BudgetsContent() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    period: "MONTHLY",
    limitAmount: "",
    alertThreshold: 0.8,
  });

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/v1/budgets"),
        fetch("/api/v1/categories"),
      ]);
      if (bRes.ok) setBudgets((await bRes.json()).data);
      if (cRes.ok) setCategories((await cRes.json()).data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          limitAmount: parseFloat(formData.limitAmount),
          categoryId: formData.categoryId || null,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setFormData({
          name: "",
          categoryId: "",
          period: "MONTHLY",
          limitAmount: "",
          alertThreshold: 0.8,
        });
        fetchBudgets();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to create budget");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    try {
      const res = await fetch(`/api/v1/budgets/${id}`, { method: "DELETE" });
      if (res.ok) fetchBudgets();
    } catch (err) {
      console.error(err);
    }
  };

  const currency = user?.defaultCurrency || "USD";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Budgets &amp; Limits</h1>
          <p className="text-sm text-slate-500">
            Real-time spending limit tracking with predictive period-end run rate projections
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Budget</span>
        </button>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {b.categoryName}
                </span>

                <div className="flex items-center gap-1.5">
                  {b.isOverspent ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      <XCircle className="w-3 h-3" /> Overspent
                    </span>
                  ) : b.isNearLimit ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Warning ({b.alertThresholdPercent}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> On Track
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteBudget(b.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                    title="Delete budget"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-base text-slate-900">{b.name}</h3>
              <p className="text-xs text-slate-400 capitalize">{b.period.toLowerCase()} period</p>

              <div className="mt-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {b.currency} {b.spentAmount}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    of {b.currency} {b.limitAmount}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      b.isOverspent
                        ? "bg-rose-500"
                        : b.isNearLimit
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>{b.percentageUsed}% consumed</span>
                  <span className="font-medium">
                    {parseFloat(b.remainingAmount) >= 0 ? `${b.currency} ${b.remainingAmount} left` : "Exceeded limit"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 bg-slate-50/60 -mx-6 -mb-6 p-4 rounded-b-2xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Projected Month-End:</span>
              </div>
              <span className="font-semibold text-slate-900">
                {b.currency} {b.projectedPeriodEnd}
              </span>
            </div>
          </div>
        ))}

        {budgets.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <Target className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-700">No active budgets yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Set spending limits for categories such as Dining Out, Groceries, or an overall monthly limit to receive alerts.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Budget</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Budget Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Create New Budget</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBudget} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Budget Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Grocery Limit"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Scope</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="">Overall Total Spending</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Period Limit Amount ({currency})</label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="400"
                  value={formData.limitAmount}
                  onChange={(e) => setFormData({ ...formData, limitAmount: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Alert Warning Threshold: {Math.round(formData.alertThreshold * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                >
                  Create Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  return (
    <AuthProvider>
      <AppShell>
        <BudgetsContent />
      </AppShell>
    </AuthProvider>
  );
}
