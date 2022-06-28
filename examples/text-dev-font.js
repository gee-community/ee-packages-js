/*
Copyright (c) 2018 Gennadii Donchyts. All rights reserved.

This work is licensed under the terms of the MIT license.  
For a copy, see <https://opensource.org/licenses/MIT>.
*/

Map.setCenter(0, 0)

var scale = Map.getScale() // best seen at native resolution

function showFont(name) {
  var image = ee.Image("users/gena/fonts/" + name);
  var proj = image.projection()
  image = image.changeProj(proj, proj.scale(scale, -scale))

  Map.addLayer(image, {}, name)
}

showFont('Arial10')
showFont('Arial12')
showFont('Arial14')
showFont('Arial16')
showFont('Arial18')
showFont('Arial24')
showFont('Arial32')
showFont('Arial64')
showFont('Consolas16')
showFont('Consolas18')
showFont('Consolas24')
showFont('Consolas32')
