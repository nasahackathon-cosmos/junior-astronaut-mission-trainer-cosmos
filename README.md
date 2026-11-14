# Junior Astronaut Mission Trainer — COSMOS

An educational mission-training experience designed for children aged 7–12 to explore space science, astronaut health, radiation, and mission decision-making through NASA-backed research data and interactive learning.

## Project Overview

The project connects NASA research datasets with a 100-mission educational catalogue. Its backend provides mission information and evidence references while maintaining a clear distinction between real research measurements, derived summaries, and simulated gameplay.

## NASA Data Sources and Their Uses

### 1. NASA Open Science Data Repository — OSD-654

**Dataset:** [OSD-654 — Bone Health Investigation](https://osdr.nasa.gov/bio/repo/data/studies/OSD-654)

**Mission mapping:** M053 — Bone Health Investigation.

**How we use it:**
- Introduces bone structure and bone-health research.
- Supports educational exploration of trabecular separation, trabecular number, and cortical thickness.
- Helps explain how microgravity research relates to bone health.

**Important:** This study uses mouse bone micro-CT data. It is not a dataset of human astronaut bone measurements or personal medical records.

### 2. NASA Open Science Data Repository — OSD-684

**Dataset:** [OSD-684 — Skeletal Muscle Tissue Chip Study](https://osdr.nasa.gov/bio/repo/data/studies/OSD-684)

**Related study:** GLDS-615.

**Mission mapping:** M054 — Muscle Maintenance.

**How we use it:**
- Provides skeletal muscle tissue-chip research context.
- Includes gene-expression and differential-expression information.
- Supports educational explanations of muscle changes in spaceflight research.

**Important:** Gene-expression measurements are not direct measurements of muscle strength.

### 3. NASA Radiation Laboratory — RadLab

**Dataset portal:** [NASA RadLab Data API and Visualization Portal](https://visualization.osdr.nasa.gov/radlab/gui/data-api/)

**Mission mapping:**
- M032 — Radiation Awareness.
- M035 — Radiation Monitoring.
- M036 — Radiation Shelter Concepts.

**How we use it:**
- Uses selected Artemis I Orion radiation-instrument measurements.
- Explores radiation measurements from HERA HSU1, HERA HSU2, EAD MU01, and M42 SN127.
- Includes selected inner-belt, outer-belt, and lunar-flyby event windows.
- Supports educational charts and comparisons using instrument measurements.

**Research reference:** George et al., *Space radiation measurements during the Artemis I lunar mission*, Nature 634, 48–52 (2024).

[Read the research paper](https://doi.org/10.1038/s41586-024-07927-7)

**Important scientific boundaries:**
- Artemis I was an uncrewed mission. These measurements must not be described as astronaut exposure.
- Absorbed dose rate (μGy/h) and dose equivalent rate (μSv/h) are different quantities.
- Instrument readings must be interpreted with their units, sensor positions, and measurement definitions.
- Simulated shelter outcomes are educational simulations, not measured proof of shielding effectiveness.
- Published research interpretations must remain distinct from our own calculated event-window summaries.

### 4. Canadian Space Agency — Food Production Toolkit

**Official resource:** [CSA Space Food Production Toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/)

**Source document:** *Interplanetary Farming*.

**Mission mapping:**
- M013, M052, M057, M084 — Direct plant-growth and greenhouse educational references.
- M047 — Direct references for water allocation and lunar water challenges.
- M086 — Supporting reference for the water-recycling portion only.
- M016 — Supporting examples of plant-growth systems and experiments.
- M018, M058 — Background references for space-food nutrition.
- M028 — Optional crop-research example.

**How we use it:**
- Provides crop-growth reference information and crop-selection criteria.
- Introduces plant-growth systems used in space research, including the ISS Veggie and Advanced Plant Habitat.
- Explores space-farming methods, nutrition, and water management.
- Describes challenges relevant to lunar agriculture, including water availability, lighting cycles, radiation, temperature, and nutrient-poor regolith.

**Important scientific boundaries:**
- Educational references to plant-growth systems do not establish that a crop has been successfully cultivated on the Moon.
- Naurvik is a terrestrial hydroponics project in Gjoa Haven, not a lunar farm.
- The source material does not establish universal crop yields, water-use rates, nutrient-solution parameters, or water-recovery percentages; these must not be invented.
- Any gameplay values or farming outcomes not directly measured in the cited research are simulations.
- A temperature figure in the source material concerning lunar nighttime conditions requires verification before being used as a factual gameplay value.

### 5. NASA Mars Trek — MOLA and TES Jezero Terrain Datasets

**Data source:** NASA Mars Trek — [Mars Trek Portal](https://trek.nasa.gov/mars/)

**Terrain study area:** Jezero Crater, Mars.

**Data location:** `data/processed/mars_trek/`

**How we use it:**

This project processes NASA Mars Global Surveyor (MGS) MOLA elevation data and Mars Global Surveyor Thermal Emission Spectrometer (TES) environmental map layers to create a structured terrain dataset for the Jezero region.

The processed dataset contains six data categories:

| Dataset | Description | Potential educational/game use |
|---|---|---|
| Elevation | MOLA surface elevation in metres | Explore Martian terrain height and depressions |
| Slope | Derived surface slope in degrees | Estimate terrain steepness |
| Terrain classification | Flat, moderate and steep categories | Identify different terrain difficulty levels |
| Surface roughness | MOLA global roughness RGB map | Explore surface texture at different scales |
| Thermal inertia | TES colourized thermal inertia map | Explore Martian surface thermal properties |
| Dust | TES global dust colourized map | Explore Martian dust distribution |

**Combined dataset:**

[View Jezero Combined Terrain JSON](data/processed/mars_trek/jezero_combined_terrain.json)

The combined dataset contains:
- 296 rows × 257 columns.
- Geographic latitude and longitude coordinates.
- Elevation and derived slope values.
- Terrain classification.
- Surface roughness RGB layers at 0.6 km, 2.4 km and 9.2 km scales.
- TES thermal inertia RGB and alpha channels.
- TES dust RGB channels.

**Individual datasets:**
- [Jezero Elevation JSON](data/processed/mars_trek/jezero_terrain.json)
- [Jezero Slope JSON](data/processed/mars_trek/jezero_slope.json)
- [Terrain Classification JSON](data/processed/mars_trek/jezero_terrain_classification.json)
- [Surface Roughness JSON](data/processed/mars_trek/jezero_roughness.json)
- [Thermal Inertia JSON](data/processed/mars_trek/jezero_thermal_inertia.json)
- [TES Dust JSON](data/processed/mars_trek/jezero_tes_dust.json)

**Processing scripts:**

[View MOLA processing scripts](scripts/)

The scripts support:
- Slope calculation from elevation data.
- Slope-based terrain classification.
- Conversion of roughness, thermal inertia and dust maps into JSON.
- Validation of dimensions and geographic coordinate alignment.
- Combination of the processed layers into one terrain dataset.

**Scientific limitations and data integrity:**
- Roughness, thermal inertia and dust inputs are colourized RGB maps, not calibrated physical measurements in the combined JSON.
- Resampling the global environmental maps to the Jezero elevation grid aligns their dimensions but does not create additional scientific spatial detail.
- Terrain classification thresholds are project-defined categories for educational/game purposes, not official NASA rover safety limits.
- Derived values are kept distinguishable from original NASA source data.
- The original global MOLA elevation source TIFF (`mola128_mola64_merge_90Nto90S_SimpleC_clon0.tif`, 46081 × 23041 pixels) is not included in this repository. The regional Jezero elevation and derived terrain products are included under `data/processed/mars_trek/`.

## Mission Evidence Mapping

| Mission | Evidence source | Use |
|---|---|---|
| M032 | NASA RadLab | Direct Artemis I radiation evidence |
| M035 | NASA RadLab | Radiation measurement and comparison |
| M036 | NASA RadLab | Radiation evidence supporting simulated shelter concepts |
| M053 | OSD-654 | Bone-health research |
| M054 | OSD-684 / GLDS-615 | Skeletal muscle research |

The mission catalogue contains 100 missions. This does not mean every mission currently has a mapped research dataset.

## Current Implementation

- [x] 100-mission catalogue.
- [x] NASA OSDR mission evidence integration.
- [x] NASA RadLab event-data processing and mission crosswalk.
- [x] CSA food-production reference datasets and mission crosswalk.
- [x] Backend mission and evidence APIs.
- [x] Evidence-source validation.
- [x] Backend API and mission-data tests.
- [x] NASA Mars Trek Jezero terrain dataset processing.
- [x] MOLA elevation, slope and terrain classification.
- [x] MOLA surface roughness processing.
- [x] TES thermal inertia and dust map processing.
- [x] Combined Jezero terrain and environmental JSON dataset.
- [x] NASA CCMC DONKI space-weather event API integration (FLR, CME, GST, SEP).
- [ ] Integration of terrain datasets into interactive gameplay.
- [ ] Additional NASA data-source integrations.
- [ ] Frontend and interactive gameplay implementation.

## NASA CCMC DONKI Space Weather Integration

The backend integrates NASA's Community Coordinated Modeling Center (CCMC)
DONKI API for near-real-time solar and geomagnetic event information.

Supported event categories:

| Code | Event category |
|---|---|
| `FLR` | Solar flares |
| `CME` | Coronal mass ejections |
| `GST` | Geomagnetic storms |
| `SEP` | Solar energetic particle events |

### Endpoint

`GET /api/donki/events`

| Parameter | Default | Description |
|---|---|---|
| `event_type` | `FLR` | Event category: FLR, CME, GST, or SEP |
| `start_date` | Six days before today | Inclusive start date |
| `end_date` | Today | Inclusive end date |
| `limit` | `100` | Maximum returned events (1–100) |

Dates use `YYYY-MM-DD`. The API validates date order, rejects future end
dates, and enforces the configured maximum date-range difference.

Example:

`GET /api/donki/events?event_type=FLR&start_date=2026-11-08&end_date=2026-11-14&limit=10`

### Configuration

Optional environment variables:

- `DONKI_API_BASE_URL`
- `DONKI_TIMEOUT_SECONDS`
- `DONKI_MAX_DATE_RANGE_DAYS`
- `DONKI_MAX_RESULTS`
- `DONKI_MAX_RESPONSE_BYTES`

Upstream errors are handled without exposing internal exception details.

**Data-use limitation:** DONKI provides near-real-time space-weather
information for research and prototyping. It is not an operational forecast
or a spacecraft safety determination.

## Backend

The backend is built with Python and FastAPI.

Run locally:

```bash
python -m pip install -r requirements.txt
uvicorn src.backend.main:app --reload
```

API documentation is available at `/docs` when the server is running.

## Repository Structure

```text
.
├── data/
│   ├── raw/                 # Original research data; excluded from Git
│   │   ├── osdr/
│   │   └── mars_trek/
│   └── processed/
│       ├── missions/
│       ├── osdr/
│       ├── radlab/
│       ├── food_production/
│       └── mars_trek/
├── docs/
│   └── visualizations/
├── scripts/                 # Existing project and Mars Trek scripts
├── src/
│   └── backend/
└── tests/
```

## Data Integrity and Safety

- Original research measurements are kept distinct from derived summaries.
- Missing measurements are not treated as zero.
- Simulated game values are not presented as real NASA measurements.
- Large original datasets may be retained locally rather than committed to Git.
- Dataset attribution and source references are maintained in project documentation.
- Colourized map values are not treated as calibrated scientific measurements without supporting metadata.

## Documentation

- [Dataset Inventory](docs/dataset_inventory.md)
- [Mission Dataset Mapping](docs/mission_dataset_mapping.md)
- [RadLab Data Notes](docs/radlab_data_notes.md)
- [MOLA Terrain Methodology](docs/mola_methodology.md)

## Disclaimer

This project is an educational prototype. It is not a medical tool, operational spacecraft system, or substitute for NASA scientific publications. Research data is used for educational interpretation, while gameplay scenarios and outcomes are simulated.
