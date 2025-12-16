import { Buffer } from "node:buffer";

import { getSecret } from "./secrets";

const clean = (value: string | undefined | null) => {
  if (!value) return;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "undefined") return;
  return trimmed;
};

/**
 * Configure OpenTelemetry env vars for Grafana Cloud (Tempo) using SST/Bun secrets.
 *
 * Returns whether OTEL should be enabled.
 */
export const initOtelFromGrafanaCloud = async (): Promise<boolean> => {
  if (clean(process.env.OTEL_SDK_DISABLED) === "true") return false;

  // If user already configured OTEL env vars explicitly, don't override.
  const hasEndpoint =
    !!clean(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) ||
    !!clean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
  const hasHeaders = !!clean(process.env.OTEL_EXPORTER_OTLP_HEADERS);
  if (hasEndpoint && hasHeaders) return true;

  // New preferred: provide endpoint + headers directly.
  const [endpoint, headers, instanceId, apiKey] = await Promise.all([
    getSecret("GrafanaCloudOtlpEndpoint", false),
    getSecret("GrafanaCloudOtlpHeaders", false),
    // Back-compat: compute Authorization header from instanceId + apiKey if present.
    getSecret("GrafanaCloudInstanceId", false),
    getSecret("GrafanaCloudApiKey", false),
  ]);

  const resolvedHeaders =
    clean(headers) ??
    (() => {
      const id = clean(instanceId);
      const key = clean(apiKey);
      if (!id || !key) return;
      const credentials = `${id}:${key}`;
      const basic = Buffer.from(credentials).toString("base64");
      return `Authorization=Basic ${basic}`;
    })();

  const resolvedEndpoint = clean(endpoint);

  if (!resolvedEndpoint || !resolvedHeaders) return false;

  // Grafana Cloud often gives a full traces endpoint (…/otlp/v1/traces). Handle both forms safely.
  if (/\/v1\/traces\/?$/.test(resolvedEndpoint)) {
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??= resolvedEndpoint;
  } else {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??= resolvedEndpoint;
  }

  process.env.OTEL_EXPORTER_OTLP_HEADERS ??= resolvedHeaders;
  process.env.OTEL_EXPORTER_OTLP_PROTOCOL ??= "http/protobuf";

  return true;
};
