import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lean_patients (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS collaborators (
        id TEXT PRIMARY KEY,
        login TEXT UNIQUE NOT NULL,
        data JSONB NOT NULL
      );
    `);

    const countRes = await client.query("SELECT count(*) FROM collaborators");
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      const defaultCollabs = [
        { id: "1", name: "MA Desenvolvedor", login: "5669", password: "387387", role: "coordenacao", failedAttempts: 0, isBlocked: false, isDeleted: false },
        { id: "2", name: "Coordenação Setorial", login: "1010", password: "1234", role: "coordenacao", failedAttempts: 0, isBlocked: false, isDeleted: false },
        { id: "3", name: "Técnico Exemplo", login: "456", password: "1234", role: "tecnico", failedAttempts: 0, isBlocked: false, isDeleted: false },
      ];
      for (const collab of defaultCollabs) {
        await client.query(
          "INSERT INTO collaborators (id, login, data) VALUES ($1, $2, $3)",
          [collab.id, collab.login, collab]
        );
      }
    } else {
      const dev = { id: "1", name: "MA Desenvolvedor", login: "5669", password: "387387", role: "coordenacao", failedAttempts: 0, isBlocked: false, isDeleted: false };
      await client.query("DELETE FROM collaborators WHERE login = '5669' AND id != '1'");
      await client.query(
        "INSERT INTO collaborators (id, login, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login, data = EXCLUDED.data",
        [dev.id, dev.login, dev]
      );
    }
  } finally {
    client.release();
  }
}

let initPromise: Promise<void> | null = null;
async function ensureDbReady() {
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(async (_req, _res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/api/patients", async (_req, res) => {
  try {
    const result = await pool.query("SELECT data FROM patients");
    res.json(result.rows.map((r) => r.data));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/patients", async (req, res) => {
  try {
    const patient = req.body;
    await pool.query(
      "INSERT INTO patients (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
      [patient.id, patient]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/patients/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM patients WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/patients/bulk-delete", async (req, res) => {
  try {
    const ids = req.body.ids;
    await pool.query("DELETE FROM patients WHERE id = ANY($1)", [ids]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/lean-patients", async (_req, res) => {
  try {
    const result = await pool.query("SELECT data FROM lean_patients");
    res.json(result.rows.map((r) => r.data));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/lean-patients", async (req, res) => {
  try {
    const patient = req.body;
    await pool.query(
      "INSERT INTO lean_patients (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
      [patient.id, patient]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/lean-patients/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM lean_patients WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/collaborators", async (_req, res) => {
  try {
    const result = await pool.query("SELECT data FROM collaborators");
    res.json(result.rows.map((r) => r.data));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/collaborators", async (req, res) => {
  try {
    const collab = req.body;
    await pool.query(
      "INSERT INTO collaborators (id, login, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login, data = EXCLUDED.data",
      [collab.id, collab.login, collab]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/collaborators/:id", async (req, res) => {
  try {
    if (req.params.id === "1") {
      return res.status(403).json({ error: "Cannot delete master developer" });
    }
    await pool.query("DELETE FROM collaborators WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
