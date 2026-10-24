import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ id, value, onChange, autoComplete, minLength, required = true }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input id={id} className="input" type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} minLength={minLength} required={required} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
        {show ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}
