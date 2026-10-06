"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import {
  PieChart as PieChartIcon,
  TrendingUp,
  Store,
  DollarSign,
  Calendar,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f43f5e",
  "#06b6d4",
  "#84cc16",
];

function AnalyticsContent() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/accounts")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setAccounts(res.data);
      });
  }, []);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const accParam = selectedAccountId ? `?accountId=${selectedAccountId}` : "";
        const [catRes, merRes, trendRes, sumRes] = await Promise.all([
          fetch(`/api/v1/analytics/categories${accParam}`),
          fetch(`/api/v1/analytics/merchants${accParam}`),
          fetch(`/api/v1/analytics/trends`),
          fetch(`/api/v1/analytics/summary${accParam}`),
        ]);

        if (catRes.ok) setCategories((await catRes.json()).data);
        if (merRes.ok) setMerchants((await merRes.json()).data);
        if (trendRes.ok) setTrends((await trendRes.json()).data);
        if (sumRes.ok) setSummary((await sumRes.json()).data);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [selectedAccountId]);

  const currency = summary?.reportingCurrency || user?.defaultCurrency || "USD";

  const chartData = categories.map((c) => ({
    name: c.categoryName,
    value: parseFloat(c.amount),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Spending Analytics</h1>
          <p className="text-sm text-slate-500">
            Evidence-grounded spending breakdowns, merchant patterns, and currency valuations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-sm"
          >
            <option value="">All Accounts Consolidated</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase">Settled Expenses</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {currency} {summary?.totalExpenses || "0.00"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Excludes transfers and refunds</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase">Top Category</span>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1 truncate">
            {categories[0]?.categoryName || "N/A"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {categories[0] ? `${currency} ${categories[0].amount} (${categories[0].percentage}%)` : "No data"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase">Top Merchant</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1 truncate">
            {merchants[0]?.merchant || "N/A"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {merchants[0] ? `${currency} ${merchants[0].amount} (${merchants[0].transactionCount} purchases)` : "No data"}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Spending by Category</h3>
            <span className="text-xs text-slate-400">{categories.length} categories</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${currency} ${Number(val).toFixed(2)}`, "Spent"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No expense records found.</p>
            )}
          </div>

          {/* Category List */}
          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pt-2">
            {categories.map((c, i) => (
              <div key={c.categoryId} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  ></span>
                  <span className="font-medium text-slate-800">{c.categoryName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{c.percentage}%</span>
                  <span className="font-bold text-slate-900">
                    {currency} {c.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Merchants Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Top Spending Merchants</h3>
            <span className="text-xs text-slate-400">Ranked by volume</span>
          </div>

          <div className="divide-y divide-slate-100">
            {merchants.map((m, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-bold text-slate-400 w-4">{idx + 1}.</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate capitalize">{m.merchant}</p>
                    <p className="text-[11px] text-slate-400">
                      {m.transactionCount} transaction{m.transactionCount > 1 ? "s" : ""} • avg {currency} {m.averageAmount}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-bold text-slate-900">
                    {currency} {m.amount}
                  </p>
                  <p className="text-[11px] text-slate-400">{m.percentage}% of spending</p>
                </div>
              </div>
            ))}

            {merchants.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center">No merchant expenses recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AuthProvider>
      <AppShell>
        <AnalyticsContent />
      </AppShell>
    </AuthProvider>
  );
}
