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

local function main()
  local lib     = readpath'lib.js'
  local test    = readpath'test.js'
  local ext     = readpath'ext.js'
  local options = readpath'options.js'
  writepath('pearid_test.js',    lib..'\n'..test)
  writepath('pearid.js',         lib..'\n'..ext)
  writepath('pearid_options.js', lib..'\n'..options)
end

print'Constantly writing to pearid.js and pearid_test.js'
print'Exit with Ctrl+C'
while true do
  pcall(main)
  -- handle Ctrl+C case (os.execute sends it to sleep)
  if not os.execute'sleep 0.5' then os.exit(0) end
do
end end
