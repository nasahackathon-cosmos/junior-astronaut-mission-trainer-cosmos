# Junior Astronaut Mission Trainer

A NASA Space Apps Challenge 2026 project designed to introduce children
aged 7–12 to the challenges of human space exploration through interactive
astronaut missions.

## Project goals

- Introduce children to the science of human spaceflight.
- Explore how space environments affect the human body.
- Teach basic astronaut activities and mission operations.
- Use scientific datasets and NASA resources to support educational content.
- Convert scientific concepts into age-appropriate interactive missions.

## Project structure

```text
nasa_hackathon/
├── config/
├── data/
│   ├── raw/
│   │   ├── osdr/
│   │   │   ├── OSD-654/
│   │   │   └── OSD-684/
│   │   ├── radlab/
│   │   └── mars_trek/
│   ├── processed/
│   └── references/
├── docs/
├── scripts/
├── src/
│   ├── backend/
│   ├── frontend/
│   └── shared/
└── tests/
```

## Data sources

| Source | Purpose | Status |
|---|---|---|
| NASA Open Science Data Repository (OSDR) | Spaceflight-related biological research | Initial datasets downloaded |
| NASA RadLab | Space radiation research resources | Pending |
| Mars Trek | Mars surface and exploration reference data | Pending |
| NASA APIs | Access to NASA data and services | API key obtained; endpoints to be selected |

See [Dataset Inventory](docs/dataset_inventory.md) for the downloaded
OSDR files and their scientific context.

## Development status

- [x] Create project workspace
- [x] Download initial OSDR datasets
- [x] Organize OSDR datasets
- [x] Create initial project documentation
- [ ] Collect and validate RadLab resources
- [ ] Collect and validate Mars Trek resources
- [ ] Select required NASA API endpoints
- [ ] Finalize application architecture
- [ ] Implement mission content and application
- [ ] Test scientific accuracy and age appropriateness

## API key security

Store API keys in a local `.env` file. Never commit `.env` or expose
API keys in source code, screenshots, documentation or public repositories.

## Scientific accuracy

Research datasets must be interpreted according to their actual
experimental design, species, sample types and measured variables.
Do not present laboratory measurements as direct measurements of
children or astronauts unless the study supports that interpretation.
