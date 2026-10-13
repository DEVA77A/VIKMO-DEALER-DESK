import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Bot,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  getProducts,
  getDealers,
  getOrders,
  getReorderSuggestions,
} from "../services/api";
import { StatusBadge, StockBadge } from "../components/Badge";
import { CardSkeleton, TableSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalDealers: 0,
    totalOrders: 0,
    urgentReordersCount: 0,
  });
  const [urgentReorders, setUrgentReorders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, dealersRes, ordersRes, reorderRes] = await Promise.all([
        getProducts({ page_size: 20 }),
        getDealers({ page_size: 1 }),
        getOrders({ page_size: 5 }),
        getReorderSuggestions(),
      ]);

      const allReorders = (reorderRes && reorderRes.results) || [];
      const urgent = allReorders.filter((r) => r.reorder_qty > 0);

      const lowStock = (productsRes.results || [])
        .filter((p) => p.stock < 20)
        .slice(0, 5);

      setStats({
        totalProducts: productsRes.count || 0,
        totalDealers: dealersRes.count || 0,
        totalOrders: ordersRes.count || 0,
        urgentReordersCount: urgent.length,
      });

      setUrgentReorders(urgent.slice(0, 5));
      setRecentOrders(ordersRes.results || []);
      setLowStockProducts(lowStock);
    } catch (err) {
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-10 bg-[#EBD1B2] rounded-2xl w-64 mb-3 animate-pulse" />
          <div className="h-4 bg-[#EBD1B2]/60 rounded-xl w-96 animate-pulse" />
        </div>
        <CardSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-warm p-6">
            <TableSkeleton rows={4} cols={3} />
          </div>
          <div className="card-warm p-6">
            <TableSkeleton rows={4} cols={3} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 card-warm border-[#B94A3A]/40 bg-[#F7E3E0] text-[#9E3324] rounded-3xl">
        <h3 className="font-display font-bold text-lg mb-1">Error Loading Dashboard</h3>
        <p className="text-sm mb-4 text-[#817568]">{error}</p>
        <button
          onClick={loadDashboardData}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Editorial Welcome Header (Inspired by "Morning, Deva." from screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#73956A]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Automotive Distribution Network
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#211D1B]">
            Morning, Operations.
          </h1>
          <p className="text-sm text-[#817568] mt-1 max-w-xl">
            Live catalogue inventory, dealer draft orders, and 4-week machine learning demand forecasts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="btn-secondary text-xs flex items-center gap-2"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#D96A25]" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Prominent Feature Card (Directly inspired by the prompt card in the reference screenshot) */}
      <div className="relative overflow-hidden card-warm p-6 sm:p-8 rounded-3xl border border-[#E8D5BD]">
        {/* Decorative organic shape */}
        <div className="organic-shape" />

        <div className="relative z-10 max-w-2xl">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#D96A25] mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GENAI ASSISTANT</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#211D1B] leading-tight mb-3">
            Looking for compatible parts or creating dealer draft orders?
          </h2>
          <p className="text-sm text-[#817568] mb-6 leading-relaxed">
            Ask the AI Assistant for live stock lookups, Pulsar or Duke fitments, and instant order creation with real catalog pricing.
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <Link to="/assistant" className="btn-primary text-sm shadow-xs">
              <span>Start assistant</span>
              <ArrowRight className="w-4 h-4 ml-1.5 inline" />
            </Link>
            <Link
              to="/products"
              className="text-sm font-semibold text-[#817568] hover:text-[#D96A25] transition-colors"
            >
              browse catalogue
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Catalogue */}
        <div className="card-warm p-6 rounded-3xl transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Total Catalogue
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#EBD1B2] flex items-center justify-center text-[#D96A25]">
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-[#211D1B]">
            {stats.totalProducts.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[#817568]">Active SKUs in catalogue</div>
        </div>

        {/* Network Dealers */}
        <div className="card-warm p-6 rounded-3xl transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Network Dealers
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#EBD1B2] flex items-center justify-center text-[#D96A25]">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-[#211D1B]">
            {stats.totalDealers.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[#817568]">Distributors in South India</div>
        </div>

        {/* Total Orders */}
        <div className="card-warm p-6 rounded-3xl transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Total Orders
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#EBD1B2] flex items-center justify-center text-[#D96A25]">
              <ShoppingCart className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-[#211D1B]">
            {stats.totalOrders.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[#817568]">Recorded orders & drafts</div>
        </div>

        {/* Reorder Alerts */}
        <div className="card-warm p-6 rounded-3xl transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Reorder Alerts
            </span>
            <div className="w-9 h-9 rounded-2xl bg-[#F4D5B7] flex items-center justify-center text-[#D96A25]">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-[#D96A25]">
            {stats.urgentReordersCount}
          </div>
          <div className="mt-1 text-xs text-[#BE571B] font-semibold">
            SKUs below safety stock point
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Urgent Reorder Recommendations */}
        <div className="card-warm rounded-3xl p-6 sm:p-7 flex flex-col">
          <div className="flex items-center justify-between pb-5 border-b border-[#E8D5BD]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#D96A25] mb-1">
                INVENTORY RISK
              </div>
              <h2 className="font-display text-xl font-bold text-[#211D1B] flex items-center gap-2">
                Urgent Reorder Suggestions
              </h2>
            </div>
            <Link
              to="/forecasting"
              className="text-xs font-bold text-[#D96A25] hover:text-[#BE571B] flex items-center gap-1"
            >
              <span>View all 40</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="pt-4 flex-1 overflow-x-auto">
            {urgentReorders.length === 0 ? (
              <EmptyState
                title="All items well-stocked"
                description="No SKUs currently breach safety-stock reorder thresholds."
              />
            ) : (
              <table className="w-full text-left text-sm divide-y divide-[#E8D5BD]/60">
                <thead className="bg-[#EBD1B2] text-xs font-semibold text-[#817568] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 rounded-l-2xl">SKU</th>
                    <th className="px-4 py-3">Live Stock</th>
                    <th className="px-4 py-3">Lead Demand</th>
                    <th className="px-4 py-3 text-right rounded-r-2xl">Reorder Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D5BD]/60">
                  {urgentReorders.map((item) => (
                    <tr key={item.sku} className="hover:bg-[#FAF2E8] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#211D1B]">{item.sku}</td>
                      <td className="px-4 py-3">
                        <StockBadge stock={item.current_stock} />
                      </td>
                      <td className="px-4 py-3 text-[#817568]">{item.lead_time_demand} units</td>
                      <td className="px-4 py-3 text-right font-bold text-[#D96A25]">
                        +{item.reorder_qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card-warm rounded-3xl p-6 sm:p-7 flex flex-col">
          <div className="flex items-center justify-between pb-5 border-b border-[#E8D5BD]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#817568] mb-1">
                COMMERCE ACTIVITY
              </div>
              <h2 className="font-display text-xl font-bold text-[#211D1B]">
                Recent Orders
              </h2>
            </div>
            <Link
              to="/orders"
              className="text-xs font-bold text-[#D96A25] hover:text-[#BE571B] flex items-center gap-1"
            >
              <span>All orders</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="pt-4 flex-1 overflow-x-auto">
            {recentOrders.length === 0 ? (
              <EmptyState
                title="No orders placed yet"
                description="Orders created via assistant or portal will appear here."
              />
            ) : (
              <table className="w-full text-left text-sm divide-y divide-[#E8D5BD]/60">
                <thead className="bg-[#EBD1B2] text-xs font-semibold text-[#817568] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 rounded-l-2xl">Order #</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3 text-right rounded-r-2xl">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D5BD]/60">
                  {recentOrders.map((order) => (
                    <tr key={order.order_number} className="hover:bg-[#FAF2E8] transition-colors">
                      <td className="px-4 py-3 font-semibold">
                        <Link
                          to={`/orders?order=${order.order_number}`}
                          className="hover:underline text-[#211D1B]"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-[#817568]">
                        {order.items?.length || 0} line(s)
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#211D1B]">
                        ₹{parseFloat(order.grand_total || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
