"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import {
  Repeat,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

function RecurringContent() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"DETECTED" | "CONFIRMED" | "DISMISSED">("DETECTED");

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/recurring-payments");
      if (res.ok) {
        const json = await res.json();
        setCandidates(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/v1/recurring-payments/detect", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        alert(`Detection scan complete! ${json.data.detectedCount} new candidate(s) found.`);
        fetchCandidates();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/recurring-payments/${id}/confirm`, { method: "POST" });
      if (res.ok) fetchCandidates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/recurring-payments/${id}/dismiss`, { method: "POST" });
      if (res.ok) fetchCandidates();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = candidates.filter((c) => c.reviewStatus === activeTab);
  const detectedCount = candidates.filter((c) => c.reviewStatus === "DETECTED").length;
  const confirmedCount = candidates.filter((c) => c.reviewStatus === "CONFIRMED").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recurring Payments &amp; Subscriptions</h1>
          <p className="text-sm text-slate-500">
            Deterministic detection of repeated billing intervals, subscriptions, and regular obligations
          </p>
        </div>

        <button
          onClick={handleScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{scanning ? "Analyzing Patterns..." : "Run Detection Scan"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("DETECTED")}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "DETECTED"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>Awaiting Review</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
            {detectedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("CONFIRMED")}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "CONFIRMED"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>Confirmed Subscriptions</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">
            {confirmedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("DISMISSED")}
          className={`pb-3 px-3 border-b-2 transition-colors ${
            activeTab === "DISMISSED"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Dismissed
        </button>
      </div>

      {/* Candidates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm uppercase shadow-sm">
                    {c.merchant.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 capitalize">{c.merchant}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="capitalize font-medium text-slate-600">{c.frequency.toLowerCase()}</span>
                      <span>•</span>
                      <span>Confidence: {Math.round(parseFloat(c.confidenceScore) * 100)}%</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-extrabold text-slate-900">
                    ~{c.currency} {Number(c.expectedAmount).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">estimated/billing</span>
                </div>
              </div>

              {/* Evidence explanation */}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                {c.confidenceExplanation}
              </div>

              {/* Next expected date */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Next expected:</span>
                </div>
                <span className="font-semibold text-slate-800">
                  {c.nextExpectedDate
                    ? new Date(c.nextExpectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "Unknown"}
                </span>
              </div>
            </div>

            {/* Actions */}
            {activeTab === "DETECTED" && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleDismiss(c.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Dismiss</span>
                </button>
                <button
                  onClick={() => handleConfirm(c.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Subscription</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
            <Repeat className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No recurring candidates in this view</p>
            <p className="text-xs text-slate-400">
              Run the detection scan to analyze your recorded transactions for interval regularities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecurringPage() {
  return (
    <AuthProvider>
      <AppShell>
        <RecurringContent />
      </AppShell>
    </AuthProvider>
  );
}
