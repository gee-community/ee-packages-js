/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-108.544921875, 49.83798245308484],
          [-106.5234375, 52.908902047770255],
          [-113.59171297298622, 52.88037073584405],
          [-117.861328125, 54.31652324025826],
          [-121.4208984375, 53.30462107510271]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
/*
Copyright (c) 2018 Gennadii Donchyts. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.
*/

var text = require('users/gena/packages:text')

function testGetLocation() {
  var bounds = geometry.bounds()
  Map.addLayer(bounds)
  
  var pt1 = text.getLocation(bounds, 'left', '20%', '1%')
  Map.addLayer(pt1, {color: 'green'})
  
  var pt2 = text.getLocation(bounds, 'top', '50%', '5%')
  Map.addLayer(pt2, {color: 'red'})
  
  var pt3 = text.getLocation(bounds, 'bottom', '50%', '5%')
  Map.addLayer(pt3, {color: 'blue'})
}

testGetLocation()

function testAnnotateImage() {
  Map.centerObject(geometry, 6)

  var scale = Map.getScale() 
  var fontSize = 18
  
  
  var bounds = geometry.bounds()
  var image = ee.Image().paint(bounds)
    .set({ 'system:time_start': ee.Date('2000-01-01').millis() })
    .set({ 'SUN_ELEVATION': 45 })
  
  var annotations = [
    {
      position: 'top', offset: '50%', margin: '5%',
      property: 'system:time_start',
      format: function(o) { return ee.Date(o).format('YYYY-MM-dd') },
      scale: scale,
      fontType: 'Consolas', fontSize: 18
    },
    {
      position: 'left', offset: '50%', margin: '2%',
      property: 'SUN_ELEVATION',
      format: function(o) { return ee.Number(o).format('%.1f degree') },
      scale: scale,
      fontType: 'Consolas', fontSize: 18
    },
  ]
  
  var vis = {forceRgbOutput: true}
  var results = text.annotateImage(image, vis, bounds, annotations)
 
  Map.addLayer(results, {}, 'annotated image')
}

testAnnotateImage()
