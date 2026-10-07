"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import {
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Calendar,
  DollarSign,
  ShieldAlert,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function ForecastContent() {
  const { user } = useAuth();
  const [horizon, setHorizon] = useState(30);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadForecast() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/cash-flow/forecast?horizon=${horizon}`);
        if (res.ok) {
          const json = await res.json();
          setForecast(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadForecast();
  }, [horizon]);

  const currency = forecast?.reportingCurrency || user?.defaultCurrency || "USD";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cash-Flow Forecasting</h1>
          <p className="text-sm text-slate-500">
            Baseline mathematical projections based on confirmed recurring commitments &amp; discretionary run rate
          </p>
        </div>

        {/* Horizon selector */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 text-xs font-semibold shadow-sm">
          {[30, 60, 90].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                horizon === h
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {h} Days
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Opening Balance</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {currency} {forecast?.openingBalance || "0.00"}
          </p>
          <span className="inline-block text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1">
            {forecast?.openingBalanceSource === "OBSERVED_BALANCE" ? "Verified Bank Observation" : "Calculated Net Ledger"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Expected Inflows</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            +{currency} {forecast?.totalExpectedInflows || "0.00"}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Confirmed expected deposits</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Expected Outflows</span>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">
            -{currency} {forecast?.totalExpectedOutflows || "0.00"}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Scheduled bills + discretionary rate</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-medium text-indigo-600 uppercase tracking-wider">Projected Closing Balance</span>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">
            {currency} {forecast?.projectedClosingBalance || "0.00"}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">at {horizon} days horizon</p>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Projected Liquidity Trajectory</h3>
            <p className="text-xs text-slate-500">Day-by-day simulated balance evolution</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Reporting: {currency}</span>
        </div>

        <div className="h-72 w-full pt-4">
          {forecast?.dailyTimeline ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast.dailyTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  formatter={(val: any) => [`${currency} ${Number(val).toFixed(2)}`, "Projected Balance"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="projectedBalance"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorBalance)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Generating projection timeline...
            </div>
          )}
        </div>
      </div>

      {/* Transparent Model Assumptions & Limitations */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>Transparent Model Assumptions &amp; Data Gaps</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600 leading-relaxed">
          <div>
            <h5 className="font-semibold text-slate-800 mb-1">Inputs Included</h5>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong>{forecast?.assumptions?.recurringOutflowsCount || 0}</strong> scheduled recurring bill events recognized within the horizon.
              </li>
              <li>
                Baseline estimated discretionary variable spending of <strong>{currency} {forecast?.assumptions?.dailyRunRateEstimated || "0.00"}/day</strong> calculated from your past 60-day run rate.
              </li>
              <li>
                Excluded internal transfers from consolidated consumption while preserving their balance timing.
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-slate-800 mb-1">Uncertainty &amp; Integrity Disclosure</h5>
            <p className="mb-2 italic text-slate-500">
              {forecast?.uncertaintyDisclaimer}
            </p>
            <p className="text-[11px] text-slate-400">
              Future unrecorded expenses, discretionary windfalls, or emergency cash needs cannot be fabricated by the system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForecastPage() {
  return (
    <AuthProvider>
      <AppShell>
        <ForecastContent />
      </AppShell>
    </AuthProvider>
  );
}
