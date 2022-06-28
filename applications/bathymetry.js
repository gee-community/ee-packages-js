/*
Copyright (c) 2021 Deltares. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.

Author: Gennadii Donchyts
*/

var assets = require('users/gena/packages:assets')
var gl = require('users/gena/packages:gl')
var utils = require('users/gena/packages:utils')

function Bathymetry() {
  this.missions = [
      'S2', 
      'L8',
      //'L7', 
      // 'L5', 
      // 'L4'
    ]
    
  this.waterIndexMin = -0.15
  this.waterIndexMax = 0.35
}

/***
 * Computes inverse-depth bathymetry
 */
Bathymetry.prototype.computeInverseDepth = function(options) {
  var images = this.getImages(options.bounds, options.start, options.stop, options.filterMasked, options.filterMaskedFraction, options.scale, options.missions, options.cloudFrequencyThresholdDelta)
  
  var boundsBuffer = 10000
  if(typeof(options.boundsBuffer) !== 'undefined') {
    boundsBuffer = options.boundsBuffer
  }

  this.images = images

  // TODO: move this to assets package
  images = images.map(function(i) {
    var mask = i.select(['blue', 'green', 'red', 'nir', 'swir']).mask().reduce(ee.Reducer.allNonZero())
    return i.updateMask(mask)
  })
  
  // perform analysis using a given buffer around bounds
  var bounds = options.bounds
  if(boundsBuffer) {
    bounds = options.bounds.buffer(boundsBuffer, boundsBuffer / 10)
  }
  
  return this._computeInvertDepth(images, bounds, options.scale, options.pansharpen, options.skipNeighborhoodSearch, options.skipSceneBoundaryFix)
    .set({ count: images.size() })
}

/***
 * Computes intertidal bathymetry
 */
Bathymetry.prototype.computeIntertidalDepth = function(options) {
  var waterIndexMin = options.waterIndexMin ? options.waterIndexMin : this.waterIndexMin
  var waterIndexMax = options.waterIndexMax ? options.waterIndexMax : this.waterIndexMax
  
  this.waterIndexMax = waterIndexMax
  this.waterIndexMin = waterIndexMin

  // perform analysis using a given buffer around bounds
  var bounds = options.bounds
  if(boundsBuffer) {
    bounds = options.bounds.buffer(boundsBuffer, boundsBuffer / 10)
  }

  var images = this.getImages(options.bounds, options.start, options.stop, options.filterMasked, options.filterMaskedFraction, options.scale, options.missions, options.cloudFrequencyThresholdDelta, options.filter)

  this.images = images

  // TODO: move this to assets package
  var bands = ['blue', 'green', 'red', 'nir', 'swir']

  images = images.map(function(i) {
    var mask = i.select(bands).mask().reduce(ee.Reducer.allNonZero()).eq(1)

    return i.updateMask(mask)
  })
  
  var boundsBuffer = 10000
  if(typeof(options.boundsBuffer) !== 'undefined') {
    boundsBuffer = options.boundsBuffer
  }
  
  if(options.skipNeighborhoodSearch) {
    images = assets.addCdfQualityScore(images, 70, 80, false)
  } else {
    var neighborhoodSearchParameters = {erosion: 0, dilation: 0, weight: 100}
    
    if(options.neighborhoodSearchParameters) {
      neighborhoodSearchParameters = options.neighborhoodSearchParameters
    }
    
    var lowerCdfBoundary = 70
    var upperCdfBoundary = 80

    if(options.lowerCdfBoundary) {
      lowerCdfBoundary = options.lowerCdfBoundary
    }

    if(options.upperCdfBoundary) {
      upperCdfBoundary = options.upperCdfBoundary
    }
    
    images = assets.addCdfQualityScore(images, lowerCdfBoundary, upperCdfBoundary, true, neighborhoodSearchParameters)
  }

  if(typeof(options.skipSceneBoundaryFix) === 'undefined' || !options.skipSceneBoundaryFix) {
    // print('Fixing scene boundaries ...')
    // print(options.scale)
    
    // fix scene boundaries
    images = images.map(function(i) {
      var weight = i.select('weight')
      var mask = i.select(0).mask()
      
      mask = utils.focalMin(mask, 10)
          .reproject(ee.Projection('EPSG:3857').atScale(options.scale)).resample('bicubic')
      mask = utils.focalMaxWeight(mask.not(), 10)
        .reproject(ee.Projection('EPSG:3857').atScale(options.scale)).resample('bicubic')
      mask = ee.Image.constant(1).subtract(mask)
      
      weight = weight.multiply(mask)
      
      return i.addBands({ srcImg: weight, overwrite: true })
    })
  }  

  this.images2 = images
  
  // mean = sum(w * x) / sum(w)        
  this.composite = images.map(function(i) {   
       return i.select(bands).multiply(i.select('weight'))
  }).sum().divide(images.select('weight').sum()).select(['red', 'green', 'blue', 'swir', 'nir'])

  // print(images.first())
  
  var bands = ['ndwi', 'indvi', 'mndwi']
  
  if(options.includeNDVI) {
    bands = ['ndwi', 'indvi', 'mndwi', 'ndvi']
  }

  images = images.map(function(i) {
    var t = i.get('system:time_start')
    var weight = i.select('weight')
    
    // var water = ee.Image(i.get('water'))
    // var nonWater = water.subtract(1).multiply(-1)
    
    var ndwi = i.normalizedDifference(['green', 'nir']).rename('ndwi')
    var indvi = i.normalizedDifference(['red', 'nir']).rename('indvi')
    var mndwi = i.normalizedDifference(['green', 'swir']).rename('mndwi')
    
    // ndwi = gl.smoothstep(waterIndexMin, waterIndexMax, ndwi)
    // indvi = gl.smoothstep(waterIndexMin, waterIndexMax, indvi)
    // mndwi = gl.smoothstep(waterIndexMin, waterIndexMax, mndwi)

    ndwi = ndwi.clamp(waterIndexMin, waterIndexMax)
    indvi = indvi.clamp(waterIndexMin, waterIndexMax)
    mndwi = mndwi.clamp(waterIndexMin, waterIndexMax)

    if(options.includeNDVI) {
      var ndvi = i.normalizedDifference(['nir', 'red']).rename('ndvi') 
      return ee.Image([ndwi, indvi, mndwi, ndvi]).addBands(weight)      
    } else {
      return ee.Image([ndwi, indvi, mndwi]).addBands(weight)      
    }
  })

  this.images3 = images

  // mean = sum(w * x) / sum(w)        
  var image = images.map(function(i) {   
       return i.select(bands).multiply(i.select('weight'))
  }).sum().divide(images.select('weight').sum())
  
  return image
}

/***
 * Collects mostly cloud-free images for given bounds
 */
Bathymetry.prototype.getImages = function(bounds, start, stop, filterMasked, filterMaskedFraction, scale, missions, cloudFrequencyThresholdDelta, filter) {
  cloudFrequencyThresholdDelta = typeof(cloudFrequencyThresholdDelta) == 'undefined' ? 0.15 : cloudFrequencyThresholdDelta

  missions = missions ? missions : this.missions // reset to defauls if needed
  
  if(filter) {
    filter = ee.Filter.and(filter, ee.Filter.date(start, stop))
  } else {
    filter = ee.Filter.date(start, stop)
  }
  
  var images = assets.getImages(bounds, { // bounds.centroid(1) ADDED BY ETIENNE KRAS
    missions: missions, 
    filter: filter,
    filterMasked: filterMasked,
    filterMaskedFraction: filterMaskedFraction,
    scale: scale * 10,
    resample: true
  }) // .map(function(image){return image.clip(bounds)}) ADDED BY ETIENNE KRAS
  
  images = assets.getMostlyCleanImages(images, bounds, {
    cloudFrequencyThresholdDelta: cloudFrequencyThresholdDelta
  })
 
  return images
}

/***
 * Computes inverse-depth bathymetry using visible bands
 */
Bathymetry.prototype._computeInvertDepth = function(images, bounds, scale, pansharpen, skipNeighborhoodSearch, skipSceneBoundaryFix) {
  var bands = ['red', 'green', 'blue']
  
  var greenMax = 0.4
  
  images = images.map(function(i) {
    // get very approximate water probability
    var water = i.normalizedDifference(['green', 'nir']).rename('water').unitScale(0, 0.1)
  
    // optionally pansharpen
    if(pansharpen) {
      i = assets.pansharpen(i)
    }
  
    // split water and land into two 
    var waterArea = water.gt(0.01).multiply(ee.Image.pixelArea()).reduceRegion({
      reducer: ee.Reducer.sum(), 
      geometry: bounds, 
      scale: scale * 5, 
      tileScale: 4
    }).values().get(0)
    
    var landArea = water.lt(0).multiply(ee.Image.pixelArea()).reduceRegion({
      reducer: ee.Reducer.sum(), 
      geometry: bounds, 
      scale: scale * 5, 
      tileScale: 4
    }).values().get(0)
  
    // DOS

    // TODO: histogram match DOS correction based on both images, match with the SR products 
    
    var dark = i
  
    dark = dark
      .updateMask(water.gt(0)) // take dark over water only
      .reduceRegion({
        reducer: ee.Reducer.percentile([0]),  // TODO: tune this, check low percentiles instead of 0
        geometry: bounds, 
        scale: scale,
        maxPixels: 1e10,
        tileScale: 4
      })
      
    i = i
      .set(dark)
      .set({water: water})
      .set({waterArea: waterArea})
      .set({landArea: landArea})

    return i
  })
  
  this.imagesStep1 = images
  
  // bad images?
  images = images.filter(ee.Filter.and(ee.Filter.gt(bands[0], 0), ee.Filter.gt(bands[1], 0), ee.Filter.gt(bands[2], 0)))
    
  if(skipNeighborhoodSearch) {
    images = assets.addCdfQualityScore(images, 70, 80, false)
  } else {
    images = assets.addCdfQualityScore(images, 70, 80, true, {erosion: 0, dilation: 0, weight: 200})
  }

  if(typeof(skipSceneBoundaryFix) === 'undefined' || !skipSceneBoundaryFix) {
    // fix scene boundaries
    images = images.map(function(i) {
      var weight = i.select('weight')
      var mask = i.select(0).mask()
      
      mask = utils.focalMin(mask, 10)
          .reproject(ee.Projection('EPSG:3857').atScale(scale)).resample('bicubic')
      mask = utils.focalMaxWeight(mask.not(), 10)
        .reproject(ee.Projection('EPSG:3857').atScale(scale)).resample('bicubic')
      mask = ee.Image.constant(1).subtract(mask)
      
      weight = weight.multiply(mask)
      
      return i.addBands({ srcImg: weight, overwrite: true })
    })
  }  

  images = images.map(function(i) {
    var t = i.get('system:time_start')
    var weight = i.select('weight')
    
    var darkImage = ee.Image.constant(bands.map(function(n) { return i.get(n) })).rename(bands)
   // var darkImage = ee.Image.constant([red, green, blue])
    
    var mission = i.get('MISSION')
    
    var scaleWaterTo = 'percentiles'
    // var scaleWaterTo = 'sigma'
  
    var scaleLandTo = 'percentiles'
    // var scaleLandTo = 'sigma'
  
    var rangePercentilesLand = [2, 98]
    var rangePercentilesWater = [2, 98]
    
    var rangeSigmaLand = [2, 2]
    var rangeSigmaWater = [1, 1]
    
    var water = ee.Image(i.get('water'))
    var nonWater = water.subtract(1).multiply(-1)
  
    i = i.select(bands).subtract(darkImage).max(0.0001)
  
    var iAll = i

    var water2 = gl.smoothstep(-0.05, 0.2, water)
    var nonWater2 = water2.subtract(1).multiply(-1)


    i = i.log()
  
    var stat1 = i
    
    stat1 = stat1.updateMask(water2.multiply(iAll.select('green').lt(greenMax)))
    
    if(scaleWaterTo === 'percentiles') {
      stat1 = stat1
        .reduceRegion({
          reducer: ee.Reducer.percentile(rangePercentilesWater), 
          geometry: bounds, 
          scale: scale * 3,
          maxPixels: 1e10
        })

      var min1 = [stat1.get(bands[0] + '_p' + rangePercentilesWater[0]), stat1.get(bands[1] + '_p' + rangePercentilesWater[0]), stat1.get(bands[2] + '_p' + rangePercentilesWater[0])]
      var max1 = [stat1.get(bands[0] + '_p' + rangePercentilesWater[1]), stat1.get(bands[1] + '_p'+ rangePercentilesWater[1]), stat1.get(bands[2] + '_p' + rangePercentilesWater[1])]
    }
    
    if(scaleWaterTo === 'sigma') {
      var stat1mean = stat1
        .reduceRegion({
            reducer: ee.Reducer.mean(), 
            geometry: bounds, 
            scale: scale * 3,
            maxPixels: 1e10
          })
        
      var stat1sigma = stat1
        .reduceRegion({
            reducer: ee.Reducer.stdDev(), 
            geometry: bounds, 
            scale: scale * 3,
            maxPixels: 1e10
          })
      var min1 = [
        ee.Number(stat1mean.get(bands[0])).subtract(ee.Number(stat1mean.get(bands[0])).multiply(rangeSigmaWater[0])), 
        ee.Number(stat1mean.get(bands[1])).subtract(ee.Number(stat1mean.get(bands[1])).multiply(rangeSigmaWater[0])), 
        ee.Number(stat1mean.get(bands[2])).subtract(ee.Number(stat1mean.get(bands[2])).multiply(rangeSigmaWater[0])), 
      ]
      var max1 = [
        ee.Number(stat1mean.get(bands[0])).add(ee.Number(stat1mean.get(bands[0])).multiply(rangeSigmaWater[1])), 
        ee.Number(stat1mean.get(bands[1])).add(ee.Number(stat1mean.get(bands[1])).multiply(rangeSigmaWater[1])), 
        ee.Number(stat1mean.get(bands[2])).add(ee.Number(stat1mean.get(bands[2])).multiply(rangeSigmaWater[1])), 
      ]
    }

    min1 = Bathymetry._fixNull(min1, 0)
    max1 = Bathymetry._fixNull(max1, 0.001)
  
    // land
    var stat2 = iAll.updateMask(nonWater2
      .multiply(iAll.select('green').lt(greenMax))
    )
    
    if(scaleLandTo === 'percentiles') {
      stat2 = stat2
        .reduceRegion({
            reducer: ee.Reducer.percentile(rangePercentilesLand),
            geometry: bounds, 
            scale: scale * 3,
            maxPixels: 1e10
          })
      
      var min2 = [stat2.get(bands[0] + '_p' + rangePercentilesLand[0]), stat2.get(bands[1] + '_p' + rangePercentilesLand[0]), stat2.get(bands[2] + '_p' + rangePercentilesLand[0])]
      var max2 = [stat2.get(bands[0] + '_p' + rangePercentilesLand[1]), stat2.get(bands[1] + '_p'+ rangePercentilesLand[1]), stat2.get(bands[2] + '_p' + rangePercentilesLand[1])]
    }
    
    if(scaleLandTo === 'sigma') {
      var stat2mean = stat2
        .reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: bounds, 
            scale: scale * 3,
            maxPixels: 1e10
          })
      var stat2sigma = stat2
        .reduceRegion({
            reducer: ee.Reducer.stdDev(),
            geometry: bounds, 
            scale: scale * 3,
            maxPixels: 1e10
          })

      var min2 = [
        ee.Number(stat2mean.get(bands[0])).subtract(ee.Number(stat2mean.get(bands[0])).multiply(rangeSigmaLand[0])), 
        ee.Number(stat2mean.get(bands[1])).subtract(ee.Number(stat2mean.get(bands[1])).multiply(rangeSigmaLand[0])), 
        ee.Number(stat2mean.get(bands[2])).subtract(ee.Number(stat2mean.get(bands[2])).multiply(rangeSigmaLand[0])), 
      ]
      var max2 = [
        ee.Number(stat2mean.get(bands[0])).add(ee.Number(stat2mean.get(bands[0])).multiply(rangeSigmaLand[1])), 
        ee.Number(stat2mean.get(bands[1])).add(ee.Number(stat2mean.get(bands[1])).multiply(rangeSigmaLand[1])), 
        ee.Number(stat2mean.get(bands[2])).add(ee.Number(stat2mean.get(bands[2])).multiply(rangeSigmaLand[1])), 
      ]
    }

    min2 = Bathymetry._fixNull(min2, 0)
    max2 = Bathymetry._fixNull(max2, 0.001)

    var iWater = Bathymetry._unitScale(i.select(bands), min1, max1)
      .updateMask(water2)
      
    var iLand = Bathymetry._unitScale(iAll.select(bands), min2, max2)
       .updateMask(nonWater2)
    
    i = iWater.blend(iLand)
      .addBands(water)

    i = i.addBands(weight)

    return i
      .set({ label: ee.Date(t).format().cat(', ').cat(mission) })
      .set({ 'system:time_start': t })
  })
  
  this.imagesStep2 = images
  
  // mean = sum(w * x) / sum(w)        
  var image = images.map(function(i) {   
       return i.select(bands.concat('water')).multiply(i.select('weight'))
  }).sum().divide(images.select('weight').sum())
  
  return image
}

Bathymetry._fixNull = function(values, v) {
  return ee.List(values).map(function(o) {
    return ee.Algorithms.If(ee.Algorithms.IsEqual(o, null), v, o)
  })
}

Bathymetry._unitScale = function(image, min, max) {
  min = ee.Image.constant(min)
  max = ee.Image.constant(max)
  
  return image.subtract(min).divide(max.subtract(min))
}


exports.Bathymetry = Bathymetry



