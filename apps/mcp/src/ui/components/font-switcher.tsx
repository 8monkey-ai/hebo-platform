import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

const FONTS = {
  Inter: {
    label: "Inter",
    value: '"Inter", sans-serif',
  },
  JetBrains: {
    label: "JetBrains Mono",
    value: '"JetBrains Mono", monospace',
  },
  Recursive: {
    label: "Recursive",
    value: '"Recursive", sans-serif',
  },
  FiraCode: {
    label: "Fira Code",
    value: '"Fira Code", monospace',
  },
  "IBM Plex Mono": {
    label: "IBM Plex Mono",
    value: '"IBM Plex Mono", monospace',
  },
  "Geist Mono": {
    label: "Geist Mono",
    value: '"Geist Mono", monospace',
  },
} as const;
type FontKey = keyof typeof FONTS;

export function FontSwitcher() {
  const [font, setFont] = useState<FontKey>("JetBrains");

  useEffect(() => {
    document.body.style.fontFamily = FONTS[font]!.value;
  }, [font]);

  return (
    <Select value={font} onValueChange={(value) => setFont(value as FontKey)}>
      <SelectTrigger size="sm" className="w-42">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {Object.entries(FONTS).map(([key, { label }]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
