
# NASA RadLab — Artemis I Data Processing Notes

## 1. Source and scope

Source: [NASA RadLab Data API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/)

Research reference:

George et al., *Space radiation measurements during the Artemis I lunar mission*, Nature 634, 48–52 (2024).

https://doi.org/10.1038/s41586-024-07927-7

The project processes selected historical measurements from the uncrewed Artemis I mission.

Selected instruments:

- HERA HSU1
- HERA HSU2
- EAD MU01
- M42 SN127

## 2. Processed event datasets

| File | Description |
|---|---|
| `artemis_i_inner_belt_event_v1.json` | Selected inner-belt instrument peak summaries |
| `artemis_i_outer_belt_event_v1.json` | Outer-belt time-series measurements |
| `artemis_i_lunar_flybys_v1.json` | Measurements around two lunar flybys |

### Inner-belt event

The four instrument peak values are:

| Instrument | Peak absorbed dose rate |
|---|---:|
| HERA HSU1 | 8012.58 μGy/h |
| HERA HSU2 | 17250.66 μGy/h |
| EAD MU01 | 14393.34 μGy/h |
| M42 SN127 | 4122.378 μGy/h |

These are instrument-specific readings and must not be treated as interchangeable measurements.

### Outer-belt event

Selected event window: 16 November 2022, 08:45–10:45 UTC.

| Instrument | Readings | Mean absorbed dose rate (μGy/h) | Peak time UTC |
|---|---:|---:|---|
| HERA HSU1 | 121 | 36.7298 | 09:21 |
| HERA HSU2 | 121 | 60.7423 | 09:18 |
| EAD MU01 | 25 | 45.6549 | 09:20 |
| M42 SN127 | 25 | 34.3950 | 09:20 |

HERA measurements have approximately one-minute cadence; EAD and M42 measurements have approximately five-minute cadence in this window.

## 3. Lunar-flyby analysis

Closest approaches:

- 21 November 2022: 12:57 UTC, approximately 130 km.
- 5 December 2022: 16:43 UTC, approximately 128 km.

The project compares a near-flyby two-hour window with the average of two surrounding two-hour windows.

| Instrument | 21 Nov change | 5 Dec change |
|---|---:|---:|
| HERA HSU1 | -8.82% | -7.47% |
| HERA HSU2 | -12.61% | -6.16% |
| EAD MU01 | +1.85% | -4.27% |
| M42 SN127 | -11.24% | -7.98% |

These are project-derived comparisons of selected event windows. They do not independently prove that the Moon caused the observed changes.

The Nature paper discusses the Moon blocking part of incoming galactic cosmic radiation during lunar flybys, with a reduction of approximately one-third in the relevant research analysis. That published result is distinct from the project's event-window percentage calculations.

## 4. Data integrity and provenance

The mission crosswalk is:

`data/processed/missions/radlab_mission_crosswalk_v1.json`

It references three processed event files and records source metadata and checksums.

Expected SHA-256 values:

| File | SHA-256 |
|---|---|
| `artemis_i_inner_belt_event_v1.json` | `aba99bafe98f68f7f9329019178be8f4fb3e6acec96a84175cc50aa691d52a97` |
| `artemis_i_outer_belt_event_v1.json` | `0160afca2871ea8a1392bd73737506e7ea3baf214fff1613b48ee3158d8145e6` |
| `artemis_i_lunar_flybys_v1.json` | `069de4944ed7b2afe1b2f7d39a45277d80588100886570c6af8c9d694dfba5` |

The crosswalk also records the mission catalogue checksum to detect catalogue mismatch.

## 5. Mission mapping

- M032: Primary direct Artemis I radiation evidence.
- M035: Primary direct evidence for radiation monitoring and instrument comparisons.
- M036: Supporting research context for simulated radiation shelter scenarios.

The crosswalk does not imply that every mission in the 100-mission catalogue has a research dataset.

## 6. Scientific limitations

1. Artemis I was uncrewed. The readings are spacecraft instrument measurements, not astronaut exposure data.
2. Absorbed dose rate (μGy/h) is not dose equivalent rate (μSv/h).
3. No conversion between these quantities should be inferred without a justified radiation-quality model.
4. Instrument readings must retain their sensor identity, units, timestamp, and measurement context.
5. Missing values must remain missing and must never be replaced with zero.
6. Historical Artemis I readings are not live radiation telemetry.
7. These measurements do not prove the effectiveness of any shelter material.
8. M036 shelter protection outcomes are simulated gameplay values.
9. Lunar-flyby event-window comparisons and published galactic cosmic-ray interpretations are separate analyses.

## 7. Educational use

For children aged 7–12, the data can support:

- Understanding that radiation varies across space environments.
- Exploring how instruments record measurements.
- Comparing selected historical events.
- Learning why scientific units and measurement context matter.
- Understanding that game simulations are not real spacecraft predictions.
