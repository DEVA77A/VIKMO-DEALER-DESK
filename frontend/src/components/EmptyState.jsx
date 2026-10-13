import React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title = "No records found",
  description = "There are no records matching your request.",
  icon: Icon = Inbox,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center card-warm my-4">
      <div className="p-3.5 bg-[#EBD1B2] rounded-full text-[#817568] mb-3 shadow-inner">
        <Icon className="w-7 h-7 text-[#D96A25]" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[#211D1B] mb-1">{title}</h3>
      <p className="text-sm text-[#817568] max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
