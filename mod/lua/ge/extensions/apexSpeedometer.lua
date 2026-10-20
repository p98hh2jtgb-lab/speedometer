-- Original APEX bridge: real world-velocity magnitude, independent of wheel rotation.
-- UI also reads electrics.airspeed directly; this is a second, independent path.
local M = {}
local elapsed = 0
local lastVehicle = nil
local hadVehicle = false

local function number(value)
  return type(value) == 'number' and value == value and math.abs(value) < math.huge
end

local function playerVehicle()
  if not be then return nil end
  if be.getPlayerVehicleID then
    local id = be:getPlayerVehicleID(0)
    if id and id ~= -1 then
      if be.getObjectByID then return be:getObjectByID(id) end
      if be.getObject then return be:getObject(id) end
    end
  end
  if be.getPlayerVehicle then return be:getPlayerVehicle(0) end
  return nil
end

local function velocityMagnitude(vehicle)
  -- Accept vec3/table or XYZ returns. Do not depend on a vec3 :length() method.
  for _, name in ipairs({'getVelocity', 'getVelocityXYZ', 'getLinearVelocity'}) do
    local ok, speed = pcall(function()
      if not vehicle[name] then return nil end
      local a, b, c = vehicle[name](vehicle)
      local x, y, z
      if number(a) and number(b) then
        x, y, z = a, b, c or 0
      elseif a ~= nil then
        x, y, z = a.x, a.y, a.z
      end
      if number(x) and number(y) and number(z) then
        return math.sqrt(x*x + y*y + z*z)
      end
      return nil
    end)
    if ok and number(speed) then return speed end
  end
  return nil
end

local function onUpdate(dtReal)
  elapsed = elapsed + (dtReal or 0)
  if elapsed < 0.05 then return end
  elapsed = elapsed % 0.05
  local vehicle = playerVehicle()
  if not vehicle then
    if hadVehicle then
      guihooks.trigger('apexSpeedometer.ground', {available = false, reset = true})
    end
    hadVehicle, lastVehicle = false, nil
    return
  end
  local id = vehicle:getID()
  local changed = id ~= lastVehicle
  lastVehicle, hadVehicle = id, true
  local speed = velocityMagnitude(vehicle)
  guihooks.trigger('apexSpeedometer.ground', {
    available = speed ~= nil, speed = speed, vehicleId = id, reset = changed
  })
end

local function onVehicleResetted(id)
  local vehicle = playerVehicle()
  if vehicle and vehicle:getID() == id then
    guihooks.trigger('apexSpeedometer.ground', {available = true, speed = 0, reset = true})
  end
end

local function onExtensionUnloaded()
  guihooks.trigger('apexSpeedometer.ground', {available = false})
end

M.onUpdate = onUpdate
M.onVehicleResetted = onVehicleResetted
M.onExtensionUnloaded = onExtensionUnloaded
return M
