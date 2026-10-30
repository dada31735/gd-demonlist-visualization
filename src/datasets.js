import { TAG_GROUPS } from './tags.js';

export const CLASSIC = {
  prefix: '',
  tagGroups: TAG_GROUPS,
  bucketSizes: [100, 150, 300, 500],
  bucketDefault: 150,
  minCounts: [10, 20, 50],
  minCountDefault: 20,
  tab: 'classic',
  levelsFile: 'levels.json',
  creatorsFile: 'creators.json',
};

export const PLATFORMER = {
  tab: 'platformer',
  prefix: 'plat-',
  levelsFile: 'platformer-levels.json',
  creatorsFile: 'platformer-creators.json',
  tagGroups: {
    gamemode: ['Cube', 'Robot', 'Ball', 'UFO', 'Jetpack', '2P'],
    length: ['XXL'],
    style: [
      'Deathless', 'Gimmicky', 'Needle', 'Fast-Paced', 'Slow-Paced', 'Overall', 'Orbs', 'Memory',
      'Autoscroll', 'Minigame', 'Low-Gravity', 'Slopetech', 'Speedrun', 'Dashtech',
      'Fixed Hitboxes', 'Cycle-Based',
    ],
    meta: ['NONG'],
  },
  // awkward bucket sizes because 213 levels and these give 8, 6, 4 and 3 columns with no tiny last one 
  // (this will eventually have to be changed as more levels are added)
  bucketSizes: [27, 36, 54, 71],
  bucketDefault: 36,
  minCounts: [5, 10, 20],
  minCountDefault: 10,
};