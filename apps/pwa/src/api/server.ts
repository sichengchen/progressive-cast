import { serve } from "@hono/node-server";

import app from "./app";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Progressive Cast API listening on http://127.0.0.1:${info.port}`);
  },
);
