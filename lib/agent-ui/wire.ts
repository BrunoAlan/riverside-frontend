// Shared JSON wire codec for the LiveKit data channel. The encoder/decoder are
// allocated once at module load and reused for every message, instead of a new
// instance per call.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Serialize a value to UTF-8 JSON bytes for publishing on a data-channel topic.
export const encodeJson = (value: unknown): Uint8Array => encoder.encode(JSON.stringify(value));

// Decode UTF-8 bytes received on a data-channel topic into a string. The caller
// JSON-parses separately, so decode failures and parse failures stay distinct.
export const decodeText = (bytes: Uint8Array): string => decoder.decode(bytes);
