import mysql from "mysql2/promise";
import { serve } from "bun";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,        // จำนวน connection สูงสุด
  queueLimit: 0,
  acquireTimeout: 60000,      // timeout การขอ connection
  timeout: 60000,             // query timeout
  reconnect: true             // auto reconnect
});

serve({
  port: 3000,
  async fetch(req) {

    if (req.method === "GET" && new URL(req.url).pathname === "/") {

      return new Response(JSON.stringify({ message: "Hello World from Bun"}), {
        headers: { "Content-Type": "application/json" },
      });
      
    } else if (req.method === "POST" && new URL(req.url).pathname === "/users") {

      try {
        const { username, email } = await req.json();
        if (!username || !email) {
          return new Response(JSON.stringify({ error: "username and email are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const [result] = await pool.query("INSERT INTO users (username, email) VALUES (?, ?)", [username, email]);
        return new Response(JSON.stringify({ message: "User created successfully", user_id: result.insertId }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
        
      } catch (error) {
        return new Response(JSON.stringify({ error: "Database error", detail: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

    } else if (req.method === "GET" && new URL(req.url).pathname.startsWith("/users/")) {

      const parts = new URL(req.url).pathname.split("/");
      const intUserId = parts[2];
      if (intUserId && !isNaN(Number(intUserId))) {
        try {
          const [rows] = await pool.query("SELECT user_id, username, email FROM users WHERE user_id = ?", [intUserId]);
          return new Response(JSON.stringify({ user_id: rows[0].user_id, username: rows[0].username, email: rows[0].email }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: "Database error", detail: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: "Invalid user_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

    } else {

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });

    }

  },
});
