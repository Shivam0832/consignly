import { useNavigate } from "react-router-dom";

/** Props that make a <tr> behave like a link (Enter key, Ctrl/⌘-click opens a tab). */
export default function useRowLink() {
  const navigate = useNavigate();
  return (to) => ({
    className: "link-row",
    tabIndex: 0,
    role: "link",
    onClick: (e) => (e.metaKey || e.ctrlKey ? window.open(to, "_blank") : navigate(to)),
    onKeyDown: (e) => { if (e.key === "Enter") navigate(to); },
  });
}
