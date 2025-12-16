-- KEYS
-- 1 -> concert stock key
-- 2 -> reservation key

-- ARGV
-- 1 -> qty

if redis.call("EXISTS", KEYS[2]) == 0 then
  return "RESERVATION_NOT_FOUND"
end

redis.call("INCRBY", KEYS[1], tonumber(ARGV[1]))
redis.call("DEL", KEYS[2])

return "RELEASED"


