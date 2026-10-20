"""Exercise the GE extension with mocked BeamNG APIs, not a real game engine."""
from pathlib import Path
import unittest
from lupa import LuaRuntime
from luaparser import ast

SOURCE = Path(__file__).resolve().parents[1] / 'mod/lua/ge/extensions/apexSpeedometer.lua'

class ExtensionTests(unittest.TestCase):
    def setUp(self):
        self.lua = LuaRuntime()
        self.lua.execute('''
          events = {}
          guihooks = { trigger = function(name, data) table.insert(events, {name=name, data=data}) end }
          vehicle = {getID = function() return 42 end,
            getVelocity = function() return {x=0, y=27.5, z=0} end}
          be = {getPlayerVehicle = function() return vehicle end}
        ''')
        self.module = self.lua.execute(SOURCE.read_text())

    def test_syntax(self):
        ast.parse(SOURCE.read_text())

    def test_first_sample_and_rate_limit(self):
        self.module.onUpdate(0.025)
        self.assertEqual(len(self.lua.globals().events), 0)
        self.module.onUpdate(0.025)
        event = self.lua.globals().events[1]
        self.assertEqual(event['name'], 'apexSpeedometer.ground')
        self.assertEqual(event['data']['speed'], 27.5)
        self.assertTrue(event['data']['reset'])
        self.module.onUpdate(0.05)
        self.assertFalse(self.lua.globals().events[2]['data']['reset'])

    def test_despawn_notifies_once(self):
        self.module.onUpdate(0.05)
        self.lua.execute('vehicle = nil')
        self.module.onUpdate(0.05)
        self.module.onUpdate(0.05)
        self.assertEqual(len(self.lua.globals().events), 2)
        self.assertFalse(self.lua.globals().events[2]['data']['available'])

    def test_reset_only_player_vehicle(self):
        self.module.onVehicleResetted(99)
        self.assertEqual(len(self.lua.globals().events), 0)
        self.module.onVehicleResetted(42)
        self.assertEqual(self.lua.globals().events[1]['data']['speed'], 0)
        self.assertTrue(self.lua.globals().events[1]['data']['reset'])

    def test_switch_and_unload(self):
        self.module.onUpdate(0.05)
        self.lua.execute('vehicle.getID = function() return 43 end')
        self.module.onUpdate(0.05)
        self.assertTrue(self.lua.globals().events[2]['data']['reset'])
        self.module.onExtensionUnloaded()
        self.assertFalse(self.lua.globals().events[3]['data']['available'])

    def test_keyboard_shortcut_is_completely_removed(self):
        root = SOURCE.parents[3]
        self.assertFalse((root / 'settings/inputmaps/keyboardAPEXSpeedometer.json').exists())
        self.assertFalse((SOURCE.parent / 'core/input/actions/apexSpeedometer.json').exists())
        self.assertIsNone(self.module.toggleSettings)

    def test_xyz_velocity_api_and_player_id_lookup(self):
        self.lua.execute("""
          be.getPlayerVehicle = nil
          be.getPlayerVehicleID = function() return 42 end
          be.getObjectByID = function() return vehicle end
          vehicle.getVelocity = nil
          vehicle.getVelocityXYZ = function() return 3, 4, 12 end
        """)
        self.module.onUpdate(0.05)
        self.assertEqual(self.lua.globals().events[1]['data']['speed'], 13)

    def test_invalid_velocity_does_not_invent_zero(self):
        self.lua.execute('vehicle.getVelocity = function() return nil end')
        self.module.onUpdate(0.05)
        self.assertFalse(self.lua.globals().events[1]['data']['available'])

    def test_simulation_clock_uses_dt_sim_and_accumulates_before_throttle(self):
        self.module.onUpdate(0.025, 0.005)
        self.module.onUpdate(0.025, 0.005)
        self.assertAlmostEqual(self.lua.globals().events[1]['data']['simTime'], 0.01)
        self.module.onUpdate(0.05, 0.1)
        self.assertAlmostEqual(self.lua.globals().events[2]['data']['simTime'], 0.11)

    def test_pause_keeps_clock_fixed_while_motion_stream_remains_fresh(self):
        self.module.onUpdate(0.05, 0.05)
        self.module.onUpdate(0.05, 0)
        self.assertEqual(len(self.lua.globals().events), 2)
        self.assertEqual(self.lua.globals().events[1]['data']['simTime'], self.lua.globals().events[2]['data']['simTime'])

    def test_missing_or_invalid_sim_clock_never_falls_back_to_real_time(self):
        for dt in [None, -1, float('nan'), float('inf')]:
            self.module.onUpdate(0.05, dt)
            event = self.lua.globals().events[len(self.lua.globals().events)]
            self.assertIsNone(event['data']['simTime'])
            self.assertEqual(event['data']['speed'], 27.5)

    def test_vehicle_reset_carries_clock_without_forging_elapsed_time(self):
        self.module.onUpdate(0.05, 0.02)
        self.module.onVehicleResetted(42)
        event = self.lua.globals().events[2]['data']
        self.assertTrue(event['reset'])
        self.assertEqual(event['speed'], 0)
        self.assertAlmostEqual(event['simTime'], 0.02)

if __name__ == '__main__':
    unittest.main()
