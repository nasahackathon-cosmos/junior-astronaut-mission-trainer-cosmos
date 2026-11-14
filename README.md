
# Junior Astronaut Mission Trainer — COSMOS

An educational mission-training experience designed to help children aged 7–12 explore space science, astronaut health, radiation, and mission decision-making through NASA-backed research data and interactive learning.

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


### 4. NASA Mars Trek — MOLA and TES Jezero Terrain Datasets

**Source portal:** [NASA Mars Trek](https://trek.nasa.gov/mars/)

**Study area:** Jezero Crater, Mars.

**Dataset module:** [MOLA Terrain Module](https://github.com/nasahackathon-cosmos/junior-astronaut-mission-trainer-cosmos/tree/main/mola_terrain_module)

**How we use it:**

- Processes MOLA elevation data for the Jezero Crater region.
- Derives terrain slope and project-defined terrain classifications.
- Includes surface roughness, thermal inertia, and TES dust map layers.
- Provides a combined JSON dataset for educational terrain exploration.
- Supports future rover navigation, terrain difficulty, and mission decision-making scenarios.

**Processed dataset details:**

- Grid dimensions: 296 × 257.
- Total grid points: 76,072.
- Elevation, slope, and terrain classification.
- Roughness map layers at 0.6 km, 2.4 km, and 9.2 km scales.
- Thermal inertia RGB and alpha channels.
- TES dust RGB channels.

**Dataset files:**
- [Combined Jezero terrain JSON](mola_terrain_module/data/processed/jezero_combined_terrain.json)
- [Elevation](mola_terrain_module/data/processed/jezero_terrain.json)
- [Slope](mola_terrain_module/data/processed/jezero_slope.json)
- [Terrain classification](mola_terrain_module/data/processed/jezero_terrain_classification.json)
- [Surface roughness](mola_terrain_module/data/processed/jezero_roughness.json)
- [Thermal inertia](mola_terrain_module/data/processed/jezero_thermal_inertia.json)
- [TES dust](mola_terrain_module/data/processed/jezero_tes_dust.json)

**Processing resources:**
- [Python processing scripts](mola_terrain_module/scripts/)
- [MOLA methodology](mola_terrain_module/docs/mola_methodology.md)
- [Jezero terrain visualization](mola_terrain_module/visualizations/jezero_terrain_map.png)

**Important scientific boundaries:**

- The roughness, thermal inertia, and dust RGB layers are colorized map values, not calibrated physical measurements.
- Resampling map layers to matching grid dimensions does not create additional spatial resolution.
- Terrain classification thresholds are project-defined educational categories, not official NASA rover safety standards.
- The original approximately 2.12 GB global MOLA TIFF is not included in this public repository.
- The TIFF conversion scripts require their corresponding source rasters, which are not bundled. The processed JSON outputs are included.

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
- [x] Backend mission and evidence APIs.
- [x] Evidence-source validation.
- [x] Backend API and mission-data tests.
- [x] NASA Mars Trek Jezero terrain dataset processing (MOLA and TES layers).
- [ ] Additional NASA data-source integrations.
- [ ] Frontend and interactive gameplay implementation.

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
│   ├── processed/
│   │   ├── missions/
│   │   └── radlab/
│   └── raw/                 # Excluded from version control
├── docs/
├── scripts/
├── src/
│   └── backend/
├── mola_terrain_module/
│   ├── data/processed/
│   ├── docs/
│   ├── scripts/
│   └── visualizations/
└── tests/
```

## Data Integrity and Safety

- Original research measurements are kept distinct from derived summaries.
- Missing measurements are not treated as zero.
- Simulated game values are not presented as real NASA measurements.
- Raw datasets and credentials are excluded from the public release.
- Dataset attribution and source references are maintained in project documentation.

## Documentation

- [Dataset Inventory](docs/dataset_inventory.md)
- [Mission Dataset Mapping](docs/mission_dataset_mapping.md)
- [RadLab Data Notes](docs/radlab_data_notes.md)
- [MOLA Terrain Methodology](mola_terrain_module/docs/mola_methodology.md)

## Disclaimer

This project is an educational prototype. It is not a medical tool, operational spacecraft system, or substitute for NASA scientific publications. Research data is used for educational interpretation, while gameplay scenarios and outcomes are simulated.
