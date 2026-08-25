// Supabase-compatible query builder on top of node-postgres (pg).
// Implements the subset of the Supabase JS client API that this project uses,
// so all existing controllers work without modification.

const fkCache = new Map();

async function lookupReverseFk(client, schema, childTable, parentTable) {
  const key = `${schema}|${childTable}→${parentTable}`;
  if (fkCache.has(key)) return fkCache.get(key);

  const { rows } = await client.query(
    `SELECT kcu.column_name AS fk_col
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     JOIN information_schema.referential_constraints rc
       ON tc.constraint_name = rc.constraint_name
     JOIN information_schema.key_column_usage ccu
       ON rc.unique_constraint_name = ccu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = $1
       AND tc.table_name = $2
       AND ccu.table_name = $3
     LIMIT 1`,
    [schema, childTable, parentTable]
  );

  const col = rows[0]?.fk_col ?? null;
  fkCache.set(key, col);
  return col;
}

// node-postgres serializes a bare JS array/object as a Postgres array
// literal or "[object Object]", not JSON text — so it must be JSON-encoded
// ourselves before going into a json/jsonb column. Supabase-js didn't need
// this because it sent real JSON over HTTP/PostgREST instead of wire params.
// Dates and Buffers are left alone since pg already serializes those correctly.
function toSqlValue(v) {
  if (v !== null && typeof v === "object" && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return JSON.stringify(v);
  }
  return v;
}

// Split a string by commas that are not inside parentheses.
function splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= str.length; i++) {
    const ch = str[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if ((ch === "," || i === str.length) && depth === 0) {
      const p = str.slice(start, i).trim();
      if (p) parts.push(p);
      start = i + 1;
    }
  }
  return parts;
}

// Parse a Supabase-style select string into components.
// Returns { mainCols, forwardJoins, reverseJoins }
//   forwardJoins: alias:fk_col(cols)  → join referenced table via FK on current table
//   reverseJoins: table(cols)         → join child table whose FK points back here
function parseSelect(str) {
  const forwardJoins = [];
  const reverseJoins = [];
  const mainParts = [];

  if (!str || str === "*") {
    return { mainCols: "main.*", forwardJoins, reverseJoins };
  }

  for (const part of splitTopLevel(str)) {
    // Forward FK: alias:fk_col(cols)
    const fwdMatch = part.match(/^(\w+):(\w+)\(([^)]*)\)$/);
    if (fwdMatch) {
      forwardJoins.push({
        alias: fwdMatch[1],
        fkCol: fwdMatch[2],
        refTable: fwdMatch[1], // alias == referenced table name in PostgREST
        cols: fwdMatch[3].trim(),
      });
      continue;
    }

    // Reverse FK (has-many): table(cols)
    const revMatch = part.match(/^(\w+)\(([^)]*)\)$/);
    if (revMatch) {
      reverseJoins.push({ table: revMatch[1], cols: revMatch[2].trim() });
      continue;
    }

    // Column alias: new_name:actual_col
    const colAlias = part.match(/^(\w+):(\w+)$/);
    if (colAlias) {
      mainParts.push(`main."${colAlias[2]}" AS "${colAlias[1]}"`);
      continue;
    }

    mainParts.push(part === "*" ? "main.*" : `main."${part}"`);
  }

  return {
    mainCols: mainParts.length ? mainParts.join(", ") : "main.*",
    forwardJoins,
    reverseJoins,
  };
}

class QueryBuilder {
  constructor(pool, schema) {
    this._pool = pool;
    this._schema = schema;
    this._table = null;
    this._selectStr = "*";
    this._countQuery = false;
    this._filters = [];
    this._op = "SELECT";
    this._insertRows = null;
    this._updateData = null;
    this._orderCol = null;
    this._orderAsc = true;
    this._limitVal = null;
    this._offsetVal = null;
    this._single = false;
    this._maybeSingle = false;
    this._upsertOpts = null;
  }

  from(table) {
    this._table = table;
    return this;
  }

  select(cols = "*", opts = null) {
    // .select() called after a mutation just signals "return rows" — we always RETURNING * anyway.
    if (this._op === "SELECT") {
      this._selectStr = cols;
      if (opts?.head === true) this._countQuery = true;
    }
    return this;
  }

  eq(col, val) {
    if (val === null || val === undefined) {
      this._filters.push({ type: "null", col, not: false });
    } else {
      this._filters.push({ type: "eq", col, val });
    }
    return this;
  }

  neq(col, val) {
    this._filters.push({ type: "neq", col, val });
    return this;
  }

  gt(col, val) {
    this._filters.push({ type: "gt", col, val });
    return this;
  }

  gte(col, val) {
    this._filters.push({ type: "gte", col, val });
    return this;
  }

  lt(col, val) {
    this._filters.push({ type: "lt", col, val });
    return this;
  }

  lte(col, val) {
    this._filters.push({ type: "lte", col, val });
    return this;
  }

  is(col, val) {
    if (val === null) {
      this._filters.push({ type: "null", col, not: false });
    } else {
      this._filters.push({ type: "eq", col, val });
    }
    return this;
  }

  not(col, op, val) {
    if (op === "is" && val === null) {
      this._filters.push({ type: "null", col, not: true });
    } else {
      this._filters.push({ type: "not", col, op, val });
    }
    return this;
  }

  in(col, vals) {
    this._filters.push({ type: "in", col, vals });
    return this;
  }

  like(col, pat) {
    this._filters.push({ type: "like", col, val: pat });
    return this;
  }

  ilike(col, pat) {
    this._filters.push({ type: "ilike", col, val: pat });
    return this;
  }

  order(col, { ascending = true } = {}) {
    this._orderCol = col;
    this._orderAsc = ascending;
    return this;
  }

  limit(n) {
    this._limitVal = n;
    return this;
  }

  range(from, to) {
    this._offsetVal = from;
    this._limitVal = to - from + 1;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  maybeSingle() {
    this._maybeSingle = true;
    return this;
  }

  // No-op — kept for API compatibility
  returns() {
    return this;
  }

  insert(rows) {
    this._op = "INSERT";
    this._insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  upsert(rows, opts = {}) {
    this._op = "UPSERT";
    this._insertRows = Array.isArray(rows) ? rows : [rows];
    this._upsertOpts = opts;
    return this;
  }

  update(data) {
    this._op = "UPDATE";
    this._updateData = data;
    return this;
  }

  delete() {
    this._op = "DELETE";
    return this;
  }

  // Build parameterised WHERE clause starting at $startIdx.
  // Returns { sql: " WHERE ...", values: [] }
  _buildWhere(startIdx) {
    const clauses = [];
    const values = [];
    let idx = startIdx;

    for (const f of this._filters) {
      const qc = `"${f.col}"`;
      switch (f.type) {
        case "eq":
          clauses.push(`${qc} = $${idx++}`);
          values.push(f.val);
          break;
        case "neq":
          clauses.push(`${qc} != $${idx++}`);
          values.push(f.val);
          break;
        case "gt":
          clauses.push(`${qc} > $${idx++}`);
          values.push(f.val);
          break;
        case "gte":
          clauses.push(`${qc} >= $${idx++}`);
          values.push(f.val);
          break;
        case "lt":
          clauses.push(`${qc} < $${idx++}`);
          values.push(f.val);
          break;
        case "lte":
          clauses.push(`${qc} <= $${idx++}`);
          values.push(f.val);
          break;
        case "null":
          clauses.push(`${qc} IS ${f.not ? "NOT " : ""}NULL`);
          break;
        case "in": {
          if (!f.vals || f.vals.length === 0) {
            clauses.push("FALSE"); // IN () is always false
          } else {
            const ph = f.vals.map(() => `$${idx++}`).join(", ");
            clauses.push(`${qc} IN (${ph})`);
            values.push(...f.vals);
          }
          break;
        }
        case "like":
          clauses.push(`${qc} LIKE $${idx++}`);
          values.push(f.val);
          break;
        case "ilike":
          clauses.push(`${qc} ILIKE $${idx++}`);
          values.push(f.val);
          break;
        case "not":
          if (f.op === "is" && f.val === null) {
            clauses.push(`${qc} IS NOT NULL`);
          } else {
            clauses.push(`NOT (${qc} ${f.op.toUpperCase()} $${idx++})`);
            values.push(f.val);
          }
          break;
      }
    }

    return {
      sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
      values,
    };
  }

  _formatResult(rows) {
    if (this._single) {
      if (rows.length === 0) {
        return { data: null, error: { message: "No rows found", code: "PGRST116" } };
      }
      return { data: rows[0], error: null };
    }
    if (this._maybeSingle) {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }

  async _execute() {
    const client = await this._pool.connect();
    try {
      // Set schema search path for this connection so unqualified names resolve correctly.
      await client.query(`SET search_path TO "${this._schema}", public`);

      const fullTable = `"${this._schema}"."${this._table}"`;

      if (this._op === "SELECT") return await this._execSelect(client, fullTable);
      if (this._op === "INSERT") return await this._execInsert(client, fullTable);
      if (this._op === "UPSERT") return await this._execUpsert(client, fullTable);
      if (this._op === "UPDATE") return await this._execUpdate(client, fullTable);
      if (this._op === "DELETE") return await this._execDelete(client, fullTable);

      return { data: null, error: { message: "Unknown operation" } };
    } catch (err) {
      console.error(`[DB] ${this._op} "${this._table}" error:`, err.message);
      return { data: null, error: { message: err.message, code: err.code } };
    } finally {
      client.release();
    }
  }

  async _execSelect(client, fullTable) {
    const schema = this._schema;
    const table = this._table;

    // COUNT query
    if (this._countQuery) {
      const { sql: where, values } = this._buildWhere(1);
      const result = await client.query(
        `SELECT COUNT(*)::int AS count FROM ${fullTable}${where}`,
        values
      );
      return { count: result.rows[0].count, error: null };
    }

    const { mainCols, forwardJoins, reverseJoins } = parseSelect(this._selectStr);
    const { sql: where, values } = this._buildWhere(1);

    // Build subquery expressions for forward FK joins (many-to-one).
    // e.g. partners:partner_id(name,email) → scalar subquery returning JSON object
    const fwdExprs = forwardJoins.map((fj) => {
      const colExpr =
        fj.cols === "*"
          ? `to_json(fj_${fj.alias}.*)`
          : `json_build_object(${fj.cols
              .split(",")
              .map((c) => c.trim())
              .map((c) => `'${c}', fj_${fj.alias}."${c}"`)
              .join(", ")})`;
      return (
        `(SELECT ${colExpr} FROM "${schema}"."${fj.refTable}" fj_${fj.alias} ` +
        `WHERE fj_${fj.alias}.id = main."${fj.fkCol}" LIMIT 1) AS "${fj.alias}"`
      );
    });

    // Build subquery expressions for reverse FK joins (one-to-many).
    // e.g. blocks(*) → array subquery; FK column discovered from information_schema.
    const revExprs = [];
    for (const rj of reverseJoins) {
      const fkCol = await lookupReverseFk(client, schema, rj.table, table);
      if (!fkCol) {
        console.warn(
          `[DB] No FK found from "${schema}"."${rj.table}" → "${table}" — skipping join`
        );
        continue;
      }
      const colExpr =
        rj.cols === "*"
          ? `rj_${rj.table}.*`
          : rj.cols
              .split(",")
              .map((c) => c.trim())
              .map((c) => `rj_${rj.table}."${c}"`)
              .join(", ");
      revExprs.push(
        `COALESCE((SELECT json_agg(rj_${rj.table}.*) FROM "${schema}"."${rj.table}" rj_${rj.table} ` +
          `WHERE rj_${rj.table}."${fkCol}" = main.id), '[]'::json) AS "${rj.table}"`
      );
    }

    const allCols = [mainCols, ...fwdExprs, ...revExprs].join(", ");
    let sql = `SELECT ${allCols} FROM ${fullTable} main${where}`;
    if (this._orderCol)
      sql += ` ORDER BY main."${this._orderCol}" ${this._orderAsc ? "ASC" : "DESC"}`;
    if (this._single || this._maybeSingle) sql += " LIMIT 1";
    else if (this._limitVal) sql += ` LIMIT ${this._limitVal}`;
    if (this._offsetVal) sql += ` OFFSET ${this._offsetVal}`;

    const result = await client.query(sql, values);
    return this._formatResult(result.rows);
  }

  async _execInsert(client, fullTable) {
    const rows = this._insertRows;
    if (!rows?.length) return { data: [], error: null };

    const keys = Object.keys(rows[0]);
    const cols = keys.map((k) => `"${k}"`).join(", ");
    let idx = 1;
    const rowPh = rows
      .map((row) => `(${keys.map(() => `$${idx++}`).join(", ")})`)
      .join(", ");
    const values = rows.flatMap((row) => keys.map((k) => toSqlValue(row[k])));

    const result = await client.query(
      `INSERT INTO ${fullTable} (${cols}) VALUES ${rowPh} RETURNING *`,
      values
    );
    return this._formatResult(result.rows);
  }

  async _execUpsert(client, fullTable) {
    const rows = this._insertRows;
    if (!rows?.length) return { data: [], error: null };

    const keys = Object.keys(rows[0]);
    const cols = keys.map((k) => `"${k}"`).join(", ");
    let idx = 1;
    const rowPh = rows
      .map((row) => `(${keys.map(() => `$${idx++}`).join(", ")})`)
      .join(", ");
    const values = rows.flatMap((row) => keys.map((k) => toSqlValue(row[k])));

    const conflictTarget = this._upsertOpts?.onConflict
      ? this._upsertOpts.onConflict
          .split(",")
          .map((c) => `"${c.trim()}"`)
          .join(", ")
      : '"id"';

    const updateKeys = keys.filter((k) => k !== "id" && k !== "created_at");
    const updateSet = updateKeys.map((k) => `"${k}" = EXCLUDED."${k}"`).join(", ");

    const sql =
      `INSERT INTO ${fullTable} (${cols}) VALUES ${rowPh} ` +
      `ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateSet} ` +
      `RETURNING *`;

    const result = await client.query(sql, values);
    return this._formatResult(result.rows);
  }

  async _execUpdate(client, fullTable) {
    const data = this._updateData;
    const keys = Object.keys(data);
    if (!keys.length) return { data: [], error: null };

    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const updateVals = keys.map((k) => toSqlValue(data[k]));

    const { sql: where, values: whereVals } = this._buildWhere(keys.length + 1);

    const result = await client.query(
      `UPDATE ${fullTable} SET ${setClause}${where} RETURNING *`,
      [...updateVals, ...whereVals]
    );
    return this._formatResult(result.rows);
  }

  async _execDelete(client, fullTable) {
    const { sql: where, values } = this._buildWhere(1);
    const result = await client.query(
      `DELETE FROM ${fullTable}${where} RETURNING *`,
      values
    );
    return this._formatResult(result.rows);
  }
}

// Mimics the Supabase client's schema() method for multi-tenant routing.
export class SchemaClient {
  constructor(pool, schema) {
    this._pool = pool;
    this._schema = schema;
  }

  from(table) {
    return new QueryBuilder(this._pool, this._schema).from(table);
  }

  schema(name) {
    return new SchemaClient(this._pool, name);
  }
}
