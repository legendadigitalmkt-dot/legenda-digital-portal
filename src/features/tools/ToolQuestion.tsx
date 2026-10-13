import React from "react";
import type { ToolField } from "../../lib/tools-engine.mjs";
export function ToolQuestion({
  field: f,
  value,
  onChange,
  onStep,
}: {
  field: ToolField;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
  onStep: () => void;
}) {
  if (f.type === "checkbox")
    return (
      <label className="tool-check">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => {
            onChange(e.target.checked);
            onStep();
          }}
        />
        {f.label}
      </label>
    );
  return (
    <label>
      {f.label}
      {f.type === "textarea" ? (
        <textarea
          rows={3}
          maxLength={2000}
          placeholder={f.placeholder}
          value={String(value || "")}
          onBlur={onStep}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : f.options ? (
        <select
          aria-label={f.label}
          value={String(value ?? "")}
          onBlur={onStep}
          onChange={(e) => onChange(e.target.value)}
        >
          {f.options.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={f.type}
          min={f.min}
          max={f.max}
          step={f.step || "1"}
          maxLength={2000}
          value={String(value ?? "")}
          onBlur={onStep}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
