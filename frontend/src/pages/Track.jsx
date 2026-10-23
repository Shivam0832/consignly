import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import TrackForm from "../components/TrackForm";
import Waybill from "../components/Waybill";
import Timeline from "../components/Timeline";
import Empty from "../components/Empty";
import { api } from "../api/client";
import { day } from "../lib/orderStatus";

export default function Track() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = code ? `Tracking ${code} · Consignly` : "Track a parcel · Consignly";
    if (!code) return;
    setLoading(true); setError(""); setData(null);
    api.get(`/track/${encodeURIComponent(code)}`)
      .then((d) => setData(d.tracking))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="public">
      <PublicNav />
      <div className="track-page">
        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>Track a parcel</h1>
        <TrackForm initial={code || ""} autoFocus={!code} key={code || "empty"} />

        <div style={{ marginTop: 28 }}>
          {loading && <div className="skeleton" style={{ height: 260, borderRadius: 22 }} />}
          {error && (
            <div className="card">
              <Empty title="We couldn't find that parcel">{error}</Empty>
            </div>
          )}
          {data && (
            <div className="stack">
              <Waybill order={data} />
              {data.scheduledDate && <div className="notice notice-info">Scheduled for {day(data.scheduledDate)}.</div>}
              <div className="card">
                <div className="card-head"><h2>History</h2></div>
                <Timeline history={data.trackingHistory} showNotes={false} />
              </div>
              <p className="muted" style={{ fontSize: 13 }}>Sent this parcel? <Link to="/login">Sign in</Link> to see the full details and manage it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
