/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var amsterdam = /* color: #d63000 */ee.Geometry.Point([4.898313978947395, 52.38970422940196]),
    geometryRugPlot = 
    /* color: #98ff00 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[4.786905745304817, 52.4314825980257],
          [4.786905745304817, 52.424574258311814],
          [5.024141768254036, 52.424574258311814],
          [5.024141768254036, 52.4314825980257]]], null, false),
    geometryImageClip = 
    /* color: #0b4a8b */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[4.787720934303881, 52.423219683741884],
          [4.787720934303881, 52.35029993487859],
          [5.024613634499193, 52.35029993487859],
          [5.024613634499193, 52.423219683741884]]], null, false),
    geometryDateLabel = 
    /* color: #ffc82d */
    /* shown: false */
    ee.Geometry.Point([4.799093703068489, 52.416620057462794]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var charting = require('users/gena/packages:charting') // plots
var animation = require('users/gena/packages:animation') // animatin image collections
var assets = require('users/gena/packages:assets') // harmonizing image collections
var text = require('users/gena/packages:text') // harmonizing image collections

// map setup
Map.setOptions('SATELLITE')
Map.centerObject(amsterdam, 13)

// time domain
var start = ee.Date('2016-01-01')
var stop = ee.Date('2017-01-01')

// get least cloudy S2 and L8 image times for Amsterdam
var images = assets.getImages(geometryImageClip, { 
  missions: ['S2', 'L8'], // returns a single harmonized colleciton consisting of multiple missions
  filterMasked: true, // include only images covering AOI 100%
  filter: ee.Filter.date(start, stop)
})

images = assets.getMostlyCleanImages(images, geometryImageClip, {
  cloudFrequencyThresholdDelta: 0.15 // % from cloud frequency for this area
}).sort('system:time_start')

// get time stamps
var timesS2 = images.filter(ee.Filter.eq('MISSION', 'S2')).aggregate_array('system:time_start')
var timesL8 = images.filter(ee.Filter.eq('MISSION', 'L8')).aggregate_array('system:time_start')

// month times
var timesMonthly = ee.List.sequence(1, 12).map(function(m) { 
  return ee.Date.fromYMD(2016, 1, 1).advance(m, 'month').millis() 
})

// instantiate a rug plot
var plot = new charting.Plot(geometryRugPlot.bounds(), { 
  area: { width: 2, color: '000000', fillColor: 'ffffff' }
})

// set domain
plot.setMinMax(start.millis(), stop.millis(), 0, 1)

// add month bars
plot.addRugSeries('months', timesMonthly, { width: 2, color: '000000' })

// add S2 times (red)
plot.addRugSeries('S2 times', timesS2, { width: 3, color: 'red' }, 0, 0.3)

// add L8 times (green)
plot.addRugSeries('L8 times', timesL8, { width: 3, color: 'green' }, 0.7, 1)

// shows plot elements as map layers
var plotImage = plot.getImage()
Map.addLayer(plotImage, {}, 'plot')

// animate images
var styleSelection = { width: 2, color: '00ffff', fillColor: '00ffff33' }

images = images.map(function(i) {
  var position = plot.getVLine(i.date().millis()).buffer(Map.getScale() * 5).bounds()
  
  return ee.ImageCollection([
    // background frame
    ee.Image().paint(geometryImageClip, 1).visualize({ palette: ['ffffff44']}),

    // image (clipped to frame)
    i.visualize({ min: 0.04, max: 0.4 }).clip(geometryImageClip),

    // cursor
    ee.FeatureCollection(position).style(styleSelection),

    // label
    text.draw(i.date().format('YYYY-MM-dd').cat(', ').cat(i.get('MISSION')), geometryDateLabel, Map.getScale(), { 
      fontSize: 24, textColor: 'ffffff', fontType: 'Consolas',
      outlineColor: '000000', outlineWidth: 2.5, outlineOpacity: 0.6
    })
  ]).mosaic()
  .set({
    date: i.date().format('YYYY-MM-dd')
  })
})

// animate images and time cursor
animation.animate(images, { maxFrames: images.size(), label: 'label' })

// export video
images = images.map(function(i) {
  // in the Code Editor the plot elements are added as map layers, blend them when exporting
  return plotImage.blend(i) 
})

Export.video.toDrive({
  collection: images, 
  description: 'timelapse-S2-L8',
  fileNamePrefix: 'timelapse-S2-L8', 
  framesPerSecond: 5, 
  scale: Map.getScale(), 
  region: geometryImageClip.union(geometryRugPlot, 1).bounds(), 
  crs: 'EPSG:3857'
})