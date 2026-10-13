import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Plus,
  Bot,
  MapPin,
  Phone,
  Mail,
  FileText,
  CreditCard,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { getDealers, createDealer } from "../services/api";
import { TableSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";

export function Dealers() {
  const [dealers, setDealers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Create Dealer Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    dealer_code: "",
    name: "",
    city: "Bengaluru",
    phone: "",
    email: "",
    gstin: "",
    credit_limit: "500000.00",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    fetchDealers();
  }, [page, pageSize]);

  const fetchDealers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDealers({ page, page_size: pageSize });
      setDealers(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load dealers list.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDealer = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createDealer(createData);
      setShowCreateModal(false);
      setCreateData({
        dealer_code: "",
        name: "",
        city: "Bengaluru",
        phone: "",
        email: "",
        gstin: "",
        credit_limit: "500000.00",
      });
      fetchDealers();
    } catch (err) {
      setCreateError(err.message || "Failed to create dealer.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#73956A]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Distribution Partners
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#211D1B]">
            Authorized Dealers
          </h1>
          <p className="text-sm text-[#817568] mt-1 max-w-xl">
            Manage distributor network, contact profiles, and approved commercial credit lines across South India.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-sm shadow-xs self-start sm:self-auto flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Dealer</span>
        </button>
      </div>

      {/* Content Section */}
      <div className="card-warm rounded-3xl border border-[#E8D5BD] overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[#B94A3A]">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#B94A3A]" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : dealers.length === 0 ? (
          <EmptyState
            title="No dealers found"
            description="Add a new dealer or run seed_data."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-[#E8D5BD]/60">
              <thead className="bg-[#EBD1B2] text-xs font-semibold text-[#817568] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Dealer Code</th>
                  <th className="px-5 py-3.5 min-w-[180px]">Dealer Name</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Location</th>
                  <th className="px-5 py-3.5 min-w-[200px]">Contact Details</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">GSTIN</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Credit Limit</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D5BD]/60">
                {dealers.map((d) => (
                  <tr key={d.id} className="hover:bg-[#FAF2E8] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#211D1B] whitespace-nowrap">
                      {d.dealer_code}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#211D1B]">
                      {d.name}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#817568] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#D96A25]" />
                        <span>{d.city || "South India"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#817568]">
                      <div className="space-y-0.5">
                        {d.phone && (
                          <div className="flex items-center gap-1.5 text-[#817568]">
                            <Phone className="w-3 h-3 text-[#A39788]" />
                            <span>{d.phone}</span>
                          </div>
                        )}
                        {d.email && (
                          <div className="flex items-center gap-1.5 text-[#817568]">
                            <Mail className="w-3 h-3 text-[#A39788]" />
                            <span>{d.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#817568] whitespace-nowrap">
                      {d.gstin || "—"}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#211D1B] whitespace-nowrap">
                      ₹{parseFloat(d.credit_limit || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <Link
                        to={`/assistant?dealer_id=${d.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#BE571B] bg-[#F4D5B7] hover:bg-[#EBD1B2] px-3.5 py-1.5 rounded-full transition-colors"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>Chat as Dealer</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalCount > 0 && (
          <div className="px-6 py-4 border-t border-[#E8D5BD] bg-[#EBD1B2]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#817568]">
            <div>
              Showing <span className="font-bold text-[#211D1B]">{dealers.length}</span> of{" "}
              <span className="font-bold text-[#211D1B]">{totalCount}</span> dealers
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary text-xs px-3.5 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-[#211D1B]">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary text-xs px-3.5 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Dealer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#211D1B]/50 backdrop-blur-xs">
          <div className="card-warm bg-[#F7E6D0] rounded-3xl border border-[#E8D5BD] shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8D5BD] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D96A25]">
                  NETWORK ONBOARDING
                </span>
                <h3 className="font-display font-bold text-xl text-[#211D1B]">
                  Register Authorized Dealer
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-[#EBD1B2] text-[#817568]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDealer} className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    Dealer Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DLR-8820"
                    value={createData.dealer_code}
                    onChange={(e) =>
                      setCreateData({
                        ...createData,
                        dealer_code: e.target.value.toUpperCase(),
                      })
                    }
                    className="input-warm w-full text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    City / Hub *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru, Chennai"
                    value={createData.city}
                    onChange={(e) =>
                      setCreateData({ ...createData, city: e.target.value })
                    }
                    className="input-warm w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                  Dealer Name / Firm *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cauvery Auto Spares"
                  value={createData.name}
                  onChange={(e) =>
                    setCreateData({ ...createData, name: e.target.value })
                  }
                  className="input-warm w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={createData.phone}
                    onChange={(e) =>
                      setCreateData({ ...createData, phone: e.target.value })
                    }
                    className="input-warm w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="dealer@example.com"
                    value={createData.email}
                    onChange={(e) =>
                      setCreateData({ ...createData, email: e.target.value })
                    }
                    className="input-warm w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    GSTIN (15 Digits)
                  </label>
                  <input
                    type="text"
                    placeholder="29AAAAA0000A1Z5"
                    value={createData.gstin}
                    onChange={(e) =>
                      setCreateData({
                        ...createData,
                        gstin: e.target.value.toUpperCase(),
                      })
                    }
                    className="input-warm w-full text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    Credit Limit (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    required
                    placeholder="500000.00"
                    value={createData.credit_limit}
                    onChange={(e) =>
                      setCreateData({ ...createData, credit_limit: e.target.value })
                    }
                    className="input-warm w-full text-sm font-semibold"
                  />
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-[#F7E3E0] text-[#9E3324] text-xs font-medium rounded-xl border border-[#EBBFB8]">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  {createSubmitting ? "Onboarding..." : "Register Dealer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
