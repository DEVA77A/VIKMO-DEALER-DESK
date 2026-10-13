import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  Edit3,
  X,
  Check,
  AlertCircle,
  Package,
} from "lucide-react";
import {
  getProducts,
  updateInventory,
  createProduct,
} from "../services/api";
import { StockBadge } from "../components/Badge";
import { TableSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";

const CATEGORIES = [
  "All Categories",
  "Accessories",
  "Batteries & Electricals",
  "Brakes",
  "Cables & Controls",
  "Chain & Sprockets",
  "Engine & Oils",
  "Filters",
  "Grips & Levers",
  "Lighting & Indicators",
  "Tyres & Tubes",
];

const VEHICLES = [
  "All Vehicles",
  "Universal",
  "Bajaj Pulsar 150",
  "Bajaj Dominar 400",
  "KTM Duke 390",
  "TVS Apache RTR 160",
  "TVS Apache RTR 200",
  "Hero Splendor Plus",
  "Honda CB Shine",
  "Honda Activa 6G",
  "Suzuki Gixxer SF",
  "Royal Enfield Classic 350",
  "Yamaha FZ-S",
];

export function Products() {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedVehicle, setSelectedVehicle] = useState("All Vehicles");

  // Inventory Edit Modal
  const [editProduct, setEditProduct] = useState(null);
  const [newStock, setNewStock] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockError, setStockError] = useState(null);

  // New Product Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    sku: "",
    name: "",
    category: "Brakes",
    brand: "",
    vehicle_fitment: "Universal",
    price: "",
    description: "",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [page, pageSize, search, selectedCategory, selectedVehicle]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== "All Categories") params.category = selectedCategory;
      if (selectedVehicle !== "All Vehicles") params.vehicle = selectedVehicle;

      const res = await getProducts(params);
      setProducts(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      setError(err.message || "Failed to load products catalogue.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleStockUpdate = async (e) => {
    e.preventDefault();
    setStockSubmitting(true);
    setStockError(null);
    try {
      const qty = parseInt(newStock, 10);
      if (isNaN(qty) || qty < 0) {
        throw new Error("Quantity must be a non-negative integer.");
      }
      await updateInventory(editProduct.sku, {
        quantity: qty,
        reason: stockReason.trim() || undefined,
      });
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      setStockError(err.message || "Failed to update stock.");
    } finally {
      setStockSubmitting(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const p = parseFloat(createData.price);
      if (isNaN(p) || p <= 0) {
        throw new Error("Price must be a positive number.");
      }
      await createProduct({
        ...createData,
        price: p.toFixed(2),
      });
      setShowCreateModal(false);
      setCreateData({
        sku: "",
        name: "",
        category: "Brakes",
        brand: "",
        vehicle_fitment: "Universal",
        price: "",
        description: "",
      });
      fetchProducts();
    } catch (err) {
      setCreateError(err.message || "Failed to create product.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-8">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#73956A]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Verified Inventory
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#211D1B]">
            Product Catalogue
          </h1>
          <p className="text-sm text-[#817568] mt-1 max-w-xl">
            Browse and manage 600 catalogue items, live warehouse stock levels, and distributor pricing.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-sm shadow-xs self-start sm:self-auto flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-warm p-5 sm:p-6 rounded-3xl border border-[#E8D5BD] space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-3.5 text-[#817568]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by SKU, part name, or brand..."
              className="input-warm w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="btn-primary text-xs px-5 py-2.5"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              className="btn-ghost text-xs px-4"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#E8D5BD]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="input-warm text-xs py-1.5 px-3"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Fitment:
            </span>
            <select
              value={selectedVehicle}
              onChange={(e) => {
                setSelectedVehicle(e.target.value);
                setPage(1);
              }}
              className="input-warm text-xs py-1.5 px-3"
            >
              {VEHICLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#817568]">
              Rows:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="input-warm text-xs py-1.5 px-3"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card-warm rounded-3xl border border-[#E8D5BD] overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[#B94A3A]">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#B94A3A]" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No matching products"
            description="Try adjusting your filters or search keywords."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-[#E8D5BD]/60">
              <thead className="bg-[#EBD1B2] text-xs font-semibold text-[#817568] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">SKU</th>
                  <th className="px-5 py-3.5 min-w-[220px]">Product Name</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Category</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Vehicle Fitment</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Price</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Stock</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D5BD]/60">
                {products.map((p) => (
                  <tr key={p.sku} className="hover:bg-[#FAF2E8] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#211D1B] whitespace-nowrap">
                      {p.sku}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#211D1B]">{p.name}</div>
                      <div className="text-xs text-[#817568]">{p.brand}</div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EBD1B2]/60 text-xs font-medium text-[#211D1B]">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#817568] whitespace-nowrap">
                      {p.vehicle_fitment}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#211D1B] whitespace-nowrap">
                      ₹{parseFloat(p.price || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StockBadge stock={p.stock} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditProduct(p);
                          setNewStock(p.stock.toString());
                          setStockReason("");
                          setStockError(null);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#BE571B] bg-[#F4D5B7] hover:bg-[#EBD1B2] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Adjust</span>
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
          <div className="px-6 py-4 border-t border-[#E8D5BD] bg-[#EBD1B2]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#817568]">
            <div>
              Showing <span className="font-bold text-[#211D1B]">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-bold text-[#211D1B]">
                {Math.min(page * pageSize, totalCount)}
              </span>{" "}
              of <span className="font-bold text-[#211D1B]">{totalCount}</span> parts
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

      {/* Adjust Inventory Modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#211D1B]/50 backdrop-blur-xs">
          <div className="card-warm bg-[#F7E6D0] rounded-3xl border border-[#E8D5BD] shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8D5BD] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D96A25]">
                  STOCK ADJUSTMENT
                </span>
                <h3 className="font-display font-bold text-xl text-[#211D1B]">
                  {editProduct.sku}
                </h3>
              </div>
              <button
                onClick={() => setEditProduct(null)}
                className="p-1.5 rounded-full hover:bg-[#EBD1B2] text-[#817568]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#817568] -mt-1">
              {editProduct.name} ({editProduct.vehicle_fitment})
            </p>

            <form onSubmit={handleStockUpdate} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1.5">
                  New Stock Count (Units) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="input-warm w-full text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1.5">
                  Adjustment Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Warehouse count audit, damaged stock"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="input-warm w-full text-sm"
                />
              </div>

              {stockError && (
                <div className="p-3 bg-[#F7E3E0] text-[#9E3324] text-xs font-medium rounded-xl border border-[#EBBFB8]">
                  {stockError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockSubmitting}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  {stockSubmitting ? "Updating..." : "Save Stock Count"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#211D1B]/50 backdrop-blur-xs">
          <div className="card-warm bg-[#F7E6D0] rounded-3xl border border-[#E8D5BD] shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8D5BD] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D96A25]">
                  CATALOGUE EXPANSION
                </span>
                <h3 className="font-display font-bold text-xl text-[#211D1B]">
                  Create New Part
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-[#EBD1B2] text-[#817568]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BRK-9901"
                    value={createData.sku}
                    onChange={(e) =>
                      setCreateData({ ...createData, sku: e.target.value.toUpperCase() })
                    }
                    className="input-warm w-full text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Endurance, Bosch"
                    value={createData.brand}
                    onChange={(e) => setCreateData({ ...createData, brand: e.target.value })}
                    className="input-warm w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Disc Brake Pad Set Front"
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  className="input-warm w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    Category *
                  </label>
                  <select
                    value={createData.category}
                    onChange={(e) => setCreateData({ ...createData, category: e.target.value })}
                    className="input-warm w-full text-sm"
                  >
                    {CATEGORIES.filter((c) => c !== "All Categories").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                    Vehicle Fitment *
                  </label>
                  <select
                    value={createData.vehicle_fitment}
                    onChange={(e) =>
                      setCreateData({ ...createData, vehicle_fitment: e.target.value })
                    }
                    className="input-warm w-full text-sm"
                  >
                    {VEHICLES.filter((v) => v !== "All Vehicles").map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                  Price (₹ INR, excluding GST) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 1499.00"
                  value={createData.price}
                  onChange={(e) => setCreateData({ ...createData, price: e.target.value })}
                  className="input-warm w-full text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#817568] mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Specifications, compatibility notes..."
                  value={createData.description}
                  onChange={(e) =>
                    setCreateData({ ...createData, description: e.target.value })
                  }
                  className="input-warm w-full text-sm"
                />
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
                  {createSubmitting ? "Creating..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
