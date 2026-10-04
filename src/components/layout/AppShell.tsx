"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import {
  LayoutDashboard,
  Receipt,
  UploadCloud,
  PieChart,
  Target,
  Repeat,
  TrendingUp,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: Receipt },
    { name: "Import Statements", href: "/imports", icon: UploadCloud },
    { name: "Spending Analytics", href: "/analytics", icon: PieChart },
    { name: "Budgets", href: "/budgets", icon: Target },
    { name: "Recurring Bills", href: "/recurring", icon: Repeat },
    { name: "Cash Flow Forecast", href: "/forecast", icon: TrendingUp },
    { name: "Finance Assistant", href: "/assistant", icon: Bot },
    { name: "Settings & Privacy", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            P
          </div>
          <span className="font-semibold text-lg tracking-tight">Penny</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`${
          mobileMenuOpen ? "block" : "hidden"
        } lg:block lg:w-64 bg-slate-900 text-slate-200 flex-shrink-0 flex flex-col justify-between border-r border-slate-800 z-30`}
      >
        <div>
          {/* Logo / Brand */}
          <div className="hidden lg:flex items-center space-x-3 px-6 py-6 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              P
            </div>
            <div>
              <div className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                Penny <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">MVP</span>
              </div>
              <p className="text-xs text-slate-400">Expense Intelligence</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {user?.isDemo && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
              <span>Demo Workspace Active</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Demo Mode Notice Banner */}
        {user?.isDemo && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded">Demo Fixture</span>
              <span>You are viewing realistic sample data for <strong>Alex Morgan</strong>. Actual records, estimates, and demo fixtures are strictly isolated.</span>
            </div>
            <Link
              href="/imports"
              className="font-medium text-amber-900 underline hover:text-amber-700 flex items-center gap-1"
            >
              Import your own statement <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        <main className="p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

