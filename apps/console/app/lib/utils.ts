export function getCookie(name: string): string | undefined {
  if (typeof document !== "undefined") {
    const value = document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="));
    return value?.split("=")[1];
  }
}

/**
 * Returns the appropriate keyboard shortcut text based on the user's platform
 * @param shortcut - The shortcut key (e.g., 'P' for the P key)
 * @returns The formatted shortcut string (e.g., '⌘P' on Mac, 'Ctrl P' on other platforms)
 */
export const kbs = (shortcut: string): string => {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  const map: Record<string, string> = isMac
    ? { mod: "⌘", option: "⌥", ctrl: "⌃", shift: "⇧" }
    : { mod: "Ctrl", option: "Alt", ctrl: "Ctrl", shift: "Shift" };

  return shortcut
    .replaceAll("+", "")
    .replaceAll(/(mod|option|ctrl|shift)/gi, (match) => {
      const lower = match.toLowerCase();
      return map[lower] ?? match.toUpperCase();
    });
};

export const formatDateTime = (date: Date) => {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

// Create human readable labels, e.g. "serviceAccount" => "Service Account"
export function labelize(value: string) {
  return value
    .replaceAll(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}
