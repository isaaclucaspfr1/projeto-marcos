import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("hospflow.db");

// Initialize database
db.exec(`
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

// Seed initial collaborators if empty
const countResult = db.prepare("SELECT count(*) as count FROM collaborators").get() as { count: number };
if (countResult.count === 0) {
  const defaultCollabs = [
    { id: '1', name: 'MA Desenvolvedor', login: '5669', password: '387387', role: 'coordenacao', failedAttempts: 0, isBlocked: false, isDeleted: false },
    { id: '2', name: 'Coordenação Setorial', login: '1010', password: '1234', role: 'coordenacao', failedAttempts: 0, isBlocked: false, isDeleted: false },
    { id: '3', name: 'Técnico Exemplo', login: '456', password: '1234', role: 'tecnico', failedAttempts: 0, isBlocked: false, isDeleted: false }
  ];
  const insert = db.prepare("INSERT INTO collaborators (id, login, data) VALUES (?, ?, ?)");
  for (const collab of defaultCollabs) {
    insert.run(collab.id, collab.login, JSON.stringify(collab));
  }
} else {
  // Ensure developer user is always correct
  const dev = { id: '1', name: 'MA Desenvolvedor', login: '5669', password: '387387', role: 'coordenacao', failedAttempts: 0, isBlocked: false, isDeleted: false };
  // First, remove any other user with login '5669' to avoid UNIQUE constraint violation if they have a different ID
  db.prepare("DELETE FROM collaborators WHERE login = '5669' AND id != '1'").run();
  db.prepare("INSERT OR REPLACE INTO collaborators (id, login, data) VALUES (?, ?, ?)").run(dev.id, dev.login, JSON.stringify(dev));
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Patients API
  app.get("/api/patients", (req, res) => {
    const rows = db.prepare("SELECT data FROM patients").all() as { data: string }[];
    res.json(rows.map(r => JSON.parse(r.data)));
  });

  app.post("/api/patients", (req, res) => {
    const patient = req.body;
    db.prepare("INSERT OR REPLACE INTO patients (id, data) VALUES (?, ?)").run(patient.id, JSON.stringify(patient));
    res.json({ success: true });
  });

  app.delete("/api/patients/:id", (req, res) => {
    db.prepare("DELETE FROM patients WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/patients/bulk-delete", (req, res) => {
    const ids = req.body.ids;
    const deleteStmt = db.prepare("DELETE FROM patients WHERE id = ?");
    const deleteMany = db.transaction((ids) => {
      for (const id of ids) deleteStmt.run(id);
    });
    deleteMany(ids);
    res.json({ success: true });
  });

  // Lean Patients API
  app.get("/api/lean-patients", (req, res) => {
    const rows = db.prepare("SELECT data FROM lean_patients").all() as { data: string }[];
    res.json(rows.map(r => JSON.parse(r.data)));
  });

  app.post("/api/lean-patients", (req, res) => {
    const patient = req.body;
    db.prepare("INSERT OR REPLACE INTO lean_patients (id, data) VALUES (?, ?)").run(patient.id, JSON.stringify(patient));
    res.json({ success: true });
  });

  app.delete("/api/lean-patients/:id", (req, res) => {
    db.prepare("DELETE FROM lean_patients WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Collaborators API
  app.get("/api/collaborators", (req, res) => {
    const rows = db.prepare("SELECT data FROM collaborators").all() as { data: string }[];
    res.json(rows.map(r => JSON.parse(r.data)));
  });

  app.post("/api/collaborators", (req, res) => {
    const collab = req.body;
    db.prepare("INSERT OR REPLACE INTO collaborators (id, login, data) VALUES (?, ?, ?)").run(collab.id, collab.login, JSON.stringify(collab));
    res.json({ success: true });
  });

  app.delete("/api/collaborators/:id", (req, res) => {
    if (req.params.id === '1') {
      return res.status(403).json({ error: "Cannot delete master developer" });
    }
    db.prepare("DELETE FROM collaborators WHERE id = ?").run(req.params.id);
    res.json({ success: true });
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
