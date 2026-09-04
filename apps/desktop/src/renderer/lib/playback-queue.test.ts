import assert from "node:assert/strict";
import test from "node:test";

import { parsePlaybackQueue, putEpisodeNext, serializePlaybackQueue } from "./playback-queue";

test("serializes a bounded, unique playback queue", () => {
  const ids = Array.from({ length: 105 }, (_, index) => `episode_${index}`);
  const restored = parsePlaybackQueue(serializePlaybackQueue([...ids, "episode_1"]));

  assert.equal(restored.length, 100);
  assert.equal(restored[0], "episode_0");
  assert.equal(restored.at(-1), "episode_99");
});

test("ignores malformed and unsupported playback queue data", () => {
  assert.deepEqual(parsePlaybackQueue("not-json"), []);
  assert.deepEqual(parsePlaybackQueue('{"version":2,"episodeIds":["episode_1"]}'), []);
  assert.deepEqual(parsePlaybackQueue('{"version":1,"episodeIds":"episode_1"}'), []);
  assert.deepEqual(parsePlaybackQueue('{"version":1,"episodeIds":[1,"episode_1"]}'), ["episode_1"]);
});

test("moves an episode to the front without duplicating it", () => {
  assert.deepEqual(putEpisodeNext(["episode_1", "episode_2"], "episode_2"), [
    "episode_2",
    "episode_1",
  ]);
});
