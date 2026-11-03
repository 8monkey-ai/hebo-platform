import type { DocumentDecoration } from "elysia";

type RequestBody = NonNullable<DocumentDecoration["requestBody"]>;
type JsonSchema = Record<string, unknown> & { properties?: Record<string, unknown> };

// Any Standard Schema with JSON Schema support (e.g. Zod v4).
type JsonSchemaSource = {
  "~standard": {
    jsonSchema: {
      input: (options: {
        target: "draft-2020-12";
        libraryOptions?: Record<string, unknown>;
      }) => Record<string, unknown>;
    };
  };
};

// Routes use `parse: "none"` so the gateway can read the raw request itself. Elysia then
// emits an empty request body in the OpenAPI spec, so we document the body explicitly.
const toJsonSchema = (schema: JsonSchemaSource) =>
  schema["~standard"].jsonSchema.input({
    target: "draft-2020-12",
    // Binary inputs (e.g. `Uint8Array`) cannot be represented in JSON Schema.
    libraryOptions: { unrepresentable: "any" },
  }) as JsonSchema;

export const jsonRequestBody = (schema: JsonSchemaSource) =>
  ({
    required: true,
    content: { "application/json": { schema: toJsonSchema(schema) } },
  }) as RequestBody;

// Transcriptions accept a multipart `file` upload or base64 `input_audio` in a JSON body.
export const transcriptionsRequestBody = (schema: JsonSchemaSource) => {
  const json = toJsonSchema(schema);
  const { input_audio: _, ...fields } = json.properties ?? {};

  return {
    required: true,
    content: {
      "multipart/form-data": {
        schema: {
          ...json,
          properties: {
            file: { type: "string", format: "binary", description: "The audio file." },
            ...fields,
          },
          required: ["model", "file"],
        },
      },
      "application/json": { schema: json },
    },
  } as RequestBody;
};
