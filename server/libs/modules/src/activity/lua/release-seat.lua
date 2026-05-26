-- Atomic seat release operation
-- KEYS[1] = activity join count key (e.g. "activity:{id}:join_count")
-- ARGV[1] = slots to release (default 1)
-- Returns: new join count

local joinKey = KEYS[1]
local slots = tonumber(ARGV[1]) or 1

local current = tonumber(redis.call('GET', joinKey) or '0')
local newVal = math.max(0, current - slots)

redis.call('SET', joinKey, newVal)

return newVal
