import { useHotkeys } from "react-hotkeys-hook";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@hebo/shared-ui/components/Dialog";
import { kbs } from "~console/lib/utils";

const SHORTCUT_GROUPS = [
  {
    title: "Navigation",
    shortcuts: [
      { label: "Toggle sidebar", combo: "mod+S" },
      { label: "Keyboard shortcuts", combo: "mod+/" },
    ],
  },
  {
    title: "Playground",
    shortcuts: [
      { label: "Toggle playground", combo: "mod+P" },
      { label: "New chat", combo: "shift+mod+O" },
      { label: "Focus chat input", combo: "shift+Esc" },
      { label: "Send message", combo: "Enter" },
      { label: "New line in message", combo: "shift+Enter" },
      { label: "Add attachment", combo: "mod+U" },
    ],
  },
] as const;


type KeyboardShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsDialogProps) {

  useHotkeys("mod+slash", () => {
      onOpenChange(true);
    },
    { preventDefault: true, enableOnFormTags: true },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xs gap-6">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="font-medium text-muted-foreground">
                {group.title}
              </p>
              <div className="space-y-3">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.combo}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {shortcut.label}
                    </span>
                    <span className="text-muted-foreground">
                      {kbs(shortcut.combo)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
