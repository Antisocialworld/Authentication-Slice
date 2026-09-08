import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";

const dbPath = fileURLToPath(new URL("../dev.db", import.meta.url));
const db = new Database(dbPath, { readonly: true });

const shortId = (v) => {
  const s = String(v ?? "");
  return s.length > 12 ? `${s.slice(0, 12)}...` : s;
};

const maskSecret = (v, keep) => {
  const s = String(v ?? "");
  return `${s.slice(0, keep)}...(${s.length} chars)`;
};

const show = (v) => {
  if (v === null || v === undefined) return "(null)";
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

function printTable(title, columns, rows) {
  console.log(`\n${title} (${rows.length} row${rows.length === 1 ? "" : "s"})`);
  const headers = columns.map((c) => String(c.head ?? c.name));
  const values = (r) => columns.map((c) => String(c.fmt ? c.fmt(r[c.name]) : show(r[c.name])));
  const widths = columns.map((_, i) =>
    Math.max(headers[i].length, ...rows.map((r) => values(r)[i].length))
  );
  const line = (cells) => cells.map((v, i) => v.padEnd(widths[i])).join(" | ");
  console.log(line(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("-+-"));
  for (const row of rows) console.log(line(values(row)));
}

printTable(
  "User",
  [
    { name: "id", head: "id", fmt: shortId },
    { name: "email", head: "email" },
    { name: "name", head: "name" },
    { name: "passwordHash", head: "passwordHash", fmt: (v) => maskSecret(v, 12) },
    { name: "emailVerifiedAt", head: "emailVerifiedAt" },
    { name: "createdAt", head: "createdAt" },
  ],
  db.prepare("SELECT * FROM User ORDER BY createdAt").all()
);

printTable(
  "VerificationCode",
  [
    { name: "id", head: "id", fmt: shortId },
    { name: "userId", head: "userId", fmt: shortId },
    { name: "code", head: "code" },
    { name: "expiresAt", head: "expiresAt" },
    { name: "usedAt", head: "usedAt" },
    { name: "lastSentAt", head: "lastSentAt" },
    { name: "createdAt", head: "createdAt" },
  ],
  db.prepare("SELECT * FROM VerificationCode ORDER BY createdAt").all()
);

printTable(
  "PasswordResetToken",
  [
    { name: "id", head: "id", fmt: shortId },
    { name: "userId", head: "userId", fmt: shortId },
    { name: "token", head: "token", fmt: (v) => maskSecret(v, 8) },
    { name: "expiresAt", head: "expiresAt" },
    { name: "usedAt", head: "usedAt" },
    { name: "createdAt", head: "createdAt" },
  ],
  db.prepare("SELECT * FROM PasswordResetToken ORDER BY createdAt").all()
);

printTable(
  "Session",
  [
    { name: "id", head: "id", fmt: shortId },
    { name: "userId", head: "userId", fmt: shortId },
    { name: "expiresAt", head: "expiresAt" },
    { name: "createdAt", head: "createdAt" },
  ],
  db.prepare("SELECT * FROM Session ORDER BY createdAt").all()
);

db.close();