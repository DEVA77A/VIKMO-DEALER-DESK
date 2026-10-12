import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Bot,
  TrendingUp,
  Menu,
  X,
  Wrench,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getHealth, triggerSupplierSync } from "../services/api";

const NAV_ITEMS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Catalogue", path: "/products", icon: Package },
  { name: "Dealers", path: "/dealers", icon: Users },
  { name: "Orders", path: "/orders", icon: ShoppingCart },
  { name: "AI Assistant", path: "/assistant", icon: Bot, badge: "GenAI" },
  { name: "Forecasting", path: "/forecasting", icon: TrendingUp, badge: "ML" },
];

export function Layout({ children }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemHealthy, setSystemHealthy] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await getHealth();
      setSystemHealthy(res.status === "ok");
    } catch {
      setSystemHealthy(false);
    }
  };

  const handleSupplierSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await triggerSupplierSync();
      setSyncResult(`Synced: +${res.created} new, ${res.updated} updated`);
      setTimeout(() => setSyncResult(null), 5000);
    } catch (err) {
      setSyncResult(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncResult(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-sm">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              VIKMO <span className="text-amber-400 font-semibold text-xs px-1.5 py-0.5 rounded bg-amber-400/10">DealerDesk</span>
            </div>
            <div className="text-[11px] text-slate-400">Automotive Commerce & AI</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500 text-slate-950 font-semibold shadow-xs"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isActive
                        ? "bg-slate-950 text-amber-400"
                        : "bg-slate-800 text-amber-400 border border-slate-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / System Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              {systemHealthy === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {systemHealthy === false && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
              {systemHealthy === null && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />}
              <span>Backend API</span>
            </div>
            <span
              className={`font-medium ${
                systemHealthy ? "text-emerald-400" : systemHealthy === false ? "text-rose-400" : "text-slate-400"
              }`}
            >
              {systemHealthy ? "Online" : systemHealthy === false ? "Offline" : "Checking..."}
            </span>
          </div>

          <button
            onClick={handleSupplierSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing Feed..." : "Sync Supplier Feed"}</span>
          </button>

          {syncResult && (
            <div className="text-[11px] text-center text-amber-400 bg-amber-950/40 border border-amber-800/40 p-1.5 rounded">
              {syncResult}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Mobile Header */}
        <header className="h-16 flex items-center justify-between px-4 bg-white border-b border-slate-200 lg:hidden sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-slate-900 tracking-tight flex items-center gap-1">
              VIKMO <span className="text-amber-600 font-semibold text-xs">DealerDesk</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                systemHealthy ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
