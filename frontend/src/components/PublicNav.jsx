import { Link } from "react-router-dom";
import { Sun, Moon, Monitor } from "lucide-react";
import Brand from "./Brand";
import { useTheme } from "../lib/theme";

const ICON = { system: Monitor, light: Sun, dark: Moon };

export default function PublicNav() {
  const { mode, cycle } = useTheme();
  const Icon = ICON[mode];
  return (
    <header className="public-nav">
      <Brand to="/" />
      <nav className="row" aria-label="Account">
        <button className="btn btn-quiet btn-icon btn-sm" onClick={cycle} aria-label={`Theme: ${mode}`} title={`Theme: ${mode}`}><Icon /></button>
        <Link to="/track" className="btn btn-quiet btn-sm hide-sm">Track a parcel</Link>
        <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
      </nav>
    </header>
  );
}
