-- reserve_tickets.lua
-- KEYS
-- 1 -> stock key (JSON)
-- 2 -> reservation key (hash)
-- 3 -> idempotency key

-- ARGV
-- 1 -> qty
-- 2 -> reservationId
-- 3 -> userId
-- 4 -> concertId
-- 5 -> ttl

-- Check if stock exists
local concertJson = redis.call("GET", KEYS[1])
if not concertJson then
  return redis.error_reply("STOCK_NOT_INITIALIZED")
end

-- Parse concert data
local concert = cjson.decode(concertJson)
local available = tonumber(concert.availableTickets)

if not available then
  return redis.error_reply("INVALID_STOCK_DATA")
end

-- Check for existing idempotent request
local existing = redis.call("GET", KEYS[3])
if existing then
  return { "IDEMPOTENT", existing }
end

-- Validate quantity
local qty = tonumber(ARGV[1])
if not qty or qty <= 0 then
  return redis.error_reply("INVALID_QUANTITY")
end

if available < qty then
  return redis.error_reply("INSUFFICIENT_STOCK")
end

-- Update available tickets
concert.availableTickets = available - qty
redis.call("SET", KEYS[1], cjson.encode(concert))

-- Store reservation details
redis.call("HSET", KEYS[2],
  "reservationId", ARGV[2],
  "userId", ARGV[3],
  "concertId", ARGV[4],
  "qty", ARGV[1]
)

-- Set expiration
local ttl = tonumber(ARGV[5])
redis.call("EXPIRE", KEYS[2], ttl)
redis.call("SET", KEYS[3], ARGV[2], "EX", ttl)

return { "RESERVED", ARGV[2] }