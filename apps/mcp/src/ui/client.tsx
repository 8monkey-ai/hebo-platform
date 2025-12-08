import { hydrateRoot } from "react-dom/client";

import { RootContent } from "./root";

const root = document.querySelector("#root");
if (root) {
  hydrateRoot(root, <RootContent />);
}
