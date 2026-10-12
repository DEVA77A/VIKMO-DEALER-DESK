import React from "react";

export function StatusBadge({ status }) {
  const statusConfig = {
    DRAFT: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Draft" },
    CONFIRMED: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Confirmed" },
    DISPATCHED: { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Dispatched" },
    DELIVERED: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Delivered" },
    CANCELLED: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Cancelled" },
  };

  const config = statusConfig[status] || {
    bg: "bg-slate-50 text-slate-700 border-slate-200",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}
    >
      {config.label}
    </span>
  );
}

export function StockBadge({ stock }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
        Out of Stock
      </span>
    );
  }
  if (stock < 20) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        Low ({stock})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
      {stock} units
    </span>
  );
}
