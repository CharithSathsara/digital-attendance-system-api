import { app } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";

async function start() {
  await pool.query("SELECT 1");

  const server = app.listen(
    env.port,
    "0.0.0.0",
    () => {
      console.log(
        `Tuition API V1 running on http://localhost:${env.port}`
      );
    }
  );

  const shutdown = async () => {
    console.log("Shutting down...");

    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error(
    "Failed to start server",
    error
  );

  process.exit(1);
});
