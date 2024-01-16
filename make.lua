-- constantly re-makes the test and content scripts

local function readpath(path)
  local f = io.open(path); local t = f:read'a'
  f:close()
  return t
end
local function writepath(path, text)
  local f = io.open(path, 'w'); local t = f:write(text)
  f:close()
end

print'Constantly writing to itsame.js and itsame_test.js'
print'Exit with Ctrl+C'
while true do
do
  local lib = readpath'lib.js'
  local test = readpath'test.js'
  local ext = readpath'ext.js'
  writepath('itsame_test.js', lib..'\n'..test)
  writepath('itsame.js',      lib..'\n'..ext)
  -- handle Ctrl+C case (os.execute sends it to sleep)
  if not os.execute'sleep 0.5' then os.exit(0) end
end end
