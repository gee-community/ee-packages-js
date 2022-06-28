/*
Copyright (c) 2018 Gennadii Donchyts. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.
*/

var assets = require('users/gena/packages:assets')
var animation = require('users/gena/packages:animation')

var images = assets.getImages(Map.getCenter(), {
  missions: [
    'S2',
    'L8',
    //'L7'
  ],
  
  filter: ee.Filter.date('2020-01-01', '2021-01-01')
})

var bounds = Map.getCenter().buffer(Map.getScale()*200)

images = assets.getMostlyCleanImages(images, bounds, {
  //cloudFrequencyThresholdDelta: 0.15,
  percentile: 98,
  qualityBand: 'green',
  scale: Map.getScale()
})


images = images.sort('system:time_start')
//images = images.sort('quality_score')

images = images.map(function(i) {
  return i.visualize({bands: ['red', 'green', 'blue'], min: 0.05, max: 0.4})
    .set({label: i.date().format().cat(' ').cat(ee.Number(i.get('quality_score')).format('%.3f'))})
})

animation.animate(images, {maxFrames: 80})
  .then(function() {
    Map.addLayer(ee.Image().paint(bounds, 1, 3), {palette: ['ffff00']}, 'aoi')
  })

