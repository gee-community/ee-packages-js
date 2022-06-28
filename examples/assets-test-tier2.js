/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = /* color: #d63000 */ee.Geometry.Point([4.904669562931645, 51.81809355570926]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
/*
Copyright (c) 2018 Gennadii Donchyts. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.
*/

// By default, assets.getImages() returns Landsat T1 images. 
// Use includeTier2: true option to include T2 as well

// WARNING: use T2 at your own risk, many of T2 images look quite fine, but some could be bad
// Example of badly registered images: https://code.earthengine.google.com/531e3341b65e427df53e0e3f82e1f1f2

var assets = require('users/gena/packages:assets')
var charting = require('users/gena/packages:charting')

var start = ee.Date('2017-01-01')
var stop = ee.Date('2018-01-01')

Map.centerObject(geometry, 8)

var imagesT1 = assets.getImages(geometry, { 
  missions: [ 'L8' ],
  filter: ee.Filter.date(start, stop)
})

var imagesT1T2 = assets.getImages(geometry, { 
  missions: [ 'L8' ], 
  filter: ee.Filter.date(start, stop),
  includeTier2: true
})

// rug plots
charting.showTimesRugPlot(imagesT1, { tmin: start.millis(), tmax: stop.millis() })
charting.showTimesRugPlot(imagesT1T2, { tmin: start.millis(), tmax: stop.millis() })

// show
Map.addLayer(ee.Image(imagesT1.toList(1, 5).get(0)) , { min: 0, max: 0.4 }, 'T1')
Map.addLayer(ee.Image(imagesT1T2.toList(1, 6).get(0)) , { min: 0, max: 0.4 }, 'T2')
