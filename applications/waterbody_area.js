/*
Copyright (c) 2021 Deltares. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.

Author: Gennadii Donchyts
*/

// TODO: add hill masking
// TODO: add snow masking 
// TODO: exclude edges belonging to cloud/water or cloud/land
// TODO: use multiple percentiles (confidence margin)
  
var assets = require('users/gena/packages:assets')
var thresholding = require('users/gena/packages:thresholding')

var hand = ee.Image('users/gena/GlobalHAND/30m/hand-1000').resample('bilinear')


/***
 * Deriving surface water area dynamics from optical images
 */
function computeSurfaceWaterArea(waterbody, start, stop, scale, waterOccurrence, opt_missions, opt_handThreshold) {
  var geom = ee.Feature(waterbody).geometry()
  
  var missions = opt_missions || [
      'L4', 
      'L5', 
      'L7', 
      'L8', 
      'S2'
  ]
  
  var handThreshold = opt_handThreshold || 50
  
  var images = assets.getImages(geom, {
    resample: true,
    filter: ee.Filter.date(start, stop),
    missions: missions,
    scale: scale * 5
  })
  
  // print('Image count: ', images.size())
  
  images = assets.getMostlyCleanImages(images, geom.buffer(300, scale), {
     // cloudFrequencyThresholdDelta: -0.15
     scale: scale * 5
  }) .sort('system:time_start')
  
  // print('Image count (clean): ', images.size())

  var water = images.map(function(i) {
    return computeSurfaceWaterArea_SingleImage(i, waterbody, scale, waterOccurrence, handThreshold)
  })
  
  water = water.filter(ee.Filter.neq('area', 0))

  return water
}

function computeSurfaceWaterArea_SingleImage(i, waterbody, scale, waterOccurrence, handThreshold) {
  var geom = ee.Feature(waterbody).geometry()
  
  var fillPercentile = 50 

  // var ndwiBands = ['green', 'swir']
  var ndwiBands = ['green', 'nir'] 

  var waterMaxImage = ee.Image().float().paint(waterbody.buffer(150), 1)
  
  var maxArea = waterbody.area(scale)

  var t = i.get('system:time_start')
  
  i = i
    .updateMask(waterMaxImage)
    .updateMask(i.select('swir').min(i.select('nir')).gt(0.001))
  
  var ndwi = i.normalizedDifference(ndwiBands)

  // var water = ndwi.gt(0)

  var th = thresholding.computeThresholdUsingOtsu(ndwi, scale, geom, 0.5, 0.7, -0.2)
  var water = ndwi.gt(th)
  
  water = water.updateMask(hand.lt(handThreshold))
  
  var area = ee.Image.pixelArea().mask(water)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geom,
      scale: scale
    }).get('area')

  // fill missing, estimate water probability as the lowest percentile.
  // var waterEdge = ee.Algorithms.CannyEdgeDetector(water, 0.1, 0)
  var waterEdge = ee.Algorithms.CannyEdgeDetector(ndwi, 0.5, 0.7)
  
  waterEdge = waterEdge.updateMask(hand.lt(handThreshold))
  
  // image mask
  var imageMask = ndwi.mask()
  
  // var imageMask = i.select(ndwiBands).reduce(ee.Reducer.allNonZero())
  
  //imageMask = utils.focalMin(imageMask, ee.Number(scale) * 1.5)
  imageMask = imageMask.focal_min(ee.Number(scale).multiply(1.5), 'square', 'meters')
    //.multiply(waterMaxImage)

  // TODO: exclude non-water/missing boundsry
  waterEdge = waterEdge.updateMask(imageMask)

  // clip by clouds
  // var bad = ee.Image(1).float().subtract(i.select('weight'))
  // bad = utils.focalMax(bad, 90).not()
  // waterEdge = waterEdge.updateMask(bad)

  // get water probability around edges
  // P(D|W) = P(D|W) * P(W) / P(D) ~=  P(D|W) * P(W)
  var p = waterOccurrence.mask(waterEdge).reduceRegion({
    //reducer: ee.Reducer.mode(),
    reducer: ee.Reducer.percentile([fillPercentile]),
    geometry: geom,
    scale: scale
  }).values().get(0)
  
    
  p = ee.Algorithms.If(ee.Algorithms.IsEqual(p, null), 101, p)

  var waterFill = waterOccurrence.gt(ee.Image.constant(p))
    .updateMask(water.unmask(0, false).not())
    
  // exclude false-positive, where we're sure in a non-water
  var nonWater = ndwi.lt(-0.15).unmask(0, false)
  waterFill = waterFill.updateMask(nonWater.not())
  
  var fill = ee.Image.pixelArea().mask(waterFill)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geom,
      scale: scale
    }).get('area')
    
  var area_filled = ee.Number(area).add(fill)
  
  var filled_fraction = ee.Number(fill).divide(area_filled)

  return i
    .addBands(waterFill.rename('water_fill'))
    .addBands(waterEdge.rename('water_edge'))
    .addBands(ndwi.rename('ndwi'))
    .addBands(water.rename('water'))
    //.addBands(bad.rename('bad'))
    .set({ 
      p: p, 
      area: area, 
      area_filled: area_filled, 
      filled_fraction: filled_fraction, 
      'system:time_start': t,
      ndwi_threshold: th,
      waterOccurrenceExpected: waterOccurrence.mask(waterEdge)
    })
  
}

function computeSurfaceWaterAreaJRC(waterbody, start, stop, scale) {
  var geom = ee.Feature(waterbody).geometry()
  
  var jrcMonthly = ee.ImageCollection("JRC/GSW1_0/MonthlyHistory")

  var water = jrcMonthly.filterDate(start, stop).map(function(i) {
    var area = ee.Image.pixelArea().mask(i.eq(2)).reduceRegion({
      reducer: ee.Reducer.sum(), 
      geometry: geom, 
      scale: scale
    })

    return i.set({area: area.get('area')})
  })

  return water
}

exports.computeSurfaceWaterArea = computeSurfaceWaterArea

exports.computeSurfaceWaterAreaJRC = computeSurfaceWaterAreaJRC



/***
 * Deriving surface water area dynamics from radar (Sentinel-1) images
 */
function computeSurfaceWaterArea_S1(waterbody, start, stop, scale, waterOccurrence) {
  // (pre)processing
  var band                  = 'VV';
  var smoothing             = 100;
  var connected_pixels      = 200;
  var edge_length           = 100;
  var smooth_edges          = 300;
  var temporalSmoothingDays = 5;
  var frac_cover = 0.5;
  
  var geom = ee.Feature(waterbody).geometry() //bounds = geom
  var S1 = ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(geom)
       .filterDate(start, stop)
       .filter(ee.Filter.listContains('transmitterReceiverPolarisation', band))
       .select(band)
       .sort('system:time_start');
  // daily mosaics, step 1: get unique days
  var all_days    = S1.aggregate_array('system:time_start');
  all_days = all_days.map(function(i) {
    return ee.Date(i).format('YYYY-MM-dd');
  });
  var unique_days = all_days.distinct();

  function ImagesDaily(images, dates){
    var images_daily = unique_days.map(function(day){
      var images_day = images.filterDate(day, ee.Date(day).advance(1, 'day'));
    // create mosaic
      var mosaic_day = images_day.mosaic();
    // calculate fraction coverage over reservoir
      var coverage = images_day.geometry().intersection(geom).area().divide(geom.area());
    // add metadata properties
    mosaic_day = mosaic_day.set(
      'system:time_start', ee.Date(day).millis(),
      'date',day,
      'system:footprint', images_day.geometry().bounds(),
      'fraction_coverage', coverage
    );
      return mosaic_day;
    })
    return images_daily
  }

  // daily mosaic with fraction coverage
  var images_dailyRAW = ImagesDaily(S1, start);
  images_dailyRAW = images_dailyRAW.filter(ee.Filter.gte('fraction_coverage', frac_cover))
  var images_dailyRAW_Img = ee.ImageCollection(images_dailyRAW)


  // temporal smoothing
  var images_dailySMOOTH_Img = images_dailyRAW_Img
    .map(TemporalSmoothing(images_dailyRAW_Img, temporalSmoothingDays))
  //var images_dailySMOOTH = images_dailySMOOTH_Img.toList(images_dailySMOOTH_Img.size())
  
  var water = images_dailySMOOTH_Img.map(function(i) {
    return computeSurfaceWaterArea_SingleImage_S1(i, waterbody, scale, waterOccurrence)
  })
  
  //water = water.filter(ee.Filter.neq('area', 0))

  return water
}
  
function TemporalSmoothing(images, days) {
  return function(image) {
    var t0 = image.date()
    var tStart = t0.advance(-days, 'day')
    var tStop = t0.advance(days, 'day')
  
    return images.filterDate(tStart, tStop).median()
      .copyProperties(image)
      .copyProperties(image, ['system:time_start'])
  }
}

function computeSurfaceWaterArea_SingleImage_S1(i, waterbody, scale, waterOccurrence) {


// threshold for preliminary water
  var initThresh       = -16;

  // set threshold for when there's no data in histogram
  var thresh_no_data   = -20;  // could also just use the maximum allowed threshold here, but this is more conservative/safe

  // maximum allowed threshold
  var maxThresh        = -12; 


// (pre)processing
  var band                  = 'VV';
  var smoothing             = 100;
  var connected_pixels      = 200;
  var edge_length           = 100;
  var smooth_edges          = 300;
  var scale                 = 20
 // var temporalSmoothingDays = 5


  // canny edges
  var canny_threshold  = 1;
  var canny_sigma      = 1;
  var canny_lt         = 0.05;

  // histogram
  var reductionScale   = 90;    // higher value for quicker calculation, should probably be at highest resolution (10) for final product?
  var maxBuckets       = 255;
  var minBucketWidth   = 0.01;  // currently unused (part is commented out)
  var maxRaw           = 1e6;   // currently unused (part is commented out)
//  var scale = 10
  
  function getHist(img, initThresh, canny_threshold, canny_sigma, canny_lt, connected_pixels, edge_length, smooth_edges, maxBuckets, band) {
    // get preliminary water
    var binary = img.lt(initThresh).rename('binary');
    // get canny edges
    var canny = ee.Algorithms.CannyEdgeDetector(binary, canny_threshold, canny_sigma);
    // process canny edges
    var connected  = canny.updateMask(canny).lt(canny_lt).connectedPixelCount(connected_pixels, true);
    var edges      = connected.gte(edge_length);
    edges          = edges.updateMask(edges);
    var edgeBuffer = edges.focal_max(smooth_edges, 'square', 'meters');
    // get histogram for Otsu
    var histogram_image = img.updateMask(edgeBuffer);
    var histogram = ee.Dictionary(histogram_image.reduceRegion({
      // reducer: ee.Reducer.histogram(maxBuckets, 2),
      // reducer: ee.Reducer.histogram(maxBuckets, minBucketWidth, maxRaw),
      reducer: ee.Reducer.histogram(maxBuckets),
      scale: 90, // higher value for quicker calculation, should probably be at highest resolution (10) for final product?
      bestEffort: true,
      maxPixels: 1e12
    }).get(band));
    return histogram;
  }

  function getThreshold(hist, thresh_no_data) {
    // var threshold = otsu(histogram);  // does not work when there's no data in the histogram
    var threshold = ee.Number(ee.Algorithms.If(hist.contains('bucketMeans'), otsu(hist), thresh_no_data));  // works for no data cases
    return threshold;
  }

  function prepS1(img,smoothing,geom) {
    // get nodata mask
    var nodata_mask = ee.Image(img).mask();
    // apply smoothing
    var S1_img = ee.Image(img).focal_median(smoothing, 'circle', 'meters');
    // apply nodata mask
    // S1_img = S1_img.updateMask(nodata_mask).clip(bounds);
    S1_img = S1_img.updateMask(nodata_mask).clip(geom);
    return S1_img;
  }

  function otsu(histogram) {
    // make sure histogram is an ee.Dictionary object
    histogram = ee.Dictionary(histogram);
    // extract relevant values into arrays
    var counts = ee.Array(histogram.get('histogram'));
    var means  = ee.Array(histogram.get('bucketMeans'));
    // calculate single statistics over arrays
    var size  = means.length().get([0]);
    var total = counts.reduce(ee.Reducer.sum(), [0]).get([0]);
    var sum   = means.multiply(counts).reduce(ee.Reducer.sum(), [0]).get([0]);
    var mean  = sum.divide(total);
    // compute between sum of squares, where each mean partitions the data
    var indices = ee.List.sequence(1, size);
    var bss     = indices.map(function(i) {
      var aCounts = counts.slice(0, 0, i);
      var aCount  = aCounts.reduce(ee.Reducer.sum(), [0]).get([0]);
      var aMeans  = means.slice(0, 0, i);
      var aMean   = aMeans.multiply(aCounts)
        .reduce(ee.Reducer.sum(), [0]).get([0])
        .divide(aCount);
      var bCount = total.subtract(aCount);
      var bMean  = sum.subtract(aCount.multiply(aMean)).divide(bCount);
      return aCount.multiply(aMean.subtract(mean).pow(2)).add(
          bCount.multiply(bMean.subtract(mean).pow(2)));
    });
    // return the mean value corresponding to the maximum BSS
    return means.sort(bss).get([-1]);
  }
  
  
  
  
  
  var geom = ee.Feature(waterbody).geometry()
  
  var fillPercentile = 50 // we don't trust our prior

  //var ndwiBands = ['green', 'swir']
  //var ndwiBands = ['green', 'nir'] 

  var waterMaxImage = ee.Image().float().paint(waterbody.buffer(150), 1)
  
  var maxArea = waterbody.area(scale)
  
    // calculate water area  --> THIS WOULD BE LIKE THE SINGLE IMG! READJUST..
  var t = i.get('system:time_start')
  
  var i = i//.select(band)
    .updateMask(waterMaxImage)
    
  // get water map
  function getWater(img) {
    // prep image
    var S1_img = prepS1(img,smoothing,geom);
    // get histogram
    var hist   = getHist(S1_img, initThresh, canny_threshold, canny_sigma, canny_lt, connected_pixels, edge_length, smooth_edges, maxBuckets, band);
    // Otsu thresholding
    var thresh = getThreshold(hist, thresh_no_data);
    thresh     = thresh.min(maxThresh);
    // get water
    var water  = S1_img.lt(thresh);
    water = water
   // return water;
    return water.set('Otsu_threshold',thresh);
  }
  var S1_water = getWater(i);
  var otsuThreshold = S1_water.get('Otsu_threshold')
  // calculate area
  var area = S1_water.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: geom,
    scale: 30
  })
  area = ee.Number(area.values().get(0)); // extract result from dictionary //or get('area') instead
  //area = area.divide(1e6); // convert from m2 to km2
  
  // fill missing, estimate water probability as the lowest percentile.
  var waterEdge = ee.Algorithms.CannyEdgeDetector(S1_water, 0.1, 0) //not sure if this or (binary,1,1)
  // image mask
  var imageMask = S1_water.mask()
  // I am now using only VV
  //imageMask = imageMask.focal_min(ee.Number(scale).multiply(1.5), 'square', 'meters')
  waterEdge = waterEdge.updateMask(imageMask)
  
  // get water probability around edges
  // P(D|W) = P(D|W) * P(W) / P(D) ~=  P(D|W) * P(W)
  var p = waterOccurrence.mask(waterEdge).reduceRegion({
    //reducer: ee.Reducer.mode(),
    reducer: ee.Reducer.percentile([fillPercentile]),
    geometry: geom,
    scale: scale
  }).values().get(0) 
  
  p = ee.Algorithms.If(ee.Algorithms.IsEqual(p, null), 101, p)
  
  var waterFill = waterOccurrence.gt(ee.Image.constant(p))
    .updateMask(S1_water.unmask(0, false).not())
    
  // exclude false-positive, where we're sure in a non-water
  //var nonWater = ndwi.lt(-0.15).unmask(0)
  //waterFill = waterFill.updateMask(nonWater.not())
  
  var fill = ee.Image.pixelArea().mask(waterFill)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geom,
      scale: scale
    }).get('area')
    
  var area_filled = ee.Number(area).add(fill)
  
  var filled_fraction = ee.Number(fill).divide(area_filled)

  return i
    .addBands(waterFill.rename('water_fill'))
    .addBands(waterEdge.rename('water_edge'))
    //.addBands(ndwi.rename('ndwi'))
    .addBands(S1_water.rename('water'))
    //.addBands(bad.rename('bad'))
    .set({ 
      p: p, 
      area: area, 
      area_filled: area_filled, 
      filled_fraction: filled_fraction, 
      otsuThreshold: otsuThreshold,
      'system:time_start': t,
      waterOccurrenceExpected: waterOccurrence.mask(waterEdge)
    })
}


exports.computeSurfaceWaterArea_S1 = computeSurfaceWaterArea_S1

exports.computeSurfaceWaterArea_SingleImage = computeSurfaceWaterArea_SingleImage

exports.computeSurfaceWaterArea_SingleImage_S1 = computeSurfaceWaterArea_SingleImage_S1
