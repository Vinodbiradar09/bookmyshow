-- KEYS
-- 1 -> stock key (JSON)
-- 2 -> reservation key
-- 3 -> idempotency key

-- ARGV
-- 1 -> qty
-- 2 -> reservationId
-- 3 -> userId
-- 4 -> concertId
-- 5 -> ttl

local concertJson = redis.call("GET", KEYS[1])
if not concertJson then
  return { err = "STOCK_NOT_INITIALIZED" }
end

local concert = cjson.decode(concertJson)
local available = tonumber(concert.availableTickets)

if not available then
  return { err = "INVALID_STOCK_DATA" }
end

local existing = redis.call("GET", KEYS[3])
if existing then
  return { "IDEMPOTENT", existing }
end

local qty = tonumber(ARGV[1])
if available < qty then
  return { err = "INSUFFICIENT_STOCK" }
end

concert.availableTickets = available - qty
redis.call("SET", KEYS[1], cjson.encode(concert))

redis.call("HSET", KEYS[2],
  "reservationId", ARGV[2],
  "userId", ARGV[3],
  "concertId", ARGV[4],
  "qty", ARGV[1]
)

redis.call("EXPIRE", KEYS[2], tonumber(ARGV[5]))
redis.call("SET", KEYS[3], ARGV[2], "EX", tonumber(ARGV[5]))

return { "RESERVED", ARGV[2] }
