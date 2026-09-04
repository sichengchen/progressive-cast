import assert from "node:assert/strict";
import test from "node:test";

import {
  parseFavoriteEpisodes,
  serializeFavoriteEpisodes,
  toggleFavoriteEpisodeId,
} from "./favorite-episodes";

test("serializes bounded, unique favorite episode ids", () => {
  const ids = Array.from({ length: 505 }, (_, index) => `episode_${index}`);
  const restored = parseFavoriteEpisodes(serializeFavoriteEpisodes([...ids, "episode_1"]));

  assert.equal(restored.length, 500);
  assert.equal(restored[0], "episode_0");
  assert.equal(restored.at(-1), "episode_499");
});

test("ignores malformed and unsupported favorite episode data", () => {
  assert.deepEqual(parseFavoriteEpisodes("not-json"), []);
  assert.deepEqual(parseFavoriteEpisodes('{"version":2,"episodeIds":["episode_1"]}'), []);
  assert.deepEqual(parseFavoriteEpisodes('{"version":1,"episodeIds":"episode_1"}'), []);
  assert.deepEqual(parseFavoriteEpisodes('{"version":1,"episodeIds":[1,"episode_1"]}'), [
    "episode_1",
  ]);
});

test("adds favorites to the front and removes existing favorites", () => {
  assert.deepEqual(toggleFavoriteEpisodeId(["episode_1"], "episode_2"), ["episode_2", "episode_1"]);
  assert.deepEqual(toggleFavoriteEpisodeId(["episode_2", "episode_1"], "episode_2"), ["episode_1"]);
});
