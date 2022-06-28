/*
Copyright (c) 2021 Deltares. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.

Author: Gennadii Donchyts
*/

function qnorm(x) {
  return x.multiply(2).subtract(1).erfInv().multiply(Math.sqrt(2))
}

function aggregateSum(images, aggregationDelta, aggregationUnit) {
  var times = images.reduceColumns(ee.Reducer.minMax(), ['system:time_start'])
  
  var timeStart = ee.Date(times.get('min')).advance(aggregationDelta, aggregationUnit)
  var timeStop = ee.Date(times.get('max'))
  
  return images.map(function(i) {
    var t = i.date()

    var total = images.filterDate(t.advance(-aggregationDelta, aggregationUnit), t).sum()
    
    return total
      .copyProperties(i, ['system:time_start'])
      .set({ count: total.bandNames().size() })
  }).filterDate(timeStart, timeStop)
}

function computeCDF(images) {
  var percentiles = ee.List.sequence(0, 100)
  var cdf = images.reduce(ee.Reducer.percentile(percentiles)).toArray()

  return cdf
}

/***
 * Computes different drought indices such as SPI, SPEI 
 * 
 *  @param {ee.ImageCollection} precipitation An image collection containint precipitation data (a single band)
 *  @param {number} aggregation A number of aggregation steps in aggregationUnits to apply before computing drought indices
 *  @param {string} aggregationUnit A time unit for aggregation, currently supported units are: "day", "month"
 */
function computeSPI(precipitation, aggregation, aggregationUnit, precipitationAll, cdfCache) {
  var precipitationAggregated = aggregateSum(precipitation, aggregation, aggregationUnit)

  var cdf = computeCDF(precipitationAggregated)

  if(precipitationAll) {
    cdf = computeCDF(aggregateSum(precipitationAll, aggregation, aggregationUnit))
  }

  if(cdfCache) {
    cdf = cdfCache
  }

  // fix for max value
  cdf = cdf.arrayCat(ee.Image.constant(10000).toArray(), 0)
  
  return precipitationAggregated.map(function(i) {
    var p = cdf.gte(i).arrayArgmax().arrayFlatten([['SPI']]).int()
    
    return qnorm(p.divide(100).clamp(0.00001, 0.99999))
      .copyProperties(i, ['system:time_start'])
  })
}

exports.aggregateSum = aggregateSum

exports.computeCDF = computeCDF

exports.computeSPI = computeSPI