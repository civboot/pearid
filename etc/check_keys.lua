-- Test that signatures that were generated (by the extension or elsewhere) can
-- be used.
--
-- can be generated on command line with:
--   openssl genrsa -out mykey.secret 4096
-- 10012  openssl dgst -sha256 -verify mykey.pub -signature sha256.sign 
-- 10013  openssl dgst -sha256 -sign mykey.secret -out sha256.sign myfile.txt\n
-- 10014  openssl dgst -sha256 -verify mykey.pub -signature sha256.sign 
-- 10015  openssl dgst -sha256 -verify mykey.pub -signature sha256.sign myfile.txt

local function exe(...)
  local cmd = string.format(...)
  if not os.execute(cmd) then error('cmd failed: '..cmd) end
end

local function writePath(path, text)
  local f = io.open(path, 'w'); f:write(text); f:close()
end

local function fileExists(path)
  local f = io.open(path); if f then f:close(); return true end
end

local function genKeys()
  exe[[openssl genrsa -out out/private.key 4096]]
  exe[[openssl rsa -in out/private.key -pubout -out out/public.key]]
end

local function createPlain() writePath('out/plain.txt', 'some text to be signed') end


local function sign()
  exe[[openssl dgst -sha256 -sign out/private.key -out out/sha256.sign out/plain.txt]]
end

local function verify()
  exe[[openssl dgst -sha256 -verify out/public.key -signature out/sha256.sign out/plain.txt]]
end

print'Using (or generating) keys in out/private.key and out/public.key'
exe[[mkdir -p out/]]
createPlain()
if not fileExists'out/public.key' then genKeys() end
sign()
verify()
print'Done. Keys work'
