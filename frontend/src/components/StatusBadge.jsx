import { label } from "../lib/orderStatus";

const STYLES = {
  PLACED: "badge-slate",
  ASSIGNED: "badge-amber",
  PICKED_UP: "badge-amber",
  IN_TRANSIT: "badge-amber",
  OUT_FOR_DELIVERY: "badge-amber",
  DELIVERED: "badge-teal",
  FAILED: "badge-rust",
  RESCHEDULED: "badge-slate",
  CANCELLED: "badge-rust",
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || "badge-slate";
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      {label(status)}
    </span>
  );
}
