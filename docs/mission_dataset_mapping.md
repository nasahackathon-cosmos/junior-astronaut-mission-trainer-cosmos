# NASA OSDR Dataset-to-Mission Mapping

**Project:** Junior Astronaut Mission Trainer
**Purpose:** Connect the downloaded NASA Open Science Data Repository (OSDR) datasets to the 100-mission game pool without overstating what the research measures.

## 1. Mapping summary

Two OSDR studies have been downloaded, validated and preprocessed.

| Mission ID | Mission title | Dataset | Relationship |
|---|---|---|---|
| M053 | Bone health investigation | OSD-654 | Primary — directly relevant bone microstructure measurements |
| M054 | Muscle maintenance mission | OSD-684 / GLDS-615 | Primary — directly relevant skeletal-muscle tissue gene-expression research |
| M016 | Biology and technology experiment lab | Both | Supporting research examples |
| M018 | Astronaut health and exercise check | Both | Background research context only |
| M028 | Team science: conduct a joint experiment | Both | Supporting examples for comparing research datasets |
| M055 | Space Biology: Spot the Difference | OSD-684; optionally OSD-654 | Supporting — compare research groups and observations |
| M058 | Healthy astronaut routine | OSD-684 | Background context only; not a source of exercise prescriptions |
| M010 | Post-landing spacecraft and crew check | Both | Optional background references, not a crew health assessment |
| M030 | Final mission report and return/hand-over | Both | Cite findings from missions that actually used these datasets |

The two primary mappings are M053 and M054. The other entries are secondary educational uses, not additional direct measurements of the mission's gameplay variables.

## 2. Dataset A — OSD-654: Bone microstructure

**Study:** OSD-654
**Study page:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-654
**Processed file:**

`data/processed/osdr/OSD-654/OSD-654_microCT_with_metadata.csv`

**Local raw measurement input (excluded from this public release):**

`data/raw/osdr/OSD-654/LSDS-66_microCT_uCT_TRANSFORMED.csv`

### What it contains

The transformed micro-CT dataset contains 25 samples and 10 columns, including:

- Sample Name
- Trabecular separation (millimetres)
- Trabecular number (per millimetre)
- Degree of anisotropy
- Connective density (unit not confirmed)
- Total perimeter (millimetres)
- Endocortical perimeter (millimetres)
- Medullary area (square millimetres)
- Eccentricity
- Cortical thickness (millimetres)

The accompanying metadata identifies the animals as male C57BL/6J mice. The transformed measurements represent five SpaceX-12 study groups: Space Flight, Ground Control, Vivarium Control, and two cohort-control groups.

### Important data limitations

- There are 25 measurement samples in the transformed CSV.
- Ten hindlimb-unloading ground-study samples appear in the metadata but do not have rows in this transformed measurement table. They must not be invented or added as if measured.
- Sample `F18` is present but all nine measurement fields are blank. The processed file preserves this missingness and marks the sample as incomplete.
- The dataset contains mouse bone microstructure measurements, not measurements of a child's bones or an astronaut's personal bone density.
- Do not convert these measurements into a diagnosis, fracture risk, bone-health score or direct prediction of human astronaut health.
- Do not assign a unit to `connective_density` until the study documentation confirms it.

### Mission use

**M053 — Bone health investigation (primary)**

Player activity:
1. Introduce the idea that bones have an internal structure.
2. Show selected bone microstructure measurements from the research dataset.
3. Let players compare available study groups using clearly labelled charts.
4. Ask players to identify which measurements differ between groups.
5. Explain that researchers study bone structure to understand how conditions such as altered loading can affect bone.

Scientific correction:
The dataset is from mice, not human astronauts. It is research evidence about bone microstructure; it does not tell the player their own bone health or establish a universal human effect.

**M016 — Biology and technology experiment lab (supporting)**

Use micro-CT as an example of technology researchers use to examine internal bone structure. Explain that the measurements are observations from a research instrument.

**M018 — Astronaut health and exercise check (background only)**

Use the study to introduce why researchers investigate bone changes in spaceflight-related research. Do not use its mouse measurements as an astronaut medical check or as a human exercise prescription.

**M028 — Team science: conduct a joint experiment (supporting)**

Players can work together to inspect the sample groups, discuss missing measurements and explain why incomplete data should not be silently filled in.

**M055 — Space Biology: Spot the Difference (optional supporting use)**

Players can compare selected measurement distributions or group summaries. Clearly show sample counts and missing values; do not imply that every group has the same number of valid observations.

## 3. Dataset B — OSD-684 / GLDS-615: Skeletal-muscle tissue-chip RNA sequencing

**Study:** OSD-684
**Dataset identifier:** GLDS-615
**Study page:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-684

**Processed files:**

- `data/processed/osdr/OSD-684/OSD-684_normalized_counts.csv`
- `data/processed/osdr/OSD-684/OSD-684_differential_expression.csv`
- `data/processed/osdr/OSD-684/OSD-684_sample_metadata.csv`
- `data/processed/osdr/OSD-684/OSD-684_contrasts.csv`

### What it contains

The study investigates human skeletal-muscle tissue chips under spaceflight and ground-control conditions.

The sample table contains 12 samples arranged in four groups, with three samples per group:

- Age 21–40, Ground Control
- Age 65–80, Ground Control
- Age 21–40, Space Flight
- Age 65–80, Space Flight

The study's tissue is human Vastus Lateralis skeletal-muscle tissue/cells. The samples are male-derived. This is a tissue-chip research experiment, not a direct test of astronauts' muscle strength.

The files contain:

- Gene identifiers and gene annotations.
- Normalized gene-expression values for 12 samples.
- Differential-expression statistics, including log2 fold changes, test statistics, raw p-values and adjusted p-values.
- Group means and standard deviations.
- Contrast definitions describing the comparisons between groups.

The assay metadata also documents sequencing and quality-control information, including the sequencing platform, library preparation, read length and read depth. These are technical properties of the experiment, not measures of muscle performance.

### Important data limitations

- Gene expression is not the same thing as muscle strength, muscle mass, endurance or physical fitness.
- Do not convert normalized counts or log2 fold changes into a muscle-strength score.
- Do not claim that the study directly measured astronauts' muscles in orbit.
- The study has three samples per age-and-condition group; this is a small research dataset.
- Preserve `NA` values as missing. Never replace missing p-values or adjusted p-values with zero.
- Statistical significance must be interpreted using the study's methods and adjusted p-values, not by looking at a fold change alone.
- Age groups in this study are research-group labels, not recommendations or predictions for individual people.

### Mission use

**M054 — Muscle maintenance mission (primary)**

Player activity:
1. Introduce skeletal muscle and explain that scientists can study biological activity at the gene-expression level.
2. Present a small, curated set of gene-expression or differential-expression observations.
3. Let players compare the study's spaceflight and ground-control groups.
4. Ask players what researchers might investigate further.
5. Explain that this experiment can help researchers study biological responses, but it does not directly measure how strong a muscle is.

Scientific correction:
The dataset is human skeletal-muscle tissue-chip RNA-sequencing research. It is not a direct measurement of astronaut strength, muscle loss or exercise performance.

**M016 — Biology and technology experiment lab (supporting)**

Use the study to explain how scientists use RNA sequencing to investigate biological changes. Introduce the distinction between a biological sample, a gene-expression measurement and a research conclusion.

**M018 — Astronaut health and exercise check (background only)**

Use it to explain why muscle biology is an area of interest in space research. Do not generate a medical assessment, fitness score or exercise prescription from the data.

**M028 — Team science: conduct a joint experiment (supporting)**

Assign teams to inspect the sample groups, compare selected gene-expression results and explain the difference between an observation and a conclusion.

**M055 — Space Biology: Spot the Difference (supporting)**

This is a suitable dataset for a guided comparison activity. Players can compare selected gene-expression observations across the four study groups. Explain that the values are research measurements and that statistical interpretation requires care.

**M058 — Healthy astronaut routine (background only)**

Use the study as a reason to discuss why researchers investigate muscle biology during spaceflight. Any in-game exercise routine must be a clearly labelled educational/game activity, not a prescription derived from this dataset.

## 4. Missions these datasets do not directly support

Do not map these two datasets as direct evidence for the following missions:

| Mission IDs | Mission topics | Why these datasets are not suitable |
|---|---|---|
| M013, M052, M057, M084 | Plant growth and greenhouse planning | Neither downloaded study is a plant-growth experiment |
| M056 | Immune-system research briefing | Neither downloaded study directly investigates immune-system outcomes |
| M047, M048, M050, M051, M086 | Water, power, night survival, waste and recycling | These are not life-support resource datasets |
| M032, M035, M036 | Radiation and shelter planning | OSDR studies do not provide radiation-dose data; NASA RadLab now provides selected Artemis I evidence for these missions |
| M038–M044, M049, M070, M072, M077 | Landing sites, terrain, sunlight and rover operations | These are not planetary terrain or environmental datasets |
| M053 as a human medical assessment | Personal bone-health diagnosis | OSD-654 contains mouse research measurements, not personal human medical data |
| M054 as a muscle-strength test | Personal or astronaut strength measurement | OSD-684 contains tissue-chip gene-expression data, not strength measurements |

These missions may still use other NASA/CSA resources or explicitly labelled game simulations. The absence of a match here does not mean a mission cannot be implemented.

## 5. Real data, derived information and game simulation

Every data-driven mission should distinguish these three categories.

### A. Real archived research data

Examples:
- OSD-654 mouse bone microstructure observations.
- OSD-684 human skeletal-muscle tissue-chip gene-expression observations.
- Study sample identifiers and documented experimental groups.

Show the study accession, source link, variable name, unit where confirmed and sample count.

### B. Derived educational information

Examples:
- Group averages calculated from available measurements.
- Charts comparing documented study groups.
- Plain-language explanations of gene-expression differences.
- Carefully described observations based on the source data.

Label calculated summaries as derived from the archived dataset. Show how missing values and sample counts were handled.

### C. Simulated game state

Examples:
- Player oxygen, water and food inventory.
- Battery charge and power consumption.
- Habitat damage, leaks, faults and repairs.
- Player health or stamina bars.
- Mission rewards, penalties, scores and outcomes.
- Fictional astronaut symptoms or emergency events.

These are game mechanics unless supported by a separate, appropriate engineering or scientific source. Do not present them as measurements from OSD-654 or OSD-684.

## 6. Recommended implementation rules

1. Keep the raw OSDR files unchanged.
2. Use the processed files for application development.
3. Keep each source study's accession and URL with the data displayed in the game.
4. Retain units exactly as documented; do not guess missing units.
5. Show sample counts and missing-data warnings when presenting comparisons.
6. Never turn gene-expression values into muscle-strength values.
7. Never turn mouse bone measurements into human medical predictions.
8. Use a small, curated set of fields for the child-facing interface; keep technical details available in an optional research-information panel.
9. Label all simulated player resources and fictional mission events as game simulation.
10. If a dataset is unavailable, show an explanatory fallback rather than inventing scientific observations.

## 7. Local validation and preprocessing records

The following project artifacts document the data preparation:

- Validation script: `scripts/validate_osdr.py`
- Validation report: `docs/reports/osdr_validation.txt`
- Preprocessing script: `scripts/process_osdr.py`
- Preprocessing report: `docs/reports/osdr_processing_report.json`
- Automated tests: `tests/test_osdr_processing.py`

The existing automated test suite checks dataset dimensions, sample alignment, missing-value preservation, source hashes and the handling of incomplete OSD-654 sample `F18`.

## 8. Source references

- NASA OSDR repository: https://osdr.nasa.gov/bio/repo/
- OSD-654 study: https://osdr.nasa.gov/bio/repo/data/studies/OSD-654
- OSD-684 study: https://osdr.nasa.gov/bio/repo/data/studies/OSD-684
- NASA RadLab: https://visualization.osdr.nasa.gov/radlab/gui/data-api/

**Mapping status:** The two primary OSDR mappings are identified. Secondary mission uses are contextual and must retain the limitations described above. This document does not claim that all 100 missions have been mapped to OSDR.


## 9. NASA RadLab — Artemis I Radiation Evidence

**Source:** [NASA RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/)

**Research reference:** George et al., *Space radiation measurements during the Artemis I lunar mission*, Nature 634, 48–52 (2024).
https://doi.org/10.1038/s41586-024-07927-7

### Selected instrument datasets

- HERA HSU1
- HERA HSU2
- EAD MU01
- M42 SN127

### Mission crosswalk

| Mission | Evidence relationship | Educational application |
|---|---|---|
| M032 | Primary direct evidence | Introduce radiation measurements from Artemis I |
| M035 | Primary direct evidence | Explore instrument readings and event-window comparisons |
| M036 | Supporting evidence | Use radiation research as context for simulated shelter scenarios |

### Event coverage

1. Inner radiation-belt passage: selected instrument peak summaries.
2. Outer radiation-belt passage: time-series measurements from four instruments.
3. Lunar flybys: instrument measurements around the two Artemis I lunar closest approaches.

### Scientific interpretation boundaries

- Artemis I was uncrewed; its measurements are not astronaut exposure measurements.
- Absorbed dose rate and dose equivalent rate are different quantities.
- Instrument comparisons must preserve units, sensor identity, and measurement context.
- Lunar-flyby event-window percentage changes are derived summaries, not proof of a causal shielding effect.
- The published research interpretation of reduced galactic cosmic-ray exposure during lunar flybys must not be confused with our calculated event-window averages.
- M036 shelter effectiveness and protection outcomes remain simulated.

### Missions not supported by these selected RadLab events

- M033: Solar flare monitoring.
- M034: Solar energetic particle event monitoring.
- M037 and other live-event missions: Current or live solar-event monitoring.

Historical Artemis I measurements must not be presented as live telemetry or as a substitute for dedicated solar-event data sources.

## 10. Dataset C — CSA Food Production Toolkit

**Source organization:** Canadian Space Agency

**Main reference:**
https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/

**Local raw source input (excluded from this public release):**
`data/raw/food_production/interplanetary-farming.pdf`

**Processed directory:**
`data/processed/food_production/`

The collection contains seven JSON files and 38 structured reference records covering crop selection, plant-growth systems, lunar agriculture, water management, farming methods and astronaut nutrition.

### Mission mapping

| Mission IDs | Mission topic | CSA reference | Relationship |
|---|---|---|---|
| M013, M052, M057, M084 | Plant growth and greenhouse planning | Crop reference, crop selection criteria, ISS plant-growth systems, space-farming methods | Direct educational reference |
| M047 | Water allocation challenge | Water management, lunar agriculture challenges | Direct educational reference for water-recovery concepts and crop-water trade-offs |
| M086 | Close the loop: recycling challenge | Water management | Supporting reference for the water-recycling portion only |
| M016 | Biology and technology experiment lab | ISS plant-growth systems, crop selection criteria | Supporting examples of documented plant-growth systems and experimental conditions |
| M018 | Astronaut health and exercise check | Space-food nutrition | Background context for astronaut nutrition and wellbeing |
| M058 | Healthy astronaut routine | Space-food nutrition | Supporting context for food requirements and dietary variety |
| M028 | Team science: conduct a joint experiment | Crop reference, crop selection criteria, lunar agriculture challenges | Optional example for a team crop-research activity; not a core mapping |

These mappings identify possible educational uses. They do not imply that every mission must use all seven files.

### Suggested player activities

**Plant growth and greenhouse planning — M013, M052, M057, M084**

1. Let players compare potential crops using reported growth durations and nutritional information.
2. Ask players to select crops using criteria such as edible biomass, nutritional value, growth time and crew preferences.
3. Introduce the ISS Veggie and Advanced Plant Habitat as examples of plant-growth research systems.
4. Ask players to identify environmental requirements for a controlled growing environment.
5. Explain the challenges of growing plants on the Moon.

**Water and resource management — M047 and M086**

1. Introduce the ISS water-recovery concept and its documented water sources.
2. Let players identify where water collection, filtration and recycling fit into a resource-management system.
3. Discuss lunar water availability and the challenges of supplying water for agriculture.
4. Use simulated water inventories and resource constraints only as clearly labelled game mechanics.

For M086, use CSA material only to explain water recovery and recycling. General waste sorting, waste-processing methods and recycling efficiencies require separate sources or clearly labelled simulation rules.

**Astronaut nutrition — M018 and M058**

1. Introduce the importance of balanced and varied astronaut meals.
2. Compare crop nutrients and food-selection criteria.
3. Explain food preservation and preparation methods.
4. Discuss how food variety and quality contribute to crew wellbeing.

**Biology and technology experiment lab — M016**

Use the ISS Veggie and Advanced Plant Habitat as documented examples when discussing controlled plant-growth experiments. Any classroom experiment or player-controlled outcome remains an educational simulation.

**Optional use — M028**

The crop reference and selection criteria may provide an example for a collaborative crop-research question. The mission's primary scientific content should still come from the relevant OSDR or planetary-science records.

### Important scientific limitations

- CSA educational references are not direct measurements of crop performance in lunar or Martian environments.
- The crop growth durations are reference values, not guaranteed mission outcomes.
- The water-recovery material does not establish a numerical recovery rate in the collected reference.
- Hydroponics and controlled-environment agriculture examples should not be described as proof of a fully operational lunar farm.
- Do not infer crop yields, water consumption, energy consumption or nutritional sufficiency without supporting data.
- Keep all game resource values, crop yields, equipment failures and mission outcomes labelled as simulations unless independently supported by measurements.

### Data classification

| Information | Classification |
|---|---|
| CSA crop growth durations and reported nutrients | Source-reported reference information |
| ISS plant-growth systems | Documented space research systems |
| Naurvik hydroponic project | Documented terrestrial application |
| Lunar agriculture challenges | Source-based educational reference |
| Calculated crop rankings or mission recommendations | Derived educational information |
| Player crop yields, water inventory and greenhouse performance | Simulated game state |

CSA Food Production Toolkit records are cross-mission educational references. They must remain distinct from the archived OSDR experimental datasets and NASA RadLab radiation measurements.
