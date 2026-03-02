import express from "express";
import cors from "cors";
import pg from "pg";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Seed initial collaborators if empty
    const countRes = await client.query("SELECT count(*) FROM collaborators");
    if (parseInt(countRes.rows[0].count) === 0) {
      const defaultCollabs = [
        { id: '1', name: 'MA Desenvolvedor', login: '5669', password: '387387', role: 'coordenacao', failedAttempts: 0, isBlocked: false, isDeleted: false },
        { id: '2', name: 'Coordenação Setorial', login: '1010', password: '1234', role: 'coordenacao', failedAttempts: 0, isBlocked: false, isDeleted: false },
        { id: '3', name: 'Técnico Exemplo', login: '456', password: '1234', role: 'tecnico', failedAttempts: 0, isBlocked: false, isDeleted: false }
      ];
      for (const collab of defaultCollabs) {
        await client.query(
          "INSERT INTO collaborators (id, login, data) VALUES ($1, $2, $3)",
          [collab.id, collab.login, collab]
        );
      }
    } else {
      // Ensure developer user is always correct
      const dev = { id: '1', name: 'MA Desenvolvedor', login: '5669', password: '387387', role: 'coordenacao', failedAttempts: 0, isBlocked: false, isDeleted: false };
      // First, remove any other user with login '5669' to avoid UNIQUE constraint violation if they have a different ID
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

async function startServer() {
  await initDb();
  
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Patients API
  app.get("/api/patients", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM patients");
      res.json(result.rows.map(r => r.data));
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

  // Lean Patients API
  app.get("/api/lean-patients", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM lean_patients");
      res.json(result.rows.map(r => r.data));
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

  // Collaborators API
  app.get("/api/collaborators", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM collaborators");
      res.json(result.rows.map(r => r.data));
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
      if (req.params.id === '1') {
        return res.status(403).json({ error: "Cannot delete master developer" });
      }
      await pool.query("DELETE FROM collaborators WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
