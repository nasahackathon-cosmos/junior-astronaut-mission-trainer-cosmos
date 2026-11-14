
# MOLA Terrain Analysis – Jezero Crater

## 1. Project Overview

This analysis processes NASA Mars Orbiter Laser Altimeter (MOLA) elevation data to generate terrain information for the Junior Astronaut Mission Trainer.

The purpose is to help create realistic Mars exploration challenges involving rover navigation, terrain assessment and landing-zone selection.

## 2. Dataset Information

- Dataset: Mars Orbiter Laser Altimeter (MOLA) elevation data
- Source file: mola128_mola64_merge_90Nto90S_SimpleC_clon0.tif
- Data format: GeoTIFF
- Study region: Jezero Crater, Mars
- Coordinate system: Mars 2000 geographic coordinate system
- Original raster dimensions: 46081 × 23041 pixels

## 3. Regional Data Extraction

A regional elevation raster was extracted from the original MOLA dataset.

Region:
- Longitude: 76.5°E to 78.5°E
- Latitude: 17.5°N to 19.8°N

Extracted raster:
- Dimensions: 257 × 296 pixels
- Format: GeoTIFF

The raster was converted into XYZ and CSV formats and then structured into a JSON elevation grid.

## 4. Elevation Processing

The elevation grid contains:
- 296 latitude rows
- 257 longitude columns
- 76,072 valid elevation points

Elevation statistics:
- Minimum: -3458 m
- Maximum: -542 m
- Mean: -2057.69 m

## 5. Slope Calculation

Slope was calculated using NumPy gradient operations.

The approximate horizontal distances between grid points were calculated using Mars' mean radius of 3,389,500 metres and the geographic coordinate spacing.

Slope values are expressed in degrees.

Results:
- Minimum slope: 0°
- Maximum slope: 28.69°
- Average slope: 3.06°

## 6. Terrain Classification

Terrain was classified using slope thresholds selected for game-design purposes.

| Category | Slope |
| Flat | 0°–5° |
| Moderate | Above 5°–15° |
| Steep | Above 15° |

Classification results:

| Category | Grid points | Percentage |
| Flat | 63,825 | 83.90% |
| Moderate | 11,657 | 15.32% |
| Steep | 590 | 0.78% |

## 7. Visualization

A terrain classification map was generated using Matplotlib.

Output:
docs/visualizations/jezero_terrain_map.png

The visualization displays flat, moderate and steep terrain regions using different colours.

## 8. Applications in the Game

The processed terrain data can support:

- Rover navigation challenges
- Terrain exploration missions
- Landing-zone assessment activities
- Surface difficulty and route-selection challenges
- Educational activities about planetary geography

## 9. Scientific Limitations

- MOLA provides regional elevation information, not detailed small-scale surface imagery.
- The approximately 450 m grid spacing cannot reliably identify small rocks or narrow hazards.
- The slope calculation uses approximate geographic grid spacing.
- Terrain classification thresholds are game-design categories, not official NASA landing-safety standards.
- A flat slope alone does not guarantee a safe landing location.

## 10. Generated Files

- data/raw/mars_trek/mola_roughness.tif: Available MOLA roughness source raster
- data/processed/mars_trek/jezero_terrain.json: Elevation grid
- data/processed/mars_trek/jezero_slope.json: Slope grid
- data/processed/mars_trek/jezero_terrain_classification.json: Terrain categories
- scripts/: Processing and visualization scripts
- docs/visualizations/jezero_terrain_map.png: Terrain map
