/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var amsterdam = /* color: #d63000 */ee.Geometry.Point([4.893507460392708, 52.369480378428484]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var charting = require('users/gena/packages:charting')

// get S2 and L8 image times for Amsterdam
var start = ee.Date('2016-01-01')
var stop = ee.Date('2017-01-01')

var images = ee.ImageCollection('COPERNICUS/S2')
  .filterDate(start, stop)
  .filterBounds(amsterdam)

var times = images.aggregate_array('system:time_start')

// define plot (virtual) rectangle
var rect = ee.Geometry.Rectangle({ coords: [[0, 0], [100, 6]], geodesic: false })

// instantiate a rug plot
var plot = new charting.Plot(rect.bounds(), { 
  area: { width: 1, color: '000000', fillColor: '00000011' }
})

// set domain
plot.setMinMax(start.millis(), stop.millis(), 0, 1)

// add S2 times (red)
plot.addRugSeries('S2 times', times, { width: 1, color: 'red' })

// show plot
print(plot.getThumbnail({ dimensions: '600x24'}))
