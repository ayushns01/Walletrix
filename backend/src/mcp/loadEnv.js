/**
 * Loads backend/.env for the standalone MCP server process.
 *
 * The normal app entrypoint (src/index.js) calls dotenv.config(), but the MCP
 * server can be launched on its own (MCP Inspector, `npm run mcp:wallet`, or any
 * client that spawns `node src/mcp/start.js`). Importing this module FIRST — before
 * prisma/config/service modules are evaluated — guarantees process.env is populated
 * regardless of the launcher's working directory.
 *
 * ESM evaluates imported modules depth-first in source order, so `import './loadEnv.js'`
 * placed as the first import in start.js runs dotenv.config() before any module that
 * reads process.env at import time (RPC URLs, DATABASE_URL, SERVER_SIGNING_KEY, …).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
// src/mcp/loadEnv.js -> backend/.env
dotenv.config({ path: path.resolve(dir, '../../.env') });
