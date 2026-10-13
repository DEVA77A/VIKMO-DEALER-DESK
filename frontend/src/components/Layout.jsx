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
  Sparkles,
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

  // Format today's date in editorial style: e.g. "TUESDAY · 13 OCTOBER"
  const todayFormatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .toUpperCase()
    .replace(",", " ·");

  return (
    <div className="min-h-screen flex bg-[#F8E9D5] text-[#211D1B]">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#211D1B]/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-68 bg-[#F2DEC4] border-r border-[#E8D5BD] flex flex-col transition-transform duration-250 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-[#E8D5BD] gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#D96A25] flex items-center justify-center text-[#FFFDF9] shadow-sm">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display font-bold text-lg tracking-tight text-[#211D1B] flex items-center gap-2">
              VIKMO
              <span className="text-[#BE571B] bg-[#F4D5B7] font-semibold text-[11px] px-2 py-0.5 rounded-full font-sans tracking-normal">
                Desk
              </span>
            </div>
            <div className="text-[11px] text-[#817568] font-medium tracking-wide">
              Automotive Parts & AI
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden ml-auto p-1.5 rounded-full hover:bg-[#EBD1B2] text-[#817568]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#A39788]">
            Main Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#D96A25] text-[#FFFDF9] font-semibold shadow-sm"
                    : "text-[#817568] hover:bg-[#EBD1B2]/60 hover:text-[#211D1B]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={`w-4.5 h-4.5 ${
                      isActive ? "text-[#FFFDF9]" : "text-[#817568]"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[#FFFDF9] text-[#D96A25]"
                        : "bg-[#EBD1B2] text-[#817568]"
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
        <div className="p-4 border-t border-[#E8D5BD] bg-[#EBD1B2]/40 space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2 text-[#817568]">
              {systemHealthy === true && (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#73956A]" />
              )}
              {systemHealthy === false && (
                <AlertCircle className="w-3.5 h-3.5 text-[#B94A3A]" />
              )}
              {systemHealthy === null && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#A39788]" />
              )}
              <span className="font-medium">Backend API</span>
            </div>
            <span
              className={`font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                systemHealthy
                  ? "bg-[#E6EFE4] text-[#3F6236]"
                  : systemHealthy === false
                  ? "bg-[#F7E3E0] text-[#9E3324]"
                  : "bg-[#F2DEC4] text-[#817568]"
              }`}
            >
              {systemHealthy ? "Online" : systemHealthy === false ? "Offline" : "Checking..."}
            </span>
          </div>

          <button
            onClick={handleSupplierSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#F7E6D0] hover:bg-[#F2DEC4] text-[#211D1B] border border-[#E8D5BD] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D96A25] ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing Feed..." : "Sync Supplier Feed"}</span>
          </button>

          {syncResult && (
            <div className="text-[11px] text-center text-[#9A4613] bg-[#F4D5B7] border border-[#E5BC96] p-2 rounded-xl">
              {syncResult}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-68 min-w-0">
        {/* Top Header Bar */}
        <header className="h-18 flex items-center justify-between px-6 md:px-8 border-b border-[#E8D5BD]/80 sticky top-0 z-30 bg-[#F8E9D5]/90 backdrop-blur-md">
          {/* Left: Mobile Toggle + Date Headline */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-[#817568] hover:bg-[#F2DEC4] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#817568]">
                {todayFormatted}
              </div>
              <div className="font-display font-bold text-base md:text-lg text-[#211D1B] hidden sm:block">
                VIKMO Automotive Logistics
              </div>
            </div>
          </div>

          {/* Right: User Avatar Circle (matching the reference screenshot's 'D' badge!) */}
          <div className="flex items-center gap-3.5">
            <Link
              to="/assistant"
              className="hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F2DEC4] border border-[#E8D5BD] text-xs font-semibold text-[#211D1B] hover:border-[#DAC2A5] transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D96A25]" />
              <span>AI Assistant</span>
            </Link>

            {/* Avatar Pill inspired by Reference Screenshot */}
            <div
              className="w-10 h-10 rounded-full bg-[#F2DEC4] border border-[#E8D5BD] flex items-center justify-center font-display font-bold text-base text-[#D96A25] shadow-xs cursor-pointer hover:bg-[#EBD1B2] transition-colors"
              title="Deva - Distributor Ops"
            >
              D
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-5 md:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
