/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-98.54838765842106, -12.79114419304485],
          [-98.41320184545054, -9.300370119442855],
          [-102.14762787154905, -7.247324683929773],
          [-105.38626362230656, -6.59057934043231],
          [-107.63215638949589, -7.841915414862451],
          [-106.64638076018548, -15.058856984709623],
          [-98.53028336646764, -15.519552374242762]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var text = require('users/gena/packages:text')

var str = 'Hello World!'
var scale = Map.getScale()
var props = { 
  textColor: '000000', 
  fontType: 'Arial', 
  fontSize: 32, 
  outlineColor: 'ffffff',
  
  alignX: 'center', // left | center | right
  alignY: 'center' // top | center | bottom
}

var pt = geometry.centroid(1)

Map.addLayer(pt)

var image = text.draw(str, pt, scale, props)

Map.addLayer(image, {}, 'label')
