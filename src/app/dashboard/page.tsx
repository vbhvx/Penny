"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Repeat,
  Sparkles,
  ShieldCheck,
  Calendar,
  Wallet,
  Clock,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function DashboardContent() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, trendRes, budRes, recRes, insRes, fcRes] = await Promise.all([
          fetch("/api/v1/analytics/summary"),
          fetch("/api/v1/analytics/trends"),
          fetch("/api/v1/budgets"),
          fetch("/api/v1/recurring-payments"),
          fetch("/api/v1/insights"),
          fetch("/api/v1/cash-flow/forecast?horizon=30"),
        ]);

        if (sumRes.ok) setSummary((await sumRes.json()).data);
        if (trendRes.ok) setTrends((await trendRes.json()).data);
        if (budRes.ok) setBudgets((await budRes.json()).data);
        if (recRes.ok) setRecurring((await recRes.json()).data);
        if (insRes.ok) setInsights((await insRes.json()).data.insights);
        if (fcRes.ok) setForecast((await fcRes.json()).data);
      } catch (e) {
        console.error("Dashboard data load error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Calculating authoritative financial metrics...</p>
        </div>
      </div>
    );
  }

  const currency = summary?.reportingCurrency || user?.defaultCurrency || "USD";

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Overview</h1>
          <p className="text-sm text-slate-500">
            Authoritative financial ledger &amp; evidence-backed metrics in {currency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/imports"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <span>Import Statement</span>
          </Link>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
          >
            <span>New Transaction</span>
          </Link>
        </div>
      </div>

      {/* Insights Alert Banner */}
      {insights && insights.length > 0 && (
        <div className="space-y-2">
          {insights.slice(0, 2).map((ins, i) => (
            <div
              key={i}
              className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-4 flex items-start gap-3.5 shadow-sm"
            >
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-0.5">
                  {ins.title}
                </h4>
                <p className="text-sm text-indigo-950/80 leading-relaxed">{ins.plainLanguageExplanation || ins.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Recorded Income</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              +{currency} {summary?.totalIncome || "0.00"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Excludes internal transfers</p>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Recorded Expenses</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
              -{currency} {summary?.totalExpenses || "0.00"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Settled consumer purchases &amp; fees</p>
          </div>
        </div>

        {/* Net Movement Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Net Cash Flow</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                parseFloat(summary?.netCashFlow || "0") >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {parseFloat(summary?.netCashFlow || "0") >= 0 ? "+" : ""}
              {currency} {summary?.netCashFlow || "0.00"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Net flow across active accounts</p>
          </div>
        </div>

        {/* Pending & Excluded Items Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pending &amp; Transfers</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Pending transactions:</span>
              <span className="font-semibold text-amber-700">
                {summary?.pendingTransactions?.count || 0} ({currency} {summary?.pendingTransactions?.totalAmount || "0.00"})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Internal transfers:</span>
              <span className="font-semibold text-slate-700">
                {summary?.transfersExcluded?.count || 0} excluded
              </span>
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5">Kept strictly separate from spending</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Spending Trends & Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Spending Trends (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Historical Cash Flow Trend</h3>
              <p className="text-xs text-slate-500">Monthly settled income vs expenses</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Reporting: {currency}</span>
          </div>

          <div className="h-64 w-full pt-4">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(value: any) => [`${currency} ${Number(value).toFixed(2)}`, ""]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No historical trend data available.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Budgets Progress */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Active Budgets</h3>
                <p className="text-xs text-slate-500">Tracking spending limits</p>
              </div>
              <Link href="/budgets" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Manage
              </Link>
            </div>

            <div className="space-y-4">
              {budgets.slice(0, 3).map((b) => (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{b.name}</span>
                    <span
                      className={`font-semibold ${
                        b.isOverspent
                          ? "text-rose-600"
                          : b.isNearLimit
                          ? "text-amber-600"
                          : "text-slate-600"
                      }`}
                    >
                      {currency} {b.spentAmount} / {b.limitAmount}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        b.isOverspent ? "bg-rose-500" : b.isNearLimit ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{b.percentageUsed}% consumed</span>
                    <span>{b.remainingAmount} remaining</span>
                  </div>
                </div>
              ))}

              {budgets.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No active budgets created yet.
                </p>
              )}
            </div>
          </div>

          <Link
            href="/budgets"
            className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 text-center flex items-center justify-center gap-1.5"
          >
            <span>View All Budgets &amp; Alerts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Bottom Grid: 30-Day Forecast & Upcoming Recurring Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forecast Card */}
        {forecast && (
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/40">
                    30-Day Estimate
                  </span>
                  <span className="text-xs text-slate-400">Deterministic Model</span>
                </div>
                <h3 className="font-bold text-lg text-white mt-1">Cash Flow Projection</h3>
              </div>
              <Link href="/forecast" className="text-xs text-indigo-300 hover:text-white font-medium flex items-center gap-1">
                Details <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="text-[11px] text-slate-400 block">Opening Balance</span>
                <span className="text-base font-bold text-white">
                  {currency} {forecast.openingBalance}
                </span>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="text-[11px] text-slate-400 block">Expected Outflows</span>
                <span className="text-base font-bold text-rose-400">
                  -{currency} {forecast.totalExpectedOutflows}
                </span>
              </div>
              <div className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-700/50">
                <span className="text-[11px] text-indigo-300 block">Projected Closing</span>
                <span className="text-base font-bold text-emerald-400">
                  {currency} {forecast.projectedClosingBalance}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Estimated from confirmed recurring bills and historical daily discretionary run rate. Not a guaranteed bank balance.
            </p>
          </div>
        )}

        {/* Upcoming Recurring Bills */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Recurring Payments &amp; Subscriptions</h3>
              <p className="text-xs text-slate-500">Detected &amp; confirmed recurring commitments</p>
            </div>
            <Link href="/recurring" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Review ({recurring.filter((r) => r.reviewStatus === "DETECTED").length})
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recurring.slice(0, 4).map((rec) => (
              <div key={rec.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                    {rec.merchant.substring(0, 2)}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 capitalize">{rec.merchant}</h5>
                    <span className="text-[11px] text-slate-400">
                      {rec.frequency.toLowerCase()} • {rec.reviewStatus.toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 block">
                    ~{rec.currency} {Number(rec.expectedAmount).toFixed(2)}
                  </span>
                  {rec.nextExpectedDate && (
                    <span className="text-[10px] text-slate-400">
                      Due: {new Date(rec.nextExpectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {recurring.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">
                No recurring candidates detected yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </AuthProvider>
  );
}

