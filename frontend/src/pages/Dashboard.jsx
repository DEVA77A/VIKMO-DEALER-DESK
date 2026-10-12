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
      <div className="space-y-6">
        <div>
          <div className="h-8 bg-slate-200 rounded w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-96 animate-pulse" />
        </div>
        <CardSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton rows={4} cols={3} />
          <TableSkeleton rows={4} cols={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800">
        <h3 className="font-semibold text-base mb-1">Error Loading Dashboard</h3>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time distributor operations, catalogue health, and demand alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/assistant"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium shadow-xs"
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <span>AI Assistant</span>
          </Link>
          <button
            onClick={loadDashboardData}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Catalogue
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {stats.totalProducts.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">Active SKUs in catalogue</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Network Dealers
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {stats.totalDealers.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">South India distributors</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {stats.totalOrders.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">Recorded orders & drafts</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Reorder Alerts
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {stats.urgentReordersCount}
          </div>
          <div className="mt-1 text-xs text-amber-600 font-medium">
            SKUs below safety stock point
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Reorder Recommendations */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Urgent Reorder Suggestions</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Driven by 4-week ML forecast and lead times.
              </p>
            </div>
            <Link
              to="/forecasting"
              className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <span>View all 40</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 flex-1 overflow-x-auto">
            {urgentReorders.length === 0 ? (
              <EmptyState
                title="All items well-stocked"
                description="No SKUs currently breach safety-stock reorder thresholds."
              />
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 border-b border-slate-100">
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Live Stock</th>
                    <th className="pb-2">Lead Time Demand</th>
                    <th className="pb-2 text-right">Reorder Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {urgentReorders.map((item) => (
                    <tr key={item.sku} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-900">{item.sku}</td>
                      <td className="py-2.5">
                        <StockBadge stock={item.current_stock} />
                      </td>
                      <td className="py-2.5 text-slate-600">{item.lead_time_demand} units</td>
                      <td className="py-2.5 text-right font-bold text-amber-600">
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                <span>Recent Orders</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest distributor order activity.
              </p>
            </div>
            <Link
              to="/orders"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>All orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 flex-1 overflow-x-auto">
            {recentOrders.length === 0 ? (
              <EmptyState
                title="No orders placed yet"
                description="Orders created via assistant or portal will appear here."
              />
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 border-b border-slate-100">
                    <th className="pb-2">Order #</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Items</th>
                    <th className="pb-2 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <tr key={order.order_number} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-900">
                        <Link
                          to={`/orders?order=${order.order_number}`}
                          className="hover:underline text-blue-600"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {order.items?.length || 0} line(s)
                      </td>
                      <td className="py-2.5 text-right font-medium text-slate-900">
                        ₹{parseFloat(order.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
