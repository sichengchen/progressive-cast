import { Hono } from "hono";

import api from "./api";

const app = new Hono();

app.route("/api", api);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
