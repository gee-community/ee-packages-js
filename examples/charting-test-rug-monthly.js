/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var amsterdam = /* color: #d63000 */ee.Geometry.Point([4.903566536318964, 52.37605514091119]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var charting = require('users/gena/packages:charting')

print('A rug plot showing overpass time of Sentinel-2 (red) and Landsat 8 (green) ' +
      'for Amsterdam in 2016')

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

// define plot (virtual) rectangle
var rect = ee.Geometry.Rectangle({ coords: [[0, 0], [100, 4]], geodesic: false })

// instantiate a rug plot
var plot = new charting.Plot(rect.bounds(), { 
  area: { width: 2, color: '000000', fillColor: '00000011' }
})

// set domain
plot.setMinMax(start.millis(), stop.millis(), 0, 1)

// add days bars
plot.addRugSeries('weeks', timesWeekly, { width: 1, color: '00000044' })

// add month bars
plot.addRugSeries('months', timesMonthly, { width: 2, color: '000000' })

// add S2 times (red)
plot.addRugSeries('S2 times', timesS2, { width: 2, color: 'red' }, 0, 0.3) // 0 and 0.3 hare are start and end of the line, in % of the plot height

// add L8 times (green)
plot.addRugSeries('L8 times', timesL8, { width: 2, color: 'green' }, 0.7, 1)

// show plot
print(plot.getThumbnail({ dimensions: '1200x48'}))
