import { DELIVERY_STEPS, label } from "../lib/orderStatus";

/**
 * Horizontal "where is my parcel" tracker. FAILED / RESCHEDULED / CANCELLED
 * are shown as a note under the steps rather than as steps of their own.
 */
export default function StatusStepper({ status, history = [] }) {
  // How far the parcel actually got, even if it later failed or was cancelled.
  const reached = Math.max(
    DELIVERY_STEPS.indexOf(status),
    ...history.map((h) => DELIVERY_STEPS.indexOf(h.status)),
  );
  // After a reschedule the parcel restarts from "Assigned".
  const current = status === "RESCHEDULED" ? 0 : DELIVERY_STEPS.indexOf(status) === -1 ? reached : DELIVERY_STEPS.indexOf(status);
  const off = status === "CANCELLED" || status === "FAILED";

  return (
    <div className="stepper-wrap">
      <ol className="stepper" aria-label="Delivery progress">
        {DELIVERY_STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? (off ? "halted" : "current") : "todo";
          return (
            <li key={s} className={`step step-${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="step-dot">{state === "done" ? "✓" : i + 1}</span>
              <span className="step-label">{label(s)}</span>
            </li>
          );
        })}
      </ol>
      {status === "FAILED" && <p className="stepper-note is-bad">Delivery attempt failed at this step.</p>}
      {status === "CANCELLED" && <p className="stepper-note is-bad">This order was cancelled.</p>}
      {status === "RESCHEDULED" && <p className="stepper-note">Rescheduled — waiting for a new agent.</p>}
    </div>
  );
}
