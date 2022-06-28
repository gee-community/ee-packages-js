var text = require('users/gena/packages:text')

Map.setCenter(-104.48, 38.37, 6)

// select images
var bounds = Map.getBounds(true)
var scale = Map.getScale()

var images = ee.ImageCollection('LANDSAT/LC8_L1T_TOA').select([5,4,2]).filterBounds(bounds).filterDate('2015-01-01', '2015-01-7')

// render annotated images
function annotate(images) {
  return images.map(function(i) {
    var geom = i.select(0).geometry()
    var center = ee.List(geom.centroid().coordinates())

    // add edge around image    
    var edge = ee.Image(0).toByte().paint(geom, 1, 2)
    edge = edge.mask(edge)
      .visualize({palette:['cccc00'], opacity: 0.9})

    // define text properties
    var props = { textColor: '000000', outlineColor: 'ffffff', outlineWidth: 2.5, outlineOpacity: 0.6}
  
    // draw text
    var pos = translate(center, 0.7, -0.4)
    var s = ee.String(i.get('DATE_ACQUIRED'))
    var textDate = text.draw(s, pos, scale, props)
  
    pos = translate(center, 0.7, -0.1)
    s = ee.String(i.get('SCENE_CENTER_TIME')).slice(0, 5)
    var textTime = text.draw(s, pos, scale, props)

    pos = translate(center, -0.1, 0.3)
    s = ee.String(i.get('CLOUD_COVER')).slice(0, 5)
    props.textColor = '0000aa'
    var textCloud = text.draw(s, pos, scale, props)
    
    return ee.ImageCollection([edge, textDate, textTime, textCloud]).mosaic() // merge results
  }) 
}

// translate point coordinates by dx, dy
function translate(pt, dx, dy) {
  var x1 = ee.Number(pt.get(0)).subtract(dx)
  var y1 = ee.Number(pt.get(1)).subtract(dy)
  
  return ee.Geometry.Point(ee.List([x1, y1]))
}

// add to map
Map.addLayer(images, {}, 'images')
Map.addLayer(annotate(images), {}, 'annotations')

