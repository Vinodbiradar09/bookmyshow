-- KEYS
-- 1 -> concert stock key
-- 2 -> reservation key
-- 3 -> idempotency key

-- ARGV
-- 1 -> qty
-- 2 -> reservationId
-- 3 -> userId
-- 4 -> concertId
-- 5 -> ttl (seconds)

local stock = tonumber(redis.call("GET", KEYS[1]))

if not stock then
  print("stock is" , stock);
  return { err = "STOCK_NOT_INITIALIZED" }
end

local existing = redis.call("GET", KEYS[3])
if existing then
  return { "IDEMPOTENT", existing }
end

if stock < tonumber(ARGV[1]) then
  return { err = "INSUFFICIENT_STOCK" }
end

redis.call("DECRBY", KEYS[1], ARGV[1])

redis.call("HSET", KEYS[2],
  "reservationId", ARGV[2],
  "userId", ARGV[3],
  "concertId", ARGV[4],
  "qty", ARGV[1]
)

redis.call("EXPIRE", KEYS[2], tonumber(ARGV[5]))
redis.call("SET", KEYS[3], ARGV[2], "EX", tonumber(ARGV[5]))

return { "RESERVED", ARGV[2] }
