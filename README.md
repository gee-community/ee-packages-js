# A set of userful utilities for Google Earth Engine (JavaScript version)

Access scripts in Google Earth Engine Code Editor:

https://code.earthengine.google.com/?accept_repo=users/gena/packages

See some examples of how to use these scripts in the following [slides](https://docs.google.com/presentation/d/103gfl3gS8rokkrcMJV9qMBnkV7oLLbDf8ygDu6QaIZQ).

The library includes the following main scripts:

* animation - animate image collection in Code Editor by adding multiple images as map layers and toggle their opacity
* assets - harmonize access to medium-resolution optical satellite image collections (Landsat 4,5,7,8,9 and Sentinel-2)
* charting - scatter chart, rug plot, colorbar chart as a map layer in code editor
* earth - inset Earth in Code Editor
* gallery - project image colleciton as a filmstrip map layer
* geometry - transect, vector, center point, concave hull
* gl - emulate a subset of fragment shader in Earth Engine (proof-of-concept, 1000x slower than in GPU)
* grid - generate regular grid (vector or raster)
* hydro - access to some of hydologicla layers
* palettes - palettes, see docs here: https://github.com/gee-community/ee-palettes
* promise - (incomplete) emulate JavaScript async Promise
* stat - dnorm, qnorm
* style - north arrow, gradient bar, scale bar, frame with coordinates, map styles (use https://github.com/aazuspan/snazzy instead)
* text - draw text annotations in map layers
* thresholding - Otsu thresholding, threaholding based on Otsu and Canny Edge Detector methods (see my [PhD thesis](https://repository.tudelft.nl/islandora/object/uuid%3A510bd39f-407d-4bb6-958e-dea363c5e2a8) for examples)
* tiler - generate SlippyMap tiles for a given zoom level and bounds
* ui - (prototype, slow) draw area tool, draw transect tool
* utils - stretch image bandwise, isolines, fast focal max/min/weight, hillshadeRGB, Perona-Malik speckle filter, multitemporal speckle filter, skeletonization (image morphology), PCA
