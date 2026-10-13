import React from "react";

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full animate-pulse space-y-3 p-4">
      <div className="h-9 bg-[#EBD1B2]/60 rounded-xl w-full"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-7 bg-[#EBD1B2]/40 rounded-lg flex-1"
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 card-warm animate-pulse space-y-3"
        >
          <div className="h-3.5 bg-[#EBD1B2] rounded-md w-1/2"></div>
          <div className="h-8 bg-[#EBD1B2] rounded-lg w-3/4"></div>
          <div className="h-3 bg-[#EBD1B2]/60 rounded-md w-full"></div>
        </div>
      ))}
    </div>
  );
}
