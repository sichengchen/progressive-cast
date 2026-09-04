import assert from "node:assert/strict";
import test from "node:test";

import {
  mergePlaybackQueue,
  parsePlaybackQueue,
  putEpisodeFirst,
  putEpisodeNext,
  reorderPlaybackQueue,
  serializePlaybackQueue,
} from "./playback-queue";

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

test("moves a played episode to the front without duplicating it", () => {
  assert.deepEqual(putEpisodeFirst(["episode_1", "episode_2"], "episode_2"), [
    "episode_2",
    "episode_1",
  ]);
});

test("puts Play Next directly after the current episode", () => {
  assert.deepEqual(
    putEpisodeNext(["current", "later_1", "later_2"], "later_2", "current"),
    ["current", "later_2", "later_1"],
  );
});

test("merges resumable episodes behind the persisted queue", () => {
  assert.deepEqual(
    mergePlaybackQueue(["current", "next"], ["current", "resume_1", "resume_2"]),
    ["current", "next", "resume_1", "resume_2"],
  );
});

test("reorders queued episodes without moving the current episode", () => {
  assert.deepEqual(
    reorderPlaybackQueue(
      ["current", "episode_1", "episode_2", "episode_3"],
      "episode_3",
      "episode_1",
      "before",
      "current",
    ),
    ["current", "episode_3", "episode_1", "episode_2"],
  );
  assert.deepEqual(
    reorderPlaybackQueue(
      ["current", "episode_1", "episode_2"],
      "current",
      "episode_2",
      "after",
      "current",
    ),
    ["current", "episode_1", "episode_2"],
  );
});
