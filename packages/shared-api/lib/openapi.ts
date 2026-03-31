export const createOpenapiConfig = (
  title: string,
  description: string,
  serverUrl: string,
  version: string,
) => ({
  documentation: {
    info: {
      title,
      description,
      version,
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http" as const,
          scheme: "bearer" as const,
          description: "API key or access token",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
});
