export const corsConfig =
  process.env.IS_REMOTE === "true"
    ? {
        // Matches HTTPS origins for exact "hebo.ai" or subdomains (e.g., "app.hebo.ai"),
        // requires a dot for subdomains and anchors to end of string
        origin: /^https:\/\/(?:hebo\.ai|(?:[a-z0-9-]+\.)+hebo\.ai)$/i,
        credentials: true,
        // reduces noise of OPTION calls without compromising security
        maxAge: 3600,
      }
    : {
        origin: true,
        credentials: true,
        maxAge: 3600,
      };
