import React from "react";

export function StatusBadge({ status }) {
  const statusConfig = {
    DRAFT: {
      bg: "bg-[#F9EEDD] text-[#8F6322] border-[#E7D0B4]",
      label: "Draft",
      dot: "bg-[#D69B43]",
    },
    CONFIRMED: {
      bg: "bg-[#F4D5B7] text-[#9A4613] border-[#E5BC96]",
      label: "Confirmed",
      dot: "bg-[#D96A25]",
    },
    DISPATCHED: {
      bg: "bg-[#EBDDCB] text-[#735A42] border-[#D9C4AC]",
      label: "Dispatched",
      dot: "bg-[#9A7B5C]",
    },
    DELIVERED: {
      bg: "bg-[#E6EFE4] text-[#3F6236] border-[#C7DCBF]",
      label: "Delivered",
      dot: "bg-[#73956A]",
    },
    CANCELLED: {
      bg: "bg-[#F7E3E0] text-[#9E3324] border-[#EBBFB8]",
      label: "Cancelled",
      dot: "bg-[#B94A3A]",
    },
  };

  const config = statusConfig[status] || {
    bg: "bg-[#F2DEC4] text-[#817568] border-[#E8D5BD]",
    label: status,
    dot: "bg-[#817568]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}

export function StockBadge({ stock }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F7E3E0] text-[#9E3324] border border-[#EBBFB8]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#B94A3A]" />
        Out of Stock
      </span>
    );
  }
  if (stock < 20) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F9EEDD] text-[#8F6322] border border-[#E7D0B4]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D69B43]" />
        Low ({stock})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6EFE4] text-[#3F6236] border border-[#C7DCBF]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#73956A]" />
      {stock} units
    </span>
  );
}
