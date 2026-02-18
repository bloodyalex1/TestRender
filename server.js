require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors({
  origin: '*'   // o 'http://127.0.0.1:5501' para ser más específico
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});



// ─── Pool de conexiones ──────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sistema_excusas",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

// ─── Helpers ─────────────────────────────────────────────────
const query = (sql, params) => pool.query(sql, params).then(([rows]) => rows);

// ─── RUTAS ───────────────────────────────────────────────────

/**
 * GET /api/stats/dashboard
 * Datos principales para los gráficos del dashboard
 */
app.get("/api/stats/dashboard", async (req, res) => {
  try {
    // Total de faltas
    const [{ total: totalAbsences }] = await query(
      "SELECT COUNT(*) AS total FROM novedades"
    );

    // Faltas agrupadas por fecha (últimos 30 días)
    const byDate = await query(`
      SELECT DATE_FORMAT(date_of_absence, '%Y-%m-%d') AS date_of_absence,
      COUNT(*) AS total
      FROM   novedades
      WHERE  date_of_absence >= CURDATE() - INTERVAL 30 DAY
      GROUP  BY date_of_absence
      ORDER  BY date_of_absence
    `);

    // Conteo por estado
    const statusRows = await query(`
      SELECT status, COUNT(*) AS total
      FROM   novedades
      GROUP  BY status
    `);

    const counts = { approved: 0, pending: 0, rejected: 0 };
    statusRows.forEach(({ status, total }) => { counts[status] = total; });
    const totalStatus = counts.approved + counts.pending + counts.rejected || 1;

    const byStatus = {
      approved: +((counts.approved * 100) / totalStatus).toFixed(1),
      pending: +((counts.pending * 100) / totalStatus).toFixed(1),
      rejected: +((counts.rejected * 100) / totalStatus).toFixed(1),
    };

    // Top 8 estudiantes con más faltas
    const topStudents = await query(`
      SELECT s.nombre, COUNT(e.id) AS total
      FROM   novedades  e
      JOIN   usuarios s ON e.student_id = s.id
      GROUP  BY s.id, s.nombre
      ORDER  BY total DESC
      LIMIT  8
    `);

    // Faltas por mes (últimos 6 meses) — para sparklines / area chart
    const byMonth = await query(`
      SELECT DATE_FORMAT(date_of_absence, '%Y-%m') AS month,
      SUM(status = 'approved') AS approved,
      SUM(status = 'pending')  AS pending,
      SUM(status = 'rejected') AS rejected
      FROM   novedades
      GROUP  BY month
      ORDER  BY month
      LIMIT  6
    `);

    res.json({ totalAbsences, byDate, byStatus, topStudents, byMonth });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Error cargando estadísticas" });
  }
});

/**
 * GET /api/excuses
 * Lista todas las excusas con datos del estudiante
 */
app.get("/api/novedades", async (req, res) => {
  try {
    const { status, student_id, from, to } = req.query;
    let sql = `
      SELECT e.id, s.nombre, e.date_of_absence, e.reason, e.status, e.created_at
      FROM   novedades  e
      JOIN   usuarios s ON e.student_id = s.id
      WHERE  1=1
    `;
    const params = [];
    if (status) { sql += " AND e.status = ?"; params.push(status); }
    if (student_id) { sql += " AND e.student_id = ?"; params.push(student_id); }
    if (from) { sql += " AND e.date_of_absence >= ?"; params.push(from); }
    if (to) { sql += " AND e.date_of_absence <= ?"; params.push(to); }
    sql += " ORDER BY e.date_of_absence DESC LIMIT 200";

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error listando excusas" });
  }
});

/**
 * POST /api/excuses
 * Crear una nueva excusa
 */
app.post("/api/novedades", async (req, res) => {
  const { student_id, date_of_absence, reason } = req.body;
  if (!student_id || !date_of_absence)
    return res.status(400).json({ error: "student_id y date_of_absence son obligatorios" });

  try {
    const result = await pool.query(
      "INSERT INTO excuses (student_id, date_of_absence, reason) VALUES (?, ?, ?)",
      [student_id, date_of_absence, reason || null]
    );
    res.status(201).json({ id: result[0].insertId, message: "Excusa creada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creando excusa" });
  }
});

/**
 * PATCH /api/excuses/:id/status
 * Cambiar estado de una excusa
 */
app.patch("/api/novedades/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!["approved", "pending", "rejected"].includes(status))
    return res.status(400).json({ error: "Estado inválido" });

  try {
    await pool.query("UPDATE excuses SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ message: "Estado actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error actualizando estado" });
  }
});

/**
 * GET /api/students
 * Lista estudiantes
 */
app.get("/api/usuarios", async (req, res) => {
  try {
    const rows = await query("SELECT id, nombre, correo FROM usuarios ORDER BY nombre");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error listando estudiantes" });
  }
});

// ─── Inicio ──────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));