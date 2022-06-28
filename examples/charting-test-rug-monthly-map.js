/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var amsterdam = /* color: #d63000 */ee.Geometry.Point([4.893507460392708, 52.369480378428484]),
    geometry = 
    /* color: #98ff00 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[4.680990675724739, 52.32543570628328],
          [4.680990675724739, 52.30948571154238],
          [5.114950636662239, 52.30948571154238],
          [5.114950636662239, 52.32543570628328]]], null, false),
    geometry2 = 
    /* color: #0b4a8b */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[4.681977526100756, 52.423219683741884],
          [4.681977526100756, 52.32848444455118],
          [5.113534227760912, 52.32848444455118],
          [5.113534227760912, 52.423219683741884]]], null, false);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var charting = require('users/gena/packages:charting')
var animation = require('users/gena/packages:animation')

// get S2 and L8 image times for Amsterdam
var start = ee.Date('2016-01-01')
var stop = ee.Date('2017-01-01')

var imagesS2 = ee.ImageCollection('COPERNICUS/S2')
  .filterDate(start, stop)
  .filterBounds(amsterdam)

var timesS2 = imagesS2.aggregate_array('system:time_start')

var imagesL8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_RT_TOA")
  .filterDate(start, stop)
  .filterBounds(amsterdam)

var timesL8 = imagesL8.aggregate_array('system:time_start')

var timesMonthly = ee.List.sequence(1, 12).map(function(m) { 
  return ee.Date.fromYMD(2016, 1, 1).advance(m, 'month').millis() 
})

var timesWeekly = ee.List.sequence(1, 365, 7).map(function(d) { 
  return ee.Date.fromYMD(2016, 1, 1).advance(d, 'day').millis() 
})

// define plot target rectangle
var rect = geometry

// instantiate a rug plot
var plot = new charting.Plot(rect.bounds(), { 
  area: { width: 2, color: '000000', fillColor: 'ffffff' }
})

// set domain
plot.setMinMax(start.millis(), stop.millis(), 0, 1)

// add month bars
plot.addRugSeries('weeks', timesWeekly, { width: 1, color: '00000055' })
plot.addRugSeries('months', timesMonthly, { width: 2, color: '000000' })

// add S2 times (red)
plot.addRugSeries('S2 times', timesS2, { width: 3, color: 'red' }, 0, 0.3)

// add L8 times (green)
plot.addRugSeries('L8 times', timesL8, { width: 3, color: 'green' }, 0.7, 1)

// add plot to the map
// Map.addLayer(plot.getImage())

// shows plot elements as map layers
plot.show()

// animate images
var styleSelection = { width: 2, color: '00ffff', fillColor: '00ffff33' }

imagesS2 = imagesS2.map(function(i) {
  var position = plot.getVLine(i.date().millis()).buffer(Map.getScale() * 5).bounds()
  
  return ee.ImageCollection([
    i.visualize({ bands: ['B12', 'B8', 'B3'], min: 400, max: 4000 }),
    ee.FeatureCollection(position).style(styleSelection),
    ee.Image().paint(geometry2, 1).visualize({ palette: ['000000']})
  ]).mosaic().clip(geometry2)
  .set({
    date: i.date().format('YYYY-MMM')
  })
})

animation.animate(imagesS2, { maxFrames: imagesS2.size(), label: 'label' })
