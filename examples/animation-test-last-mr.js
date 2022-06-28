var assets = require('users/gena/packages:assets')
var animation = require('users/gena/packages:animation')

var images = assets.getImages(Map.getCenter(), {
  missions: ['S2', 'L7', 'L8'],
  filter: ee.Filter.date('2020-04-29', '2020-06-01')
})

images = images.sort('system:time_start')
  .map(function(i) {
    return i.set({ label: i.date().format() })
  })

animation.animate(images, { vis: { min: 0.05, max: 0.4 }, label: 'label' })