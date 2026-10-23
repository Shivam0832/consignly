import { ArrowRight } from "lucide-react";

export default function RouteCell({ order }) {
  return (
    <div>
      <div className="route-cell code">{order.pickupPincode}<ArrowRight aria-label="to" />{order.dropPincode}</div>
      <div className="cell-sub">{order.pickupZone?.name || "?"} to {order.dropZone?.name || "?"}</div>
    </div>
  );
}
