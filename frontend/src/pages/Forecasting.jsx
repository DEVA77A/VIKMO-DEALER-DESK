import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ShieldCheck,
  Search,
  Clock,
  ArrowUpRight,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getReorderSuggestions, getForecast } from "../services/api";
import { StockBadge } from "../components/Badge";
import { TableSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";

export function Forecasting() {
  const [reorders, setReorders] = useState([]);
  const [loadingReorders, setLoadingReorders] = useState(true);
  const [reordersError, setReordersError] = useState(null);

  // Selected SKU for forecast chart
  const [selectedSku, setSelectedSku] = useState("");
  const [forecastData, setForecastData] = useState([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  // Table search filter
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchReorders();
  }, []);

  useEffect(() => {
    if (selectedSku) {
      fetchSkuForecast(selectedSku);
    }
  }, [selectedSku]);

  const fetchReorders = async () => {
    setLoadingReorders(true);
    setReordersError(null);
    try {
      const res = await getReorderSuggestions();
      const list = res.results || [];
      setReorders(list);
      if (list.length > 0 && !selectedSku) {
        // Default to first SKU with reorder_qty > 0 or first SKU
        const topUrgent = list.find((x) => x.reorder_qty > 0) || list[0];
        setSelectedSku(topUrgent.sku);
      }
    } catch (err) {
      setReordersError(err.message || "Failed to load reorder recommendations.");
    } finally {
      setLoadingReorders(false);
    }
  };

  const fetchSkuForecast = async (sku) => {
    setLoadingForecast(true);
    setForecastError(null);
    try {
      const res = await getForecast(sku);
      setForecastData(res.forecast || []);
    } catch (err) {
      setForecastError(err.message || `Failed to load forecast for ${sku}.`);
    } finally {
      setLoadingForecast(false);
    }
  };

  const selectedMetrics = reorders.find((r) => r.sku === selectedSku);

  const filteredReorders = reorders.filter((r) =>
    r.sku.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Demand Forecasting & Reorder Analytics
          </h1>
          <p className="text-sm text-slate-500">
            Automated 4-week demand predictions, moving festival modeling, and safety stock calculations.
          </p>
        </div>
      </div>

      {/* Top Section: Deep Dive Chart & SKU KPI Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                4-Week Demand Curve: {selectedSku}
              </h2>
              <p className="text-xs text-slate-500">
                Validated time-series predictions from ML pipeline (ml/forecast.csv)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Switch SKU:</span>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {reorders.map((r) => (
                <option key={r.sku} value={r.sku}>
                  {r.sku} {r.reorder_qty > 0 ? `(Reorder: +${r.reorder_qty})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected SKU Metric Badges */}
        {selectedMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Live Stock
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {selectedMetrics.current_stock} units
              </div>
              <div className="text-[11px] text-slate-400">Available warehouse inventory</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Supplier Lead Time
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {selectedMetrics.lead_time_weeks} {selectedMetrics.lead_time_weeks === 1 ? "week" : "weeks"}
              </div>
              <div className="text-[11px] text-slate-400">Restock lead delay (L)</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Lead Time Demand
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {selectedMetrics.lead_time_demand}
              </div>
              <div className="text-[11px] text-slate-400">Forecast units across L weeks</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Safety Stock Buffer
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {selectedMetrics.safety_stock}
              </div>
              <div className="text-[11px] text-slate-400">ceil(1.65 × σ × √L)</div>
            </div>

            <div className={`p-3 rounded-lg border ${
              selectedMetrics.reorder_qty > 0
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}>
              <div className="text-[11px] font-medium uppercase tracking-wider">
                Suggested Reorder Qty
              </div>
              <div className="text-xl font-bold mt-1">
                {selectedMetrics.reorder_qty > 0 ? `+${selectedMetrics.reorder_qty} units` : "0 (Adequate)"}
              </div>
              <div className="text-[11px] opacity-80">
                Reorder point: {selectedMetrics.reorder_point}
              </div>
            </div>
          </div>
        )}

        {/* Recharts Weekly Demand Graph */}
        <div className="h-64 w-full pt-2">
          {loadingForecast ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Loading forecast curve...
            </div>
          ) : forecastError ? (
            <div className="h-full flex items-center justify-center text-xs text-red-500">
              {forecastError}
            </div>
          ) : forecastData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No weekly forecast points available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="week_start"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val) => [`${val} units`, "Forecast Demand"]}
                  labelFormatter={(lbl) => `Week: ${lbl}`}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    border: "none",
                  }}
                />
                <Bar
                  dataKey="forecast_units"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  name="Forecasted Units"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Section: 40 SKUs Reorder Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              All 40 Forecast SKUs & Inventory Thresholds
            </h3>
            <p className="text-xs text-slate-500">
              Calculated dynamically using live available warehouse inventory.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by SKU code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
            />
          </div>
        </div>

        {loadingReorders ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : reordersError ? (
          <div className="p-6 text-center text-red-600 text-sm">
            {reordersError}
          </div>
        ) : filteredReorders.length === 0 ? (
          <EmptyState
            title="No matching forecast SKUs"
            description="Clear search term to view all 40 SKUs."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">SKU Code</th>
                  <th className="px-5 py-3.5">Live Stock</th>
                  <th className="px-5 py-3.5">Lead Time (L)</th>
                  <th className="px-5 py-3.5">Lead Demand</th>
                  <th className="px-5 py-3.5">Safety Stock</th>
                  <th className="px-5 py-3.5">Reorder Point</th>
                  <th className="px-5 py-3.5 text-right">Reorder Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReorders.map((r) => {
                  const isSelected = r.sku === selectedSku;
                  const isUrgent = r.reorder_qty > 0;
                  return (
                    <tr
                      key={r.sku}
                      onClick={() => setSelectedSku(r.sku)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-50/70"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs font-bold text-slate-900">
                        {r.sku}
                        {isSelected && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-slate-950 font-bold">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StockBadge stock={r.current_stock} />
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {r.lead_time_weeks} {r.lead_time_weeks === 1 ? "wk" : "wks"}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-slate-600">
                        {r.lead_time_demand}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-slate-600">
                        {r.safety_stock}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-slate-700 font-semibold">
                        {r.reorder_point}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold">
                        {isUrgent ? (
                          <span className="text-amber-600 bg-amber-100/70 px-2 py-0.5 rounded text-xs">
                            +{r.reorder_qty} units
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
