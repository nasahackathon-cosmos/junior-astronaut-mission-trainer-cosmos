# Scientific Dataset Inventory

Project: Junior Astronaut Mission Trainer
Age group: 7–12
Data source: NASA Open Science Data Repository (OSDR)

## 1. OSD-654 — Bone microstructure

Study page:
https://osdr.nasa.gov/bio/repo/data/studies/OSD-654

Local directory:
`data/raw/osdr/OSD-654/`

| File | Contents |
|---|---|
| LSDS-66_microCT_uCT_TRANSFORMED.csv | 25 records containing bone micro-CT measurements |
| OSD-654_metadata_OSD-654-ISA.zip | Study and measurement metadata |

### Measurement fields

- Trabecular separation
- Trabecular number
- Degree of anisotropy
- Connective density
- Total perimeter
- Endocortical perimeter
- Medullary area
- Eccentricity
- Cortical thickness

### Scientific interpretation

The transformed CSV contains mouse tibia/bone micro-CT measurements.
It can support educational material about bone structure and the effects
of spaceflight-related conditions on bone.

It is not a direct measurement of human astronaut bone strength.
Confirm experimental groups, units and conditions using the metadata
before creating numerical comparisons or mission scoring.

## 2. OSD-684 — Skeletal muscle tissue-chip RNA sequencing

Study page:
https://osdr.nasa.gov/bio/repo/data/studies/OSD-684

GeneLab dataset identifier: GLDS-615

Local directory:
`data/raw/osdr/OSD-684/`

| File | Records | Contents |
|---|---:|---|
| GLDS-615_rna_seq_Normalized_Counts_GLbulkRNAseq.csv | 22,771 | Normalized gene-expression values across 12 samples |
| GLDS-615_rna_seq_differential_expression_GLbulkRNAseq.csv | 22,771 | Gene-level differential-expression analysis |
| GLDS-615_rna_seq_SampleTable_GLbulkRNAseq.csv | 12 | Sample identifiers and experimental conditions |
| GLDS-615_rna_seq_contrasts_GLbulkRNAseq.csv | 2 | Comparison-group definitions |
| OSD-684_metadata_OSD-684-ISA.zip | Metadata | Study and RNA-sequencing metadata |

### Scientific interpretation

These files contain gene-expression and differential-expression
information, not direct measurements of muscle mass, strength or
physical performance.

The sample table and contrast definitions are needed to interpret
the comparisons correctly. Use the study metadata to verify the
experimental model, sample origin, age groups and flight conditions.

Do not convert gene-expression values directly into a muscle-strength
score for a child or astronaut.

## 3. Data handling rules

1. Preserve downloaded source files in `data/raw/`.
2. Store cleaned or transformed copies in `data/processed/`.
3. Record transformations and units.
4. Preserve study identifiers and source links.
5. Document the species, sample type and experimental conditions.
6. Do not treat correlation or gene-expression changes as direct
   measurements of physical performance.
7. Use age-appropriate explanations when presenting research to children.

## 4. Other planned sources

| Source | Intended use | Status |
|---|---|---|
| NASA RadLab | Space radiation research and educational references | Not yet collected |
| Mars Trek | Mars surface and terrain references | Not yet collected |
| NASA APIs | Live or on-demand NASA information | API key obtained; endpoint selection pending |
