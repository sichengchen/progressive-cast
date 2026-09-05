import { initSync, parse_feed_json } from "../generated/rajio_core.js";

/** Hosts supply bytes (Electron) or a precompiled module (Cloudflare Workers). */
export function initializeCore(module) {
  initSync({ module });
}

/** Parsing is deterministic: the caller supplies the fetch timestamp. */
export function parseFeed(request) {
  const response = JSON.parse(parse_feed_json(JSON.stringify(request)));
  if (response.error) throw new Error(response.error);
  return response.value;
}
