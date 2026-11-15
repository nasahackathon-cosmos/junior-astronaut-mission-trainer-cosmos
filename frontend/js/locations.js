/**
 * COSMOS - Planetary Exploration Location Registry (Days 10-30)
 *
 * Provides authoritative planet-specific world coordinates, physical landmark
 * definitions, terrain classifications, and objective coordinates across
 * Mars and Moon surfaces.
 */

export const SURFACE_LOCATIONS = {
  mars: {
    landing_site: {
      id: 'landing_site',
      name: 'JEZERO TOUCHDOWN CRADLE',
      coords: [0, 0],
      terrain: 'Dusty impact basin plain',
      landmark: 'Descent Spacecraft & Scorch Zone',
      description: 'The touchdown footprint of the expedition spacecraft in Jezero Crater.',
      radius: 12
    },
    power_grid: {
      id: 'power_grid',
      name: 'SOLAR FIELD & POWER SUBSTATION',
      coords: [14, 8],
      terrain: 'Rocky terrace with stable bedrock',
      landmark: 'Photovoltaic Array & Power Hub',
      description: 'High-efficiency solar array generating electrical power for base life support.',
      radius: 10
    },
    base_construction: {
      id: 'base_construction',
      name: 'HABITAT FOUNDATION YARD',
      coords: [-16, 12],
      terrain: 'Compacted regolith building terrace',
      landmark: 'Modular Habitat Frame & Regolith Foundation',
      description: 'Zoned area for planetary base expansion and pressurized module assembly.',
      radius: 12
    },
    greenhouse_site: {
      id: 'greenhouse_site',
      name: 'BIODOME HYDROPONICS FACILITY',
      coords: [-22, -14],
      terrain: 'Thermal-shielded basin hollow',
      landmark: 'Geodesic Greenhouse Dome & Grow Beds',
      description: 'Pressurized bio-pod growing vegetables to ensure sustainable crew nutrition.',
      radius: 12
    },
    crater_expedition: {
      id: 'crater_expedition',
      name: 'VALLES MARINERIS IMPACT CHASM',
      coords: [56, -46],
      terrain: 'Deep stratified impact crater with boulder fields',
      landmark: 'Massive Crater Rim & Central Uplift Peak',
      description: 'A 45-metre wide ancient impact crater exposing stratified Martian crustal layers.',
      radius: 26
    },
    observation_ridge: {
      id: 'observation_ridge',
      name: 'AEOLIS PROMONTORY RIDGE',
      coords: [-54, -48],
      terrain: 'High-elevation volcanic basalt ridge',
      landmark: 'Promontory Weather Mast & Panorama Vista',
      description: 'Elevated vantage point offering panoramic horizon vistas and atmospheric observation.',
      radius: 20
    },
    science_station: {
      id: 'science_station',
      name: 'XENO-BIOLOGY & MATERIALS STATION',
      coords: [12, -24],
      terrain: 'Smooth basalt plateau',
      landmark: 'Science Module & Analysis Lab Benches',
      description: 'Specialized laboratory for analyzing Martian microbiology and material samples.',
      radius: 12
    },
    geology_field: {
      id: 'geology_field',
      name: 'HEMATITE & REGOLITH DRILL FIELD',
      coords: [48, 32],
      terrain: 'Mineral-rich red dunes and stratified outcrops',
      landmark: 'Core Drill Rig & Layered Bedrock Scree',
      description: 'Rich regolith field with iron-oxide nodules and brick-making materials.',
      radius: 18
    },
    habitat_living: {
      id: 'habitat_living',
      name: 'CREW LIVING HABITAT & MEDICAL BAY',
      coords: [-12, 4],
      terrain: 'Reinforced central habitat zone',
      landmark: 'Primary Pressurized Habitat Pod',
      description: 'Living quarters, fitness center, galley, and medical monitoring suite.',
      radius: 10
    },
    enviro_station: {
      id: 'enviro_station',
      name: 'METEOROLOGY & SEISMIC ARRAY',
      coords: [-28, 28],
      terrain: 'Windward plateau exposed to prevailing winds',
      landmark: 'Atmospheric Sensor Mast & Seismometer',
      description: 'Continuous monitoring of Martian atmospheric pressure, dust flux, and gravity.',
      radius: 14
    },
    astronomy_area: {
      id: 'astronomy_area',
      name: 'DEEP-SKY ASTRONOMY LOOKOUT',
      coords: [-46, 52],
      terrain: 'Isolated high-elevation plateau with low dust interference',
      landmark: 'Optical/IR Telescope Turret & Dish',
      description: 'Dark-sky observatory for searching candidate exoplanets and deep-space telemetry.',
      radius: 16
    },
    food_storage: {
      id: 'food_storage',
      name: 'LOGISTICS & RATION DEPOT',
      coords: [-18, -20],
      terrain: 'Reinforced storage vault',
      landmark: 'Cryogenic Storage Pods & Cargo Crates',
      description: 'Secure food reserves and harvest preservation containers.',
      radius: 10
    },
    rover_recovery: {
      id: 'rover_recovery',
      name: 'STRANDED PROBE RECOVERY ZONE',
      coords: [68, -12],
      terrain: 'Rough boulder-strewn canyon floor',
      landmark: 'Stranded Exploration Rover & Beacon Mast',
      description: 'A robotic rover immobilised during a previous traverse requiring field salvage.',
      radius: 18
    },
    resupply_zone: {
      id: 'resupply_zone',
      name: 'CARGO DROP BEACON & PAD',
      coords: [28, -36],
      terrain: 'Cleared landing clearing with beacon markers',
      landmark: 'Automated Resupply Lander & Cargo Pods',
      description: 'Designated drop zone for automated Earth cargo resupply capsules.',
      radius: 14
    },
    launch_site: {
      id: 'launch_site',
      name: 'ASCENT VEHICLE LAUNCH PAD',
      coords: [36, 12],
      terrain: 'Heat-resistant launch pad bedrock',
      landmark: 'Earth Return Vehicle & Launch Gantry',
      description: 'Ascent vehicle prepped for planetary departure and return to Earth.',
      radius: 16
    }
  },
  moon: {
    landing_site: {
      id: 'landing_site',
      name: 'STATIO TRANQUILLITATIS DESCENT SITE',
      coords: [0, 0],
      terrain: 'Fine basaltic lunar regolith plain',
      landmark: 'Lunar Lander Descent Stage & Foil Shielding',
      description: 'Historical touchdown footprint on the lunar mare surface.',
      radius: 12
    },
    power_grid: {
      id: 'power_grid',
      name: 'CONTINUOUS LIGHT SOLAR PROMONTORY',
      coords: [14, 8],
      terrain: 'High-rim sunlit terrace',
      landmark: 'Vertical Solar Mast & Power Storage Pack',
      description: 'High-angle solar panels positioned on a crater rim for uninterrupted sunlight.',
      radius: 10
    },
    base_construction: {
      id: 'base_construction',
      name: 'IN-SITU REGOLITH CONSTRUCTION SITE',
      coords: [-16, 12],
      terrain: 'Bulldozed regolith foundation pad',
      landmark: 'Sintered Regolith Arch & Habitat Shell',
      description: '3D-sintered microwave regolith structure protecting against cosmic radiation.',
      radius: 12
    },
    greenhouse_site: {
      id: 'greenhouse_site',
      name: 'LUNAR BIOSHIELD BOTANICAL HUB',
      coords: [-22, -14],
      terrain: 'Sub-surface crater hollow for thermal insulation',
      landmark: 'Berm-Shielded Greenhouse & LED Trays',
      description: 'Regolith-covered subterranean greenhouse protecting crops from radiation spikes.',
      radius: 12
    },
    crater_expedition: {
      id: 'crater_expedition',
      name: 'SHACKLETON ANOMALY CRATER',
      coords: [56, -46],
      terrain: 'Permanently shadowed crater interior with steep rim',
      landmark: 'Vast Crater Precipice & Volatile Ice Outcrop',
      description: 'A deep impact crater where water ice deposits survive in eternal cold.',
      radius: 26
    },
    observation_ridge: {
      id: 'observation_ridge',
      name: 'MONTES APENNINUS RIDGE',
      coords: [-54, -48],
      terrain: 'Rugged lunar highland mountain crest',
      landmark: 'Highland Survey Mast & Earth Vista Point',
      description: 'Towering lunar mountain ridge overlooking the stark black void and Earth above.',
      radius: 20
    },
    science_station: {
      id: 'science_station',
      name: 'ALSEP LUNAR EXPERIMENT STATION',
      coords: [12, -24],
      terrain: 'Flat regolith plain',
      landmark: 'Surface Experiment Package & Sensor Mast',
      description: 'Multi-experiment science suite measuring solar wind, dust levitation, and seismicity.',
      radius: 12
    },
    geology_field: {
      id: 'geology_field',
      name: 'ANORTHOSITE HIGHLAND FIELD',
      coords: [48, 32],
      terrain: 'White anorthosite boulder field and impact glass',
      landmark: 'Core Drill Platform & Glass Bead Outcrop',
      description: 'Ancient primordial lunar crust samples and titanium-rich ilmenite deposits.',
      radius: 18
    },
    habitat_living: {
      id: 'habitat_living',
      name: 'LUNAR OUTPOST HABITAT & GYM',
      coords: [-12, 4],
      terrain: 'Pressurized core complex',
      landmark: 'Inflatable Hab Module & Medical Airlock',
      description: 'Crew quarters, low-gravity treadmill, galley, and medical telemetry.',
      radius: 10
    },
    enviro_station: {
      id: 'enviro_station',
      name: 'RADLAB & DUST MONITORING SITE',
      coords: [-28, 28],
      terrain: 'Open lunar plain subject to solar flares',
      landmark: 'RadLab Dosimeter Tower & Micro-Meteorite Foil',
      description: 'Space radiation laboratory tracking cosmic rays and electrostatic dust migration.',
      radius: 14
    },
    astronomy_area: {
      id: 'astronomy_area',
      name: 'RADIO-QUIET ASTRONOMY ARRAY',
      coords: [-46, 52],
      terrain: 'Radio-quiet highland ridge facing deep space',
      landmark: 'Far-Side Radio Telescope Dish',
      description: 'Free from Earth radio frequency interference, observing the early universe.',
      radius: 16
    },
    food_storage: {
      id: 'food_storage',
      name: 'RATION VAULT & SUPPLY CASSETTES',
      coords: [-18, -20],
      terrain: 'Protected crater alcove',
      landmark: 'Pressurized Cargo Containers',
      description: 'Emergency food stores and water recycling reserves.',
      radius: 10
    },
    rover_recovery: {
      id: 'rover_recovery',
      name: 'HISTORIC SURVEYOR RECOVERY ZONE',
      coords: [68, -12],
      terrain: 'Crater rim slope with scattered debris',
      landmark: 'Historic Lunar Probe / Equipment Site',
      description: 'A legacy robotic lander preserving materials subjected to decades of space exposure.',
      radius: 18
    },
    resupply_zone: {
      id: 'resupply_zone',
      name: 'ARTEMIS LOGISTICS DROP ZONE',
      coords: [28, -36],
      terrain: 'Graded landing beacon circle',
      landmark: 'Commercial Cargo Capsule & Pallet Stack',
      description: 'Target zone for uncrewed resupply lander delivering fresh food and filters.',
      radius: 14
    },
    launch_site: {
      id: 'launch_site',
      name: 'ORION ASCENT LAUNCH STAGE',
      coords: [36, 12],
      terrain: 'Lunar blast pad bedrock',
      landmark: 'Lunar Ascent Module & Boarding Gantry',
      description: 'Ascent engine stage primed to propel the crew back to Earth transit.',
      radius: 16
    }
  }
};

/**
 * Mapping from campaign day (10-30) to authoritative physical destination.
 */
export const DAY_MISSION_LOCATIONS = {
  10: { locationKey: 'landing_site', vehicleRecommended: 'walk' },
  11: { locationKey: 'power_grid', vehicleRecommended: 'walk' },
  12: { locationKey: 'base_construction', vehicleRecommended: 'walk' },
  13: { locationKey: 'greenhouse_site', vehicleRecommended: 'walk' },
  14: { locationKey: 'crater_expedition', vehicleRecommended: 'rover' },
  15: { locationKey: 'observation_ridge', vehicleRecommended: 'rover' },
  16: { locationKey: 'science_station', vehicleRecommended: 'walk' },
  17: { locationKey: 'geology_field', vehicleRecommended: 'rover' },
  18: { locationKey: 'habitat_living', vehicleRecommended: 'walk' },
  19: { locationKey: 'enviro_station', vehicleRecommended: 'walk' },
  20: { locationKey: 'habitat_living', vehicleRecommended: 'walk' },
  21: { locationKey: 'astronomy_area', vehicleRecommended: 'rover' },
  22: { locationKey: 'observation_ridge', vehicleRecommended: 'rover' },
  23: { locationKey: 'food_storage', vehicleRecommended: 'walk' },
  24: { locationKey: 'rover_recovery', vehicleRecommended: 'rover' },
  25: { locationKey: 'resupply_zone', vehicleRecommended: 'rover' },
  26: { locationKey: 'greenhouse_site', vehicleRecommended: 'walk' },
  27: { locationKey: 'landing_site', vehicleRecommended: 'walk' },
  28: { locationKey: 'science_station', vehicleRecommended: 'walk' },
  29: { locationKey: 'launch_site', vehicleRecommended: 'rover' },
  30: { locationKey: 'launch_site', vehicleRecommended: 'walk' }
};

/**
 * Objective world coordinates for each mission (M010 to M030).
 * Placed precisely at the designated physical location and station.
 */
export const MISSION_OBJECTIVE_COORDS = {
  // Day 10: Landing Site
  M010: {
    mars: [
      [0, -2],     // m010-area: Explore landing area
      [1.8, 1.2],  // m010-damage: Spacecraft hull/engine
      [-2.2, 0.4], // m010-health: Medical kit / station
      [0, -0.6]    // m010-report: Mission log comms
    ],
    moon: [
      [0, -2],
      [1.6, 1.4],
      [-2.0, 0.5],
      [0, -0.5]
    ]
  },
  // Day 11: Power & Solar Grid
  M011: {
    mars: [
      [14, 8],     // m011-systems: Power station
      [16, 10],    // m011-panels: Solar array deploy
      [15, 6],     // m011-placement: Panel alignment
      [13, 7],     // m011-power: Power verify
      [14, 8.5]    // m011-report: Log
    ],
    moon: [
      [14, 8],
      [16, 10],
      [15, 6],
      [13, 7],
      [14, 8.5]
    ]
  },
  // Day 12: Base Construction Area
  M012: {
    mars: [
      [-14, 10],   // m012-materials: Construction yard materials
      [-16, 12],   // m012-shelter: Build shelter
      [-18, 14],   // m012-priorities: Base console
      [-16, 11]    // m012-report: Log
    ],
    moon: [
      [-14, 10],
      [-16, 12],
      [-18, 14],
      [-16, 11]
    ]
  },
  // Day 13: Greenhouse
  M013: {
    mars: [
      [-21, -13],  // m013-plant: Plant vegetables
      [-23, -15],  // m013-maintain: Water/maintain
      [-22, -14],  // m013-monitor: Monitor growth
      [-20, -13]   // m013-report: Log
    ],
    moon: [
      [-21, -13],
      [-23, -15],
      [-22, -14],
      [-20, -13]
    ]
  },
  // Day 14: Large Impact Crater (Rover expedition)
  M014: {
    mars: [
      [0, -2],     // m014-rover: Enter rover at base
      [28, -24],   // m014-drive: Midpoint navigation waypoint across the valley
      [54, -44],   // m014-crater: Crater rim overlook
      [58, -48],   // m014-sample: Inside crater rock sample
      [56, -46]    // m014-report: Crater terminal log
    ],
    moon: [
      [0, -2],
      [28, -24],
      [54, -44],
      [58, -48],
      [56, -46]
    ]
  },
  // Day 15: Elevated Observation Ridge
  M015: {
    mars: [
      [-52, -46],  // m015-point: Summit observation point
      [-54, -48],  // m015-horizon: Observe horizon vista
      [-56, -50],  // m015-photo: Photograph horizon
      [-53, -47]   // m015-report: Log
    ],
    moon: [
      [-52, -46],
      [-54, -48],
      [-56, -50],
      [-53, -47]
    ]
  },
  // Day 16: Science Research Station
  M016: {
    mars: [
      [11, -23],   // m016-biology: Biology bench
      [13, -25],   // m016-technology: Tech bench
      [12, -24],   // m016-compare: Science console
      [12, -22]    // m016-report: Log
    ],
    moon: [
      [11, -23],
      [13, -25],
      [12, -24],
      [12, -22]
    ]
  },
  // Day 17: Geological Sampling Field
  M017: {
    mars: [
      [46, 30],    // m017-locations: Visit sample site A
      [50, 34],    // m017-samples: Collect regolith at site B
      [48, 32],    // m017-bricks: Construction brick press
      [47, 31]     // m017-report: Log
    ],
    moon: [
      [46, 30],
      [50, 34],
      [48, 32],
      [47, 31]
    ]
  },
  // Day 18: Habitat Living & Health
  M018: {
    mars: [
      [-11, 3],    // m018-health: Medical station
      [-13, 5],    // m018-exercise: Exercise treadmill
      [-12, 4],    // m018-monitor: Health telemetry
      [-11, 4]     // m018-report: Log
    ],
    moon: [
      [-11, 3],
      [-13, 5],
      [-12, 4],
      [-11, 4]
    ]
  },
  // Day 19: Environmental Monitoring Station
  M019: {
    mars: [
      [-27, 27],   // m019-gravity: Gravity sensor
      [-29, 29],   // m019-atmosphere: Weather & radiation probe
      [-28, 28],   // m019-day: Diurnal cycle monitor
      [-27, 28]    // m019-report: Log
    ],
    moon: [
      [-27, 27],
      [-29, 29],
      [-28, 28],
      [-27, 28]
    ]
  },
  // Day 20: Birthday in Habitat
  M020: {
    mars: [
      [-13, 3],    // m020-cake: Galley prep
      [-12, 5],    // m020-celebration: Living module celebration
      [-11, 4],    // m020-pico: Talk with PICO-7
      [-12, 4]     // m020-report: Log
    ],
    moon: [
      [-13, 3],
      [-12, 5],
      [-11, 4],
      [-12, 4]
    ]
  },
  // Day 21: Astronomy Observation Area
  M021: {
    mars: [
      [-46, 52],   // m021-telescope: Deep-sky telescope
      [-48, 54],   // m021-database: Exoplanet database terminal
      [-45, 51],   // m021-research: Habitability analysis
      [-46, 53]    // m021-report: Log
    ],
    moon: [
      [-46, 52],
      [-48, 54],
      [-45, 51],
      [-46, 53]
    ]
  },
  // Day 22: Aurora / Atmospheric Observation
  M022: {
    mars: [
      [-54, -48],  // m022-phenomenon: Aurora / airglow observation
      [-56, -50],  // m022-camera: Camera documentation
      [-52, -46],  // m022-record: Science log console
      [-53, -47]   // m022-report: Log
    ],
    moon: [
      [-54, -48],
      [-56, -50],
      [-52, -46],
      [-53, -47]
    ]
  },
  // Day 23: Food Shortage & Logistics Depot
  M023: {
    mars: [
      [-17, -19],  // m023-reserve: Inspect food reserve
      [-19, -21],  // m023-calculate: Calculate supplies
      [-18, -20],  // m023-request: Earth comms request
      [-18, -19]   // m023-report: Log
    ],
    moon: [
      [-17, -19],
      [-19, -21],
      [-18, -20],
      [-18, -19]
    ]
  },
  // Day 24: Rover Recovery (Mars) / Equipment Recovery (Moon)
  M024: {
    mars: [
      [2, -2],     // m024-drone: Deploy drone at base
      [36, -8],    // m024-locate: Locate stopped rover en-route waypoint
      [66, -11],   // m024-diagnose: Inspect & reactivate stranded rover
      [69, -13],   // m024-recover: Recover rock sample & secure rover
      [67, -12]    // m024-report: Field terminal report
    ],
    moon: [
      [36, -8],    // m024-explore: Explore highland plain
      [66, -11],   // m024-locate: Locate legacy surveyor probe
      [69, -13],   // m024-collect: Collect lunar artifact
      [0, 1.5],    // m024-transport: Transport back to spacecraft cargo bay
      [0, -0.6]    // m024-report: Spacecraft report
    ]
  },
  // Day 25: Resupply Landing Zone
  M025: {
    mars: [
      [26, -34],   // m025-observe: Observe incoming cargo lander
      [28, -36],   // m025-receive: Receive cargo pallet
      [30, -38],   // m025-inventory: Update cargo inventory
      [28, -35]    // m025-report: Log
    ],
    moon: [
      [26, -34],
      [28, -36],
      [30, -38],
      [28, -35]
    ]
  },
  // Day 26: Repair Greenhouse Damage
  M026: {
    mars: [
      [-21, -13],  // m026-inspect: Inspect greenhouse damage
      [-23, -15],  // m026-repair: Repair structure
      [-22, -14],  // m026-systems: Restore environmental systems
      [-21, -14]   // m026-report: Log
    ],
    moon: [
      [-21, -13],
      [-23, -15],
      [-22, -14],
      [-21, -14]
    ]
  },
  // Day 27: Meet Another Astronaut
  M027: {
    mars: [
      [2, -1],     // m027-arrival: Observe arriving astronaut spacecraft
      [-12, 4],    // m027-meet: Meet astronaut in habitat
      [-11, 5],    // m027-friendship: Conversation in hab
      [-12, 3]     // m027-report: Log
    ],
    moon: [
      [2, -1],
      [-12, 4],
      [-11, 5],
      [-12, 3]
    ]
  },
  // Day 28: Collaborative Science Experiments
  M028: {
    mars: [
      [11, -23],   // m028-team: Joint lab team station
      [13, -25],   // m028-experiment: Run collaborative experiment
      [12, -24],   // m028-results: Exchange & compare results
      [12, -22]    // m028-report: Log
    ],
    moon: [
      [11, -23],
      [13, -25],
      [12, -24],
      [12, -22]
    ]
  },
  // Day 29: Prepare to Leave Planet
  M029: {
    mars: [
      [34, 10],    // m029-samples: Pack research samples into cargo
      [36, 12],    // m029-systems: Pre-flight checks on ascent vehicle
      [-12, 4],    // m029-goodbye: Say goodbye to friend at hab
      [36, 11]     // m029-report: Log
    ],
    moon: [
      [34, 10],
      [36, 12],
      [-12, 4],
      [36, 11]
    ]
  },
  // Day 30: Final Departure & Return to Earth
  M030: {
    mars: [
      [36, 12],    // m030-checks: Final launch checks
      [38, 14],    // m030-launch: Launch ascent engines
      [36, 13],    // m030-report: Final scientific mission report
      [35, 11]     // m030-farewell: Farewell with PICO-7
    ],
    moon: [
      [36, 12],
      [38, 14],
      [36, 13],
      [35, 11]
    ]
  }
};

/**
 * Get location metadata for a given campaign day and environment.
 */
export function getMissionLocationForDay(day, env = 'mars') {
  const cleanEnv = env === 'moon' ? 'moon' : 'mars';
  const entry = DAY_MISSION_LOCATIONS[day] || DAY_MISSION_LOCATIONS[10];
  const loc = SURFACE_LOCATIONS[cleanEnv][entry.locationKey] || SURFACE_LOCATIONS[cleanEnv].landing_site;
  return {
    ...loc,
    vehicleRecommended: entry.vehicleRecommended
  };
}

/**
 * Determine the location name at coordinates (x, z).
 */
export function getCurrentLocationName(x, z, env = 'mars') {
  const cleanEnv = env === 'moon' ? 'moon' : 'mars';
  const locations = SURFACE_LOCATIONS[cleanEnv];
  for (const loc of Object.values(locations)) {
    const dist = Math.hypot(x - loc.coords[0], z - loc.coords[1]);
    if (dist <= loc.radius) {
      return loc.name;
    }
  }
  return cleanEnv === 'mars' ? 'JEZERO CRATER BASIN' : 'LUNAR REGOLITH HIGHLANDS';
}

/**
 * Return authoritative objective positions for a mission.
 */
export function getObjectiveCoords(missionId, env = 'mars') {
  const cleanEnv = env === 'moon' ? 'moon' : 'mars';
  const missionCoords = MISSION_OBJECTIVE_COORDS[missionId];
  if (missionCoords && missionCoords[cleanEnv]) {
    return missionCoords[cleanEnv];
  }
  return [[2, -3], [5, -1], [7, 0], [-3, -4], [0, -1], [8, -4]];
}
