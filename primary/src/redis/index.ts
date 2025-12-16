import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { redis } from "./redis.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const loadLua = (file: string) =>
  fs.readFileSync(path.join(__dirname, "scripts", file), "utf8");

export const luaScripts = {
    reserveTickets: loadLua("reserve_tickets.lua"),
    releaseTickets: loadLua("release_tickets.lua"),
}
export {redis};
