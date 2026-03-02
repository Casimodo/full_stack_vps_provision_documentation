import express from "express";
import mysql from "mysql2/promise";

const app = express();

// Variables d'environnement injectées via Kubernetes Secret
const DB_HOST = process.env.DB_HOST || "mariadb";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || "appuser";
const DB_PASSWORD = process.env.DB_PASSWORD || "password";
const DB_NAME = process.env.DB_NAME || "appdb";

app.get("/", (_req, res) => {
  res.type("text/plain").send("Hello World");
});

/**
 * Endpoint de santé DB :
 * - tente une connexion
 * - renvoie "MariaDB connect: OK" si tout va bien
 * - sinon renvoie une erreur lisible
 */
app.get("/health/db", async (_req, res) => {
  try {
    const conn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectTimeout: 2000
    });

    await conn.ping();
    await conn.end();

    res.type("text/plain").send("MariaDB connect: OK");
  } catch (err) {
    res.status(500).type("text/plain").send(`MariaDB connect: ERROR\n${String(err)}`);
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on :${port}`);
});
