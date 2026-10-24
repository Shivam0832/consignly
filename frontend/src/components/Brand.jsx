import { Link } from "react-router-dom";

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15.5 12 7l8 8.5" />
        <path d="M8 19h8" />
      </svg>
    </span>
  );
}

export default function Brand({ to = "/" }) {
  return (
    <Link to={to} className="brand" aria-label="Consignly home">
      <BrandMark />
      Consignly
    </Link>
  );
}
