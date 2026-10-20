-- Ground speed only. Wheel speed/RPM arrive independently through the electrics UI stream.
local M = {}
local elapsed = 0
local lastVehicle = nil
local hadVehicle = false
local function onUpdate(dtReal, dtSim, dtRaw)
  elapsed = elapsed + (dtReal or 0)
  if elapsed < 0.05 then return end
  elapsed = elapsed % 0.05
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then
    if hadVehicle then
      guihooks.trigger('apexSpeedometer.ground', {available = false, reset = true})
    end
    hadVehicle = false
    lastVehicle = nil
    return
  end
  local id = vehicle:getID()
  local changed = id ~= lastVehicle
  lastVehicle = id
  hadVehicle = true
  local velocity = vehicle:getVelocity()
  guihooks.trigger('apexSpeedometer.ground', {
    available = true,
    speed = velocity:length(),
    vehicleId = id,
    reset = changed
  })
end
local function onVehicleResetted(id)
  local vehicle = be:getPlayerVehicle(0)
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
