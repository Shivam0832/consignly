import { Link } from "react-router-dom";
import { Calculator, Route, ShieldCheck } from "lucide-react";
import PublicNav from "../components/PublicNav";
import TrackForm from "../components/TrackForm";
import Waybill from "../components/Waybill";

// A sample parcel for the hero, so visitors see exactly what tracking looks like.
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const SAMPLE = {
  orderNumber: "LM-MVKZ6L3O-RFBV",
  status: "IN_TRANSIT",
  pickupPincode: "110001",
  dropPincode: "560001",
  pickupZone: { name: "North Zone" },
  dropZone: { name: "South Zone" },
  trackingHistory: [
    { status: "PLACED", createdAt: ago(30) },
    { status: "ASSIGNED", createdAt: ago(29) },
    { status: "PICKED_UP", createdAt: ago(26) },
    { status: "IN_TRANSIT", createdAt: ago(3) },
  ],
};

export default function Landing() {
  return (
    <div className="public">
      <PublicNav />
      <section className="hero">
        <div>
          <h1>Every parcel, door to door, in plain sight.</h1>
          <p className="lede">Get a price before you book, watch your parcel move across zones, and reschedule in a tap if a delivery is missed.</p>
          <TrackForm />
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">Book a delivery</Link>
            <Link to="/login" className="btn btn-quiet btn-lg">Sign in</Link>
          </div>
        </div>
        <div aria-label="Example of a tracked parcel">
          <Waybill order={SAMPLE} from="Connaught Place, New Delhi" to="Ashok Nagar, Bengaluru" />
        </div>
      </section>

      <section className="features" aria-label="What you get">
        <div className="feature">
          <Calculator aria-hidden="true" />
          <h3>The price, up front</h3>
          <p>Charges come from size, weight and route, and you see the full breakdown before you confirm.</p>
        </div>
        <div className="feature">
          <Route aria-hidden="true" />
          <h3>Live tracking</h3>
          <p>Each step is stamped with the time, and you get an email and SMS when the status changes.</p>
        </div>
        <div className="feature">
          <ShieldCheck aria-hidden="true" />
          <h3>Missed delivery? Pick a new day</h3>
          <p>If nobody was home, choose a new date and a fresh agent is assigned automatically.</p>
        </div>
      </section>

      <footer className="public-foot">Consignly, last-mile delivery for India.</footer>
    </div>
  );
}
