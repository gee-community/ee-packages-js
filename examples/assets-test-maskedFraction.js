/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var bounds = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[3.5209835666738627, 51.82801113688724],
          [3.5209835666738627, 51.13873267953637],
          [4.918993820580113, 51.13873267953637],
          [4.918993820580113, 51.82801113688724]]], null, false);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var assets = require('users/gena/packages:assets')

var images = assets.getImages(bounds, {
  filter: ee.Filter.date('2017-01-01', '2018-01-01'),
  filterMasked: true,
  filterMaskedFraction: 0.85,
  scale: Map.getScale() * 10
})


print(images.size())