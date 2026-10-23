import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

export default function TrackForm({ initial = "", autoFocus = false }) {
  const navigate = useNavigate();
  const [code, setCode] = useState(initial);
  return (
    <form
      className="track-form"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = code.trim().toUpperCase();
        if (v) navigate(`/track/${encodeURIComponent(v)}`);
      }}
    >
      <label htmlFor="track-code" className="sr-only">Tracking number</label>
      <input id="track-code" className="input grow" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Tracking number, e.g. LM-MVKZ6L3O-RFBV" autoComplete="off" spellCheck="false" autoFocus={autoFocus} />
      <button className="btn btn-dark btn-lg" type="submit"><Search aria-hidden="true" />Track</button>
    </form>
  );
}
