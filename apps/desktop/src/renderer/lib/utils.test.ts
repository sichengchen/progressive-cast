import assert from "node:assert/strict";
import test from "node:test";

import { formatEpisodeDate } from "./utils";

const now = new Date(2026, 8, 3, 12);

test("formatEpisodeDate uses compact relative labels", () => {
  assert.equal(formatEpisodeDate(new Date(2026, 8, 3, 8), now), "Today");
  assert.equal(formatEpisodeDate(new Date(2026, 8, 2, 8), now), "Yesterday");
  assert.equal(formatEpisodeDate(new Date(2026, 7, 26, 8), now), "Last week");
});

test("formatEpisodeDate omits the current year and keeps older years", () => {
  assert.equal(formatEpisodeDate(new Date(2026, 5, 3, 8), now), "Jun 3");
  assert.equal(formatEpisodeDate(new Date(2025, 8, 2, 8), now), "Sep 2, 2025");
});
