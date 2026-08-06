# models/__init__.py
#
# This package re-exports every public symbol from the sub-modules so that
# existing code that does `from app.models import X` continues to work
# without any changes.
#
# Sub-module layout:
#   user.py          – User, UserAssignment, StaffInvitation, SessionTable, Account, Verification
#   business.py      – Business, Location
#   inventory.py     – CategoryStatus, Category, OrderingMethod, Supplier,
#                      StockItem, StockItemLocation, CountingOption
#   recipes.py       – RecipeStatus, Recipe, RecipeIngredient
#   stock_counts.py  – StockCountStatus, StockCountSession, StockCountItem
#   purchase_orders.py – PurchaseOrderStatus, PurchaseOrder, PurchaseOrderItem
#   deliveries.py    – DeliveryStatus, Delivery, DeliveryItem
#   transfers.py     – StockTransferStatus, StockTransfer, StockTransferItem
#   sales.py         – SaleStatus, Sale, SaleItem, SalesImport
#   reconciliation.py – Reconciliation, ReconciliationItem
#   workforce.py     – Timesheet, StaffAvailability, StaffAvailabilityDay,
#                      StaffAvailabilitySlot, RosterSettings, TimesheetSettings, RosterShift
#   misc.py          – ContactMessage, ExternalUserLead, SquareToken

# Import sub-modules in dependency order so SQLModel's forward references
# can resolve correctly at startup.
from app.models.user import (  # noqa: F401
    User,
    UserAssignment,
    StaffInvitation,
    SessionTable,
    Account,
    Verification,
)
from app.models.business import (  # noqa: F401
    Business,
    Location,
)
from app.models.inventory import (  # noqa: F401
    CategoryStatus,
    Category,
    OrderingMethod,
    Supplier,
    StockItem,
    StockItemLocation,
    CountingOption,
)
from app.models.recipes import (  # noqa: F401
    RecipeStatus,
    Recipe,
    RecipeIngredient,
)
from app.models.stock_counts import (  # noqa: F401
    StockCountStatus,
    StockCountSession,
    StockCountItem,
)
from app.models.purchase_orders import (  # noqa: F401
    PurchaseOrderStatus,
    PurchaseOrder,
    PurchaseOrderItem,
)
from app.models.deliveries import (  # noqa: F401
    DeliveryStatus,
    Delivery,
    DeliveryItem,
)
from app.models.transfers import (  # noqa: F401
    StockTransferStatus,
    StockTransfer,
    StockTransferItem,
)
from app.models.sales import (  # noqa: F401
    SaleStatus,
    Sale,
    SaleItem,
    SalesImport,
)
from app.models.reconciliation import (  # noqa: F401
    Reconciliation,
    ReconciliationItem,
)
from app.models.workforce import (  # noqa: F401
    Timesheet,
    StaffAvailability,
    StaffAvailabilityDay,
    StaffAvailabilitySlot,
    RosterSettings,
    TimesheetSettings,
    RosterShift,
)
from app.models.misc import (  # noqa: F401
    ContactMessage,
    ExternalUserLead,
    SquareToken,
    SquareImportHistory,
)

__all__ = [
    # user
    "User",
    "UserAssignment",
    "StaffInvitation",
    "SessionTable",
    "Account",
    "Verification",
    # business
    "Business",
    "Location",
    # inventory
    "CategoryStatus",
    "Category",
    "OrderingMethod",
    "Supplier",
    "StockItem",
    "StockItemLocation",
    "CountingOption",
    # recipes
    "RecipeStatus",
    "Recipe",
    "RecipeIngredient",
    # stock counts
    "StockCountStatus",
    "StockCountSession",
    "StockCountItem",
    # purchase orders
    "PurchaseOrderStatus",
    "PurchaseOrder",
    "PurchaseOrderItem",
    # deliveries
    "DeliveryStatus",
    "Delivery",
    "DeliveryItem",
    # transfers
    "StockTransferStatus",
    "StockTransfer",
    "StockTransferItem",
    # sales
    "SaleStatus",
    "Sale",
    "SaleItem",
    "SalesImport",
    # reconciliation
    "Reconciliation",
    "ReconciliationItem",
    # workforce
    "Timesheet",
    "StaffAvailability",
    "StaffAvailabilityDay",
    "StaffAvailabilitySlot",
    "RosterSettings",
    "TimesheetSettings",
    "RosterShift",
    # misc
    "ContactMessage",
    "ExternalUserLead",
    "SquareToken",
    "SquareImportHistory",
]

