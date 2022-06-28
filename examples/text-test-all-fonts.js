var geometry = /* color: #d63000 */ee.Geometry.Point([-122.78530847167968, 39.42475779445961]),
    geometry2 = /* color: #d63000 */ee.Geometry.Point([-122.84024011230468, 39.15266132010239]),
    geometry3 = /* color: #98ff00 */ee.Geometry.Point([-122.87869226074218, 38.82817512925302]),
    geometry4 = /* color: #0b4a8b */ee.Geometry.Point([-122.86770593261718, 38.558066690579494]),
    geometry5 = /* color: #ffc82d */ee.Geometry.Point([-121.90640222167968, 39.58581451510441]),
    geometry6 = /* color: #00ffff */ee.Geometry.Point([-121.90640222167968, 39.395048748192416]),
    geometry7 = /* color: #bf04c2 */ee.Geometry.Point([-121.91738854980468, 39.21227274582616]),
    geometry8 = /* color: #ff0000 */ee.Geometry.Point([-121.95034753417968, 39.03328686948669]),
    geometry9 = /* color: #00ff00 */ee.Geometry.Point([-121.95584069824218, 38.82817512925307]),
    geometry11 = /* color: #999900 */ee.Geometry.Point([-121.96682702636718, 38.43338849688759]),
    geometry12 = /* color: #009999 */ee.Geometry.Point([-121.99429284667968, 38.11858916930806]),
    geometry10 = /* color: #ff00ff */ee.Geometry.Point([-121.96682702636718, 38.5924226932436]);

Map.centerObject(geometry, 8)
var text = require('users/gena/packages:text');

var scale = Map.getScale()

var infos = [
  ['Consolas', 16, geometry],
  ['Consolas', 18, geometry2],
  ['Consolas', 24, geometry3],
  ['Consolas', 32, geometry4],
  ['Arial', 10, geometry5],
  ['Arial', 12, geometry6],
  ['Arial', 14, geometry7],
  ['Arial', 16, geometry8],
  ['Arial', 18, geometry9],
  ['Arial', 24, geometry10],
  ['Arial', 32, geometry11],
  ['Arial', 64, geometry12]
]

function show(info) {
  var fontType = info[0]
  var fontSize = info[1]
  var pt = info[2]
  
  print(fontType, fontSize)
  
  var titleText = text.draw('Test V', pt, scale, { 
    fontSize: fontSize, textColor: '000000', fontType: fontType,
    outlineColor: 'ffffff', outlineWidth: 2.5, outlineOpacity: 0.6
  })

  Map.addLayer(titleText, {}, fontType + ' ' + fontSize)
}

infos.map(show)