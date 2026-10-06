"use client";

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ArrowRight,
  RotateCcw,
  Sliders,
  HelpCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

function ImportsContent() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [step, setStep] = useState<"UPLOAD" | "MAPPING" | "PREVIEW" | "COMMITTED">("UPLOAD");
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [committedResult, setCommittedResult] = useState<any>(null);
  const [forceIncludeRows, setForceIncludeRows] = useState<number[]>([]);
  const [customMapping, setCustomMapping] = useState({
    dateColumn: "",
    descriptionColumn: "",
    amountColumn: "",
    debitColumn: "",
    creditColumn: "",
    currencyColumn: "",
    dateFormat: "auto",
  });

  useEffect(() => {
    fetch("/api/v1/accounts")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setAccounts(res.data);
          if (res.data.length > 0) setSelectedAccountId(res.data[0].id);
        }
      });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const text = await f.text();
      setFileContent(text);
    }
  };

  const handleStartAnalysis = async () => {
    if (!file || !fileContent || !selectedAccountId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/v1/imports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          fileName: file.name,
          fileContent,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to parse statement");
      }

      setPreviewResult(json.data);
      setCustomMapping({
        dateColumn: json.data.suggestedMapping.dateColumn || "",
        descriptionColumn: json.data.suggestedMapping.descriptionColumn || "",
        amountColumn: json.data.suggestedMapping.amountColumn || "",
        debitColumn: json.data.suggestedMapping.debitColumn || "",
        creditColumn: json.data.suggestedMapping.creditColumn || "",
        currencyColumn: json.data.suggestedMapping.currencyColumn || "",
        dateFormat: json.data.suggestedMapping.dateFormat || "auto",
      });

      setStep("PREVIEW");
    } catch (err: any) {
      alert(err.message || "Error parsing file");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResult?.batchId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/imports/${previewResult.batchId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceIncludeRowIndexes: forceIncludeRows }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Commit failed");

      setCommittedResult(json.data);
      setStep("COMMITTED");
    } catch (err: any) {
      alert(err.message || "Commit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUndoBatch = async (batchId: string) => {
    if (!confirm("Are you sure you want to undo and delete all transactions from this import batch?")) return;
    try {
      const res = await fetch(`/api/v1/imports/${batchId}/undo`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        alert(json.data.message);
        setStep("UPLOAD");
        setFile(null);
        setPreviewResult(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleForceRow = (idx: number) => {
    setForceIncludeRows((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Statement Ingestion Engine</h1>
        <p className="text-sm text-slate-500">
          Upload and reconcile bank statements with row-level validation, multi-currency detection, and deduplication
        </p>
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        <div
          className={`p-3 rounded-xl border ${
            step === "UPLOAD"
              ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
              : "bg-white border-slate-200 text-slate-400"
          }`}
        >
          1. Statement Upload &amp; Format
        </div>
        <div
          className={`p-3 rounded-xl border ${
            step === "PREVIEW" || step === "MAPPING"
              ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
              : "bg-white border-slate-200 text-slate-400"
          }`}
        >
          2. Validation &amp; Deduplication Preview
        </div>
        <div
          className={`p-3 rounded-xl border ${
            step === "COMMITTED"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
              : "bg-white border-slate-200 text-slate-400"
          }`}
        >
          3. Ledger Commit &amp; Reconciled
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === "UPLOAD" && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                1. Select Target Financial Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.institutionName || "Manual"} • {a.currency})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Statements are scoped to an account to prevent cross-account reconciliation errors.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Documented Formats Supported
              </label>
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p>• <strong>Chase Bank Activity CSV</strong> (Checking, Credit Card)</p>
                <p>• <strong>Bank of America CSV</strong> (Standard Online Export)</p>
                <p>• <strong>Monzo Current Account CSV</strong> (GBP &amp; multi-currency)</p>
                <p>• <strong>Revolut Statement CSV</strong> (Multi-currency cards)</p>
                <p>• <strong>Generic CSV</strong> (Custom column mapping)</p>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-8 text-center transition-colors">
            <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {file ? file.name : "Choose CSV statement file to import"}
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Supports .csv files up to 10MB. Content is strictly validated before commit.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Select File from Computer</span>
            </label>
          </div>

          {file && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleStartAnalysis}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50"
              >
                {loading ? "Analyzing Statement..." : "Analyze & Preview Statement"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview & Validation */}
      {step === "PREVIEW" && previewResult && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Total Rows Read</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{previewResult.totalRows}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-emerald-600 uppercase">Accepted Rows</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{previewResult.acceptedRows}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-amber-600 uppercase">Duplicate Candidates</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{previewResult.duplicateRows}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-rose-600 uppercase">Invalid Rows</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">{previewResult.invalidRows}</p>
            </div>
          </div>

          {/* Statement Format & Date Range Info */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
            <div>
              <span className="text-slate-400">Detected Format: </span>
              <strong className="text-slate-800">{previewResult.format}</strong>
            </div>
            <div>
              <span className="text-slate-400">Date Range: </span>
              <strong>{previewResult.dateRange.start || "N/A"} to {previewResult.dateRange.end || "N/A"}</strong>
            </div>
            <div>
              <span className="text-slate-400">Currencies Found: </span>
              <strong>{Object.keys(previewResult.currencies).join(", ") || "USD"}</strong>
            </div>
          </div>

          {/* Parsed Rows Preview Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Statement Validation &amp; Deduplication Rows</h3>
              <span className="text-xs text-slate-400">
                Review any duplicates or invalid records before committing
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Validation Notice / Match</th>
                    <th className="py-2.5 px-3 text-center">Include</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewResult.rows.map((row: any) => {
                    const isDuplicate = row.status.includes("DUPLICATE");
                    const isInvalid = row.status === "INVALID";
                    const isForceIncluded = forceIncludeRows.includes(row.rowIndex);

                    return (
                      <tr
                        key={row.rowIndex}
                        className={`hover:bg-slate-50 ${
                          isInvalid
                            ? "bg-rose-50/40"
                            : isDuplicate
                            ? "bg-amber-50/40"
                            : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 text-slate-400 font-mono">#{row.rowIndex}</td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.status === "VALID" && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          )}
                          {isDuplicate && (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                              <Copy className="w-3.5 h-3.5" /> {row.status === "DUPLICATE_CONFIRMED" ? "Exact Duplicate" : "Probable Dup"}
                            </span>
                          )}
                          {isInvalid && (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {row.parsedDate ? new Date(row.parsedDate).toISOString().split("T")[0] : "-"}
                        </td>

                        <td className="py-2.5 px-3 text-slate-800 font-medium max-w-xs truncate">
                          {row.parsedDescription || row.rawValues?.Description || "-"}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {row.parsedAmount ? (
                            <span className={parseFloat(row.parsedAmount) < 0 ? "text-rose-600" : "text-emerald-600"}>
                              {row.parsedCurrency || "USD"} {row.parsedAmount}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate text-[11px]">
                          {row.rejectionReason || "Meets canonical transaction criteria"}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {isDuplicate && (
                            <label className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isForceIncluded}
                                onChange={() => toggleForceRow(row.rowIndex)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-[10px] text-slate-500">Force</span>
                            </label>
                          )}
                          {row.status === "VALID" && (
                            <span className="text-[10px] text-emerald-600 font-bold">Auto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep("UPLOAD")}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Choose Different File
            </button>

            <button
              onClick={handleCommit}
              disabled={loading || previewResult.acceptedRows === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50"
            >
              {loading ? "Committing Transactions..." : `Commit ${previewResult.acceptedRows + forceIncludeRows.length} Valid Records`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Committed Success */}
      {step === "COMMITTED" && committedResult && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-slate-900">Import Batch Reconciled &amp; Committed!</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Successfully committed <strong>{committedResult.committedCount}</strong> canonical transactions into your account ledger. Financial summaries, category breakdowns, and recurring bill candidates have been recalculated.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/transactions"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
            >
              View in Transaction Ledger
            </Link>

            <button
              onClick={() => handleUndoBatch(committedResult.batchId)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo This Import Batch</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportsPage() {
  return (
    <AuthProvider>
      <AppShell>
        <ImportsContent />
      </AppShell>
    </AuthProvider>
  );
}
