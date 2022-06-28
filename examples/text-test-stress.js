/*
Copyright (c) 2018 Gennadii Donchyts. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.
*/

var text = require('users/gena/packages:text')

// dim background
Map.addLayer(ee.Image(1), {palette:['000000'], opacity:0.7}, 'bg')

// stress test, multiple strings
var bounds = Map.getBounds(true)

// sample multiple points and paint their coordinates
var count = 50
var samples = ee.Image.pixelLonLat().sample({region: bounds, numPixels: count, scale: 100, geometries: true})
Map.addLayer(samples, {color:'eeee40'}, 'points')

// draw label using point coordinates
function drawLabel(feature) { 
  var str = toString(feature.geometry().coordinates())
  return text.draw(str, feature.geometry(), Map.getScale()) 
}

var labelsImage = ee.ImageCollection(samples.map(drawLabel))

var labelsLayer = ui.Map.Layer(labelsImage, {}, 'labels')
Map.layers().add(labelsLayer)


// update labels when image zoom changes
Map.onChangeZoom(function(zoom) {
  labelsLayer.setEeObject(ee.ImageCollection(samples.map(drawLabel)))
})


function toString(coord) {
  var x = ee.Number(coord.get(0))
  var y = ee.Number(coord.get(1))
  
  return x.format('%.2f').cat(', ').cat(y.format('%.2f'))
} 

