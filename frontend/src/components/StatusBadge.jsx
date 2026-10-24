import { TONE, label } from "../lib/orderStatus";

export default function StatusBadge({ status }) {
  return <span className={`badge tone-${TONE[status] || "wait"}`}>{label(status)}</span>;
}
