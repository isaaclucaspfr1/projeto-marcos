import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import pkg from 'pg';
const { Pool } = pkg;
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";

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
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lean_patients (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS collaborators (
        id TEXT PRIMARY KEY,
        login TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL
      );
    `);

    // Migration logic from SQLite to PostgreSQL
    const sqlitePath = path.join(__dirname, "database.db");
    if (fs.existsSync(sqlitePath)) {
      const pgCollabCount = await client.query("SELECT count(*) FROM collaborators");
      if (parseInt(pgCollabCount.rows[0].count) === 0) {
        console.log("Migrating data from SQLite to PostgreSQL...");
        const sqliteDb = new Database(sqlitePath);
        
        // Migrate Collaborators
        const collaborators = sqliteDb.prepare("SELECT * FROM collaborators").all() as any[];
        for (const collab of collaborators) {
          await client.query("INSERT INTO collaborators (id, login, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [collab.id, collab.login, collab.data]);
        }

        // Migrate Patients
        const patients = sqliteDb.prepare("SELECT * FROM patients").all() as any[];
        for (const p of patients) {
          await client.query("INSERT INTO patients (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [p.id, p.data]);
        }

        // Migrate Lean Patients
        const leanPatients = sqliteDb.prepare("SELECT * FROM lean_patients").all() as any[];
        for (const lp of leanPatients) {
          await client.query("INSERT INTO lean_patients (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [lp.id, lp.data]);
        }
        
        console.log("Migration completed.");
        sqliteDb.close();
      }
    }

    // Ensure developer user is always correct
    const dev = { id: '1', name: 'MA Desenvolvedor', login: '5669', password: '387387', role: 'coordenacao', failedAttempts: 0, isBlocked: false, isDeleted: false };
    await client.query("DELETE FROM collaborators WHERE login = '5669' AND id != '1'");
    await client.query("INSERT INTO collaborators (id, login, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login, data = EXCLUDED.data", [dev.id, dev.login, JSON.stringify(dev)]);

  } finally {
    client.release();
  }
}

async function startServer() {
  await initDb();
  
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(cors());
  app.use(express.json());

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Patients API
  app.get("/api/patients", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM patients");
      res.json(result.rows.map(r => JSON.parse(r.data)));
    } catch (err) {
      console.error("Error fetching patients:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const patient = req.body;
      if (!patient.id) return res.status(400).json({ error: "Missing patient ID" });
      
      await pool.query(
        "INSERT INTO patients (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data", 
        [patient.id, JSON.stringify(patient)]
      );
      
      io.emit("patient_updated", patient);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving patient:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/patients/bulk", async (req, res) => {
    const client = await pool.connect();
    try {
      const patients = req.body.patients;
      if (!Array.isArray(patients)) return res.status(400).json({ error: "Patients must be an array" });
      
      await client.query('BEGIN');
      for (const patient of patients) {
        await client.query(
          "INSERT INTO patients (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data", 
          [patient.id, JSON.stringify(patient)]
        );
      }
      await client.query('COMMIT');
      
      io.emit("patients_bulk_updated", patients);
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("Error bulk saving patients:", err);
      res.status(500).json({ error: (err as Error).message });
    } finally {
      client.release();
    }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM patients WHERE id = $1", [req.params.id]);
      io.emit("patient_deleted", req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/patients/bulk-delete", async (req, res) => {
    const client = await pool.connect();
    try {
      const ids = req.body.ids;
      await client.query('BEGIN');
      for (const id of ids) {
        await client.query("DELETE FROM patients WHERE id = $1", [id]);
      }
      await client.query('COMMIT');
      io.emit("patients_bulk_deleted", ids);
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: (err as Error).message });
    } finally {
      client.release();
    }
  });

  // Lean Patients API
  app.get("/api/lean-patients", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM lean_patients");
      res.json(result.rows.map(r => JSON.parse(r.data)));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/lean-patients", async (req, res) => {
    try {
      const patient = req.body;
      if (!patient.id) return res.status(400).json({ error: "Missing patient ID" });
      
      await pool.query(
        "INSERT INTO lean_patients (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data", 
        [patient.id, JSON.stringify(patient)]
      );
      
      io.emit("lean_patient_updated", patient);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving lean patient:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/lean-patients/bulk", async (req, res) => {
    const client = await pool.connect();
    try {
      const patients = req.body.patients;
      if (!Array.isArray(patients)) return res.status(400).json({ error: "Patients must be an array" });
      
      await client.query('BEGIN');
      for (const patient of patients) {
        await client.query(
          "INSERT INTO lean_patients (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data", 
          [patient.id, JSON.stringify(patient)]
        );
      }
      await client.query('COMMIT');
      
      io.emit("lean_patients_bulk_updated", patients);
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("Error bulk saving lean patients:", err);
      res.status(500).json({ error: (err as Error).message });
    } finally {
      client.release();
    }
  });

  app.delete("/api/lean-patients/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM lean_patients WHERE id = $1", [req.params.id]);
      io.emit("lean_patient_deleted", req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Collaborators API
  app.get("/api/collaborators", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM collaborators");
      res.json(result.rows.map(r => JSON.parse(r.data)));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/collaborators", async (req, res) => {
    try {
      const collab = req.body;
      if (!collab.id) return res.status(400).json({ error: "Missing collaborator ID" });
      
      await pool.query(
        "INSERT INTO collaborators (id, login, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login, data = EXCLUDED.data", 
        [collab.id, collab.login, JSON.stringify(collab)]
      );
      
      io.emit("collaborator_updated", collab);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving collaborator:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/collaborators/bulk", async (req, res) => {
    const client = await pool.connect();
    try {
      const collaborators = req.body.collaborators;
      if (!Array.isArray(collaborators)) return res.status(400).json({ error: "Collaborators must be an array" });
      
      await client.query('BEGIN');
      for (const collab of collaborators) {
        await client.query(
          "INSERT INTO collaborators (id, login, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login, data = EXCLUDED.data", 
          [collab.id, collab.login, JSON.stringify(collab)]
        );
      }
      await client.query('COMMIT');
      
      io.emit("collaborators_bulk_updated", collaborators);
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("Error bulk saving collaborators:", err);
      res.status(500).json({ error: (err as Error).message });
    } finally {
      client.release();
    }
  });

  app.delete("/api/collaborators/:id", async (req, res) => {
    try {
      if (req.params.id === '1') {
        return res.status(403).json({ error: "Cannot delete master developer" });
      }
      await pool.query("DELETE FROM collaborators WHERE id = $1", [req.params.id]);
      io.emit("collaborator_deleted", req.params.id);
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
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
