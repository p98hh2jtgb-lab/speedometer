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
            getVelocity = function() return {length=function() return 27.5 end} end}
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

if __name__ == '__main__':
    unittest.main()
