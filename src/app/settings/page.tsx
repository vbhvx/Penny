"use client";

import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import {
  Settings,
  ShieldCheck,
  Download,
  Trash2,
  Plus,
  Building,
  CreditCard,
  Wallet,
  AlertTriangle,
  Lock,
  X,
} from "lucide-react";

function SettingsContent() {
  const { user, logout } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAccModal, setNewAccModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [newAcc, setNewAcc] = useState({
    name: "",
    type: "CHECKING",
    currency: "USD",
    institutionName: "",
    accountNumberMask: "",
    initialBalance: "",
  });

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/v1/accounts");
      if (res.ok) setAccounts((await res.json()).data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAcc,
          initialBalance: newAcc.initialBalance ? parseFloat(newAcc.initialBalance) : undefined,
        }),
      });

      if (res.ok) {
        setNewAccModal(false);
        setNewAcc({
          name: "",
          type: "CHECKING",
          currency: "USD",
          institutionName: "",
          accountNumberMask: "",
          initialBalance: "",
        });
        fetchAccounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Archive this account? Its historical transactions will be preserved.")) return;
    try {
      const res = await fetch(`/api/v1/accounts/${id}`, { method: "DELETE" });
      if (res.ok) fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecutePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== "DELETE MY DATA") return;
    setDeleting(true);

    try {
      const res = await fetch("/api/v1/privacy/deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });

      if (res.ok) {
        alert("Workspace successfully deleted");
        window.location.href = "/login";
      }
    } catch (err) {
      alert("Error deleting workspace");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings &amp; Data Privacy</h1>
        <p className="text-sm text-slate-500">
          Manage financial accounts, reporting currency preferences, export your data, and audit privacy controls
        </p>
      </div>

      {/* Financial Accounts Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Financial Accounts</h3>
            <p className="text-xs text-slate-500">
              Accounts configured for transaction ingestion and balance tracking
            </p>
          </div>
          <button
            onClick={() => setNewAccModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {accounts.map((acc) => (
            <div key={acc.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  {acc.type === "CHECKING" ? (
                    <Building className="w-4 h-4 text-indigo-600" />
                  ) : acc.type === "CREDIT_CARD" ? (
                    <CreditCard className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{acc.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {acc.institutionName || "Manual Account"} • {acc.accountNumberMask || "No mask"} • {acc.currency}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="font-bold text-slate-900 block font-mono">
                    {acc.lastObservedBalance ? `${acc.currency} ${acc.lastObservedBalance}` : "No balance logged"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {acc.transactionCount} transactions
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteAccount(acc.id)}
                  className="text-slate-300 hover:text-rose-600 transition-colors"
                  title="Archive account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Export & Portability Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900">Data Export &amp; Portability</h3>
          <p className="text-xs text-slate-500">
            Export your complete canonical financial records at any time. CSV exports include automated formula injection defense.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <a
            href="/api/v1/exports/csv"
            download
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100 transition-all text-xs"
          >
            <div>
              <p className="font-semibold text-slate-900">Download Transactions CSV</p>
              <p className="text-[11px] text-slate-500">Clean spreadsheet with sanitized cells</p>
            </div>
            <Download className="w-4 h-4 text-indigo-600" />
          </a>

          <a
            href="/api/v1/exports/json"
            download
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100 transition-all text-xs"
          >
            <div>
              <p className="font-semibold text-slate-900">Download Full JSON Package</p>
              <p className="text-[11px] text-slate-500">Structured data with accounts, budgets, and links</p>
            </div>
            <Download className="w-4 h-4 text-indigo-600" />
          </a>
        </div>
      </div>

      {/* Security & AI Disclosure */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs text-slate-600 leading-relaxed">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Security, Isolation &amp; AI Data Governance</span>
        </div>
        <p>
          • <strong>Zero Credential Scraping</strong>: Penny relies on user-uploaded statements and manual entries. No external bank passwords or scraping tokens are stored or transmitted.
        </p>
        <p>
          • <strong>AI Data Minimization</strong>: When using the natural language assistant, only aggregated calculations and specific metrics are queried via typed tools. Full statements or unredacted raw files are never transmitted to external AI providers.
        </p>
        <p>
          • <strong>Deterministic Precedence</strong>: Language models are never used to calculate financial sums, balances, or budgets. Authoritative numbers derive purely from deterministic server-side code.
        </p>
      </div>

      {/* Danger Zone: Workspace Deletion */}
      <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Danger Zone: Permanent Workspace Deletion</span>
        </div>
        <p className="text-xs text-rose-700 leading-relaxed">
          Permanently delete your account, financial accounts, uploaded statement batches, transactions, budgets, recurring candidates, and assistant history. This action cannot be reversed.
        </p>
        <button
          onClick={() => setDeleteModal(true)}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          Request Workspace Deletion
        </button>
      </div>

      {/* Add Account Modal */}
      {newAccModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Financial Account</h3>
              <button onClick={() => setNewAccModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Account Nickname</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Checking"
                  value={newAcc.name}
                  onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Account Type</label>
                <select
                  value={newAcc.type}
                  onChange={(e) => setNewAcc({ ...newAcc, type: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="CHECKING">Checking Account</option>
                  <option value="SAVINGS">Savings Account</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CASH">Cash Wallet</option>
                  <option value="INVESTMENT">Investment Account</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Currency</label>
                <select
                  value={newAcc.currency}
                  onChange={(e) => setNewAcc({ ...newAcc, currency: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Institution Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chase, Bank of America, Monzo"
                  value={newAcc.institutionName}
                  onChange={(e) => setNewAcc({ ...newAcc, institutionName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Initial Observed Balance (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5240.50"
                  value={newAcc.initialBalance}
                  onChange={(e) => setNewAcc({ ...newAcc, initialBalance: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewAccModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-rose-900 text-sm">Confirm Permanent Deletion</h3>
              <button onClick={() => setDeleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed">
              To permanently erase all your financial statements, accounts, transactions, and settings, type <strong>DELETE MY DATA</strong> below.
            </p>

            <form onSubmit={handleExecutePurge} className="space-y-3">
              <input
                type="text"
                required
                placeholder="DELETE MY DATA"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full p-2 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 font-mono font-bold"
              />

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmation !== "DELETE MY DATA" || deleting}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40"
                >
                  {deleting ? "Purging..." : "Permanently Delete Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthProvider>
      <AppShell>
        <SettingsContent />
      </AppShell>
    </AuthProvider>
  );
}
