import re
from decimal import Decimal
from django.db.models import Q
from core.models import Product, Dealer
from core.services import create_draft_order as service_create_draft_order


class AssistantToolRegistry:
    def __init__(self, dealer_id: int):
        self.dealer_id = dealer_id
        self.recorded_tool_calls = []
        self.recorded_actions = []
        self.cited_skus = set()

    def search_parts(self, query: str, vehicle: str = None) -> dict:
        """Search catalogue for spare parts matching query and optional vehicle fitment."""
        self.recorded_tool_calls.append({
            "name": "search_parts",
            "arguments": {k: v for k, v in {"query": query, "vehicle": vehicle}.items() if v is not None},
        })

        qs = Product.objects.all()
        if vehicle and vehicle.strip():
            qs = qs.filter(vehicle_fitment__icontains=vehicle.strip())

        if query and query.strip():
            terms = query.strip().split()
            q_filter = Q()
            for term in terms:
                q_filter |= (
                    Q(sku__icontains=term)
                    | Q(name__icontains=term)
                    | Q(category__icontains=term)
                    | Q(brand__icontains=term)
                    | Q(vehicle_fitment__icontains=term)
                )
            qs = qs.filter(q_filter)

        products = qs.order_by("sku")[:10]
        results = []
        for p in products:
            self.cited_skus.add(p.sku)
            results.append({
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "brand": p.brand,
                "vehicle_fitment": p.vehicle_fitment,
                "price": f"{p.price:.2f}",
                "stock": p.stock,
            })

        return {"count": len(results), "products": results}

    def check_stock(self, sku: str) -> dict:
        """Check current available stock for a specific product SKU."""
        clean_sku = sku.strip().upper() if sku else ""
        self.recorded_tool_calls.append({
            "name": "check_stock",
            "arguments": {"sku": sku},
        })

        product = Product.objects.filter(sku__iexact=clean_sku).first()
        if not product:
            return {"error": f"Product with SKU '{sku}' not found", "available": False}

        self.cited_skus.add(product.sku)
        return {
            "sku": product.sku,
            "name": product.name,
            "stock": product.stock,
            "price": f"{product.price:.2f}",
            "available": product.stock > 0,
        }

    def create_draft_order(self, items: list) -> dict:
        """Create a draft order for specified items. Dealer ID is server-controlled."""
        self.recorded_tool_calls.append({
            "name": "create_draft_order",
            "arguments": {"items": items},
        })

        if not items or not isinstance(items, list):
            return {"error": "Items list cannot be empty"}

        cleaned_items = []
        for it in items:
            if not isinstance(it, dict):
                return {"error": "Invalid item structure"}
            sku = it.get("sku", "").strip().upper()
            try:
                qty = int(it.get("quantity", 0))
            except (ValueError, TypeError):
                return {"error": f"Invalid quantity for SKU {sku}"}

            if qty < 1:
                return {"error": f"Quantity for SKU {sku} must be >= 1"}
            cleaned_items.append({"sku": sku, "quantity": qty})

        try:
            order_data, _, _ = service_create_draft_order(
                dealer_id=self.dealer_id,
                items_data=cleaned_items,
            )
            order_number = order_data["order_number"]
            self.recorded_actions.append({
                "type": "draft_order_created",
                "order_number": order_number,
            })
            for it in cleaned_items:
                self.cited_skus.add(it["sku"])

            return {
                "success": True,
                "order_number": order_number,
                "status": "DRAFT",
                "subtotal": order_data["subtotal"],
                "tax_total": order_data["tax_total"],
                "grand_total": order_data["grand_total"],
            }
        except Exception as e:
            return {"error": str(e)}
