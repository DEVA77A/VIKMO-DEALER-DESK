import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  AlertCircle,
  X,
  Trash2,
} from "lucide-react";
import {
  getOrders,
  getOrder,
  createOrder,
  confirmOrder,
  cancelOrder,
  dispatchOrder,
  deliverOrder,
  getDealers,
  getProducts,
} from "../services/api";
import { StatusBadge } from "../components/Badge";
import { TableSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";

const STATUS_FILTERS = [
  "ALL",
  "DRAFT",
  "CONFIRMED",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
];

export function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetOrderParam = searchParams.get("order");

  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Order Detail View
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Order Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dealersList, setDealersList] = useState([]);
  const [newOrderDealerId, setNewOrderDealerId] = useState("");
  const [newOrderItems, setNewOrderItems] = useState([{ sku: "", quantity: 1 }]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  useEffect(() => {
    if (targetOrderParam) {
      handleViewOrder(targetOrderParam);
    }
  }, [targetOrderParam]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: 20 };
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await getOrders(params);
      setOrders(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderNumber) => {
    setDetailLoading(true);
    setActionError(null);
    try {
      const data = await getOrder(orderNumber);
      setSelectedOrder(data);
    } catch (err) {
      setActionError(err.message || "Failed to load order details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    setCreateError(null);
    try {
      const dRes = await getDealers({ page_size: 50 });
      setDealersList(dRes.results || []);
      if (dRes.results && dRes.results.length > 0) {
        setNewOrderDealerId(dRes.results[0].id.toString());
      }
    } catch {
      // Ignored
    }
  };

  const handleAddItemRow = () => {
    setNewOrderItems([...newOrderItems, { sku: "", quantity: 1 }]);
  };

  const handleRemoveItemRow = (idx) => {
    setNewOrderItems(newOrderItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...newOrderItems];
    updated[idx][field] = field === "sku" ? value.toUpperCase() : parseInt(value, 10) || 1;
    setNewOrderItems(updated);
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    const validItems = newOrderItems
      .filter((it) => it.sku.trim())
      .map((it) => ({ sku: it.sku.trim(), quantity: it.quantity }));

    if (validItems.length === 0) {
      setCreateError("Please provide at least one valid item SKU and quantity.");
      setCreateSubmitting(false);
      return;
    }

    try {
      const idempotencyKey = `web-ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const res = await createOrder(
        {
          dealer_id: parseInt(newOrderDealerId, 10),
          items: validItems,
        },
        idempotencyKey
      );

      setShowCreateModal(false);
      setNewOrderItems([{ sku: "", quantity: 1 }]);
      fetchOrders();
      handleViewOrder(res.order_number);
    } catch (err) {
      setCreateError(err.message || "Failed to create order.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleTransition = async (actionType) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const orderNum = selectedOrder.order_number;
      if (actionType === "confirm") await confirmOrder(orderNum);
      else if (actionType === "dispatch") await dispatchOrder(orderNum);
      else if (actionType === "deliver") await deliverOrder(orderNum);
      else if (actionType === "cancel") await cancelOrder(orderNum);

      // Refresh order detail and list
      await handleViewOrder(orderNum);
      fetchOrders();
    } catch (err) {
      setActionError(err.message || `Failed to ${actionType} order.`);
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / 20) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Order Engine
          </h1>
          <p className="text-sm text-slate-500">
            Track dealer draft orders, exact 18% GST tax computation, and live stock allocation.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium shadow-xs self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New Draft Order</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === s
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="Create a draft order manually or through the AI Assistant."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Order Number</th>
                  <th className="px-5 py-3.5">Dealer ID</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5">Subtotal</th>
                  <th className="px-5 py-3.5">18% GST</th>
                  <th className="px-5 py-3.5 font-bold">Grand Total</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.order_number} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-900">
                      {o.order_number}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      Dealer #{o.dealer_id}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {o.items?.length || 0} line(s)
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">
                      ₹{parseFloat(o.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">
                      ₹{parseFloat(o.tax_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">
                      ₹{parseFloat(o.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleViewOrder(o.order_number)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalCount > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{orders.length}</span> of{" "}
              <span className="font-semibold">{totalCount}</span> orders
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded bg-white border border-slate-200 font-medium disabled:opacity-40 hover:bg-slate-100"
              >
                Previous
              </button>
              <span className="px-2 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded bg-white border border-slate-200 font-medium disabled:opacity-40 hover:bg-slate-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Order Modal / Slide-over */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-lg font-mono">
                    {selectedOrder.order_number}
                  </h3>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dealer ID: #{selectedOrder.dealer_id} • Created:{" "}
                  {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner if action fails */}
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Order Line Items
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Part Name</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                      <th className="px-3 py-2 text-right">18% GST</th>
                      <th className="px-3 py-2 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">
                          {it.sku}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{it.name}</td>
                        <td className="px-3 py-2 text-center font-semibold">
                          {it.quantity}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          ₹{parseFloat(it.unit_price).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          ₹{parseFloat(it.line_subtotal).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          ₹{parseFloat(it.line_tax).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          ₹{parseFloat(it.line_total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Totals Card */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Net Amount):</span>
                <span className="font-mono">₹{parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (18% Rounded Half Up to Paisa):</span>
                <span className="font-mono">₹{parseFloat(selectedOrder.tax_total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono text-slate-900">
                  ₹{parseFloat(selectedOrder.grand_total).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Lifecycle Action Buttons */}
            <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Current status: <span className="font-semibold">{selectedOrder.status}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedOrder.status === "DRAFT" && (
                  <>
                    <button
                      onClick={() => handleTransition("confirm")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Lock Stock</span>
                    </button>
                    <button
                      onClick={() => handleTransition("cancel")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Draft</span>
                    </button>
                  </>
                )}

                {selectedOrder.status === "CONFIRMED" && (
                  <>
                    <button
                      onClick={() => handleTransition("dispatch")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs disabled:opacity-50"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch Order</span>
                    </button>
                    <button
                      onClick={() => handleTransition("cancel")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel & Restore Stock</span>
                    </button>
                  </>
                )}

                {selectedOrder.status === "DISPATCHED" && (
                  <button
                    onClick={() => handleTransition("deliver")}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs disabled:opacity-50"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Mark as Delivered</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Draft Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-900 text-base">
                Create New Draft Order
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select Dealer *
                </label>
                <select
                  value={newOrderDealerId}
                  onChange={(e) => setNewOrderDealerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {dealersList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dealer_code} — {d.name} ({d.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Order Items *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newOrderItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        placeholder="SKU (e.g. BRK-1044)"
                        value={item.sku}
                        onChange={(e) => handleItemChange(idx, "sku", e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      {newOrderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {createError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-sm disabled:opacity-50"
                >
                  {createSubmitting ? "Creating Order..." : "Create Draft Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
