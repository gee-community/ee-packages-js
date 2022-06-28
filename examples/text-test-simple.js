/*
Copyright (c) 2018 Gennadii Donchyts. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.
*/

var text = require('users/gena/packages:text')

// dim background
Map.addLayer(ee.Image(1), {palette:['000000'], opacity:0.7}, 'bg')

// scale text font relative to the current map scale
var scale = Map.getScale() * 2

// draw text at map center
var str = 'Hello, how are you?'
var point = Map.getCenter()
var text = text.draw(str, point, scale, {fontSize:32})

// add text as a raster layer
Map.addLayer(text, {}, 'simple text')


