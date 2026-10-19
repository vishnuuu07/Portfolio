"use client";
import { useState } from "react";
export default function CopyButton({ value, label, success }: { value: string; label: string; success: string }) {
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  return <span className="copy-control"><button type="button" className="text-link copy-button" onClick={async () => {
    try { if (!navigator.clipboard) throw new Error("Clipboard unavailable"); await navigator.clipboard.writeText(value); setFailed(false); setMessage(success); }
    catch { setFailed(true); setMessage("Select and copy the text below."); }
  }}>{label}<span aria-hidden="true"> +</span></button><span role="status" className="copy-status">{message}</span>{failed && <input className="copy-fallback" aria-label={`Text to copy: ${label}`} readOnly value={value} onFocus={event => event.currentTarget.select()} />}</span>;
}
