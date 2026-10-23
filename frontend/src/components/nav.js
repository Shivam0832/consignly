import {
  LayoutDashboard, PackageSearch, PackagePlus, Map, BadgeIndianRupee, Users, Package, Route,
} from "lucide-react";

export const NAV = {
  CUSTOMER: [
    { to: "/customer", label: "My orders", icon: Package, end: true },
    { to: "/customer/new", label: "Book a delivery", icon: PackagePlus },
  ],
  AGENT: [
    { to: "/agent", label: "My deliveries", icon: Route, end: true },
  ],
  ADMIN: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/orders", label: "Orders", icon: PackageSearch },
    { to: "/admin/new-order", label: "Book for a customer", icon: PackagePlus },
    { group: "Setup" },
    { to: "/admin/agents", label: "Agents", icon: Users },
    { to: "/admin/zones", label: "Zones & pincodes", icon: Map },
    { to: "/admin/rates", label: "Pricing", icon: BadgeIndianRupee },
  ],
};

export const homeFor = (role) => (role === "ADMIN" ? "/admin" : role === "AGENT" ? "/agent" : "/customer");
