-- Atomic seat grab operation
-- KEYS[1] = activity seat key (e.g. "activity:{id}:seats")
-- KEYS[2] = activity join count key (e.g. "activity:{id}:join_count")
-- ARGV[1] = activity capacity
-- ARGV[2] = requested slots (default 1)
-- Returns: 1 = success, 0 = no seats, -1 = already joined

local seatKey = KEYS[1]
local joinKey = KEYS[2]
local capacity = tonumber(ARGV[1])
local slots = tonumber(ARGV[2]) or 1

-- Check current join count
local current = tonumber(redis.call('GET', joinKey) or '0')

if current + slots > capacity then
  return 0  -- No seats available
end

-- Increment join count atomically
redis.call('INCRBY', joinKey, slots)

return 1  -- Success
