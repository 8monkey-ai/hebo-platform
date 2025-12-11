import { createRoot } from "react-dom/client";

import { Page } from "./page";

// hydrateRoot(document.getElementById("root")!, <Page />);
createRoot(document.querySelector("#root")!).render(<Page />);
