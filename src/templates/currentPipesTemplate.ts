import UpperPipeManager, { UpperPipeConfig } from '../scenes/UpperPipeManager';
import LowerPipeManager, { LowerPipeConfig } from '../scenes/LowerPipeManager';

// Define the interfaces locally since they're not exported from ChunkManager
interface PipeConfig {
  type: 'upper' | 'lower' | 'ground' | 'floating';
  x: number; // Relative to chunk start
  y: number;
  hasPurpleCubes?: boolean;
  hasMaroonCubes?: boolean;
}

interface EnemyConfig {
  x: number; // Relative to chunk start
  y: number;
  type: 'basic' | 'aggressive' | 'boss';
}

interface ChunkTemplate {
  id: string;
  width: number;
  pipes: PipeConfig[];
  enemies: EnemyConfig[];
  difficulty: number;
}

// Example pipe configurations for different pipe types
export const PIPE_CONFIGS = {
  // Standard pipe (default)
  standard: UpperPipeManager.createStandardPipeConfig(),
  
  // Floating pipe (smaller, for floating platforms)
  floating: UpperPipeManager.createFloatingPipeConfig(),
  
  // Wide pipe (for wider platforms)
  wide: UpperPipeManager.createCustomPipeConfig({
    pipeWidth: 120,
    blueHitboxHeight: 40,
    colors: {
      orange: 0xff6600,
      blue: 0x0066ff,
      cyan: 0x66ffff
    }
  }),
  
  // Tall pipe (for higher platforms)
  tall: UpperPipeManager.createCustomPipeConfig({
    basePipeHeight: 600,
    pipeHeightOffset: 0,
    colors: {
      orange: 0xff4400,
      blue: 0x0044ff,
      cyan: 0x44ffff
    }
  })
};

// Example lower pipe configurations
export const LOWER_PIPE_CONFIGS = {
  // Standard lower pipe (default)
  standard: LowerPipeManager.createStandardPipeConfig(),
  
  // Wide lower pipe (for wider platforms)
  wide: LowerPipeManager.createCustomPipeConfig({
    pipeWidth: 120,
    greenHitboxHeight: 40,
    colors: {
      orange: 0xff6600,
      red: 0xff0066,
      green: 0x66ff00,
      pink: 0xff66ff
    }
  }),
  
  // Tall lower pipe (for higher platforms)
  tall: LowerPipeManager.createCustomPipeConfig({
    baseLowerPipeHeight: 600,
    lowerPipeHeightOffset: 0,
    colors: {
      orange: 0xff4400,
      red: 0xff0044,
      green: 0x44ff00,
      pink: 0xff44ff
    }
  }),
  
  // Custom colored lower pipe
  custom: LowerPipeManager.createCustomPipeConfig({
    colors: {
      orange: 0xff8800,
      red: 0xff0088,
      green: 0x88ff00,
      pink: 0xff88ff
    }
  })
};

// Template for testing pipe creation with chunk-based system
export const CURRENT_PIPES_TEMPLATE: ChunkTemplate = {
  id: "test_pipes",
  width: 800,
  difficulty: 1,
  pipes: [
    // First pipe pair (standard configuration) - commented out for testing
    // { type: 'upper' as const, x: 200, y: UpperPipeManager.PIPE_Y_POSITION },  // Uses configurable Y position
    // { type: 'lower' as const, x: 200, y: UpperPipeManager.PIPE_Y_POSITION + 200 },  // Lower pipe positioned below upper pipe
    
    // Floating pipe (testing) - can use custom config: createFloatingPipe(x, y, PIPE_CONFIGS.floating)
    { type: 'floating' as const, x: 0, y: 850 },  // Floating pipe 50 pixels above ground (ground is at Y=1000)
    
    // Second pipe pair (standard configuration) - commented out for testing
    // { type: 'upper' as const, x: 600, y: UpperPipeManager.PIPE_Y_POSITION },  // Uses configurable Y position
    // { type: 'lower' as const, x: 600, y: UpperPipeManager.PIPE_Y_POSITION + 200 },  // Lower pipe positioned below upper pipe
  ],
  enemies: [
    // No enemies for now
  ]
}; 

// Template demonstrating different pipe configurations
export const CONFIGURATION_DEMO_TEMPLATE: ChunkTemplate = {
  id: "config_demo",
  width: 1200,
  difficulty: 1,
  pipes: [
    // Standard pipe (default configuration)
    { type: 'upper' as const, x: 100, y: UpperPipeManager.PIPE_Y_POSITION },
    
    // Wide pipe (custom configuration - would need to be passed to createUpperPipe)
    { type: 'upper' as const, x: 400, y: UpperPipeManager.PIPE_Y_POSITION },
    
    // Tall pipe (custom configuration - would need to be passed to createUpperPipe)
    { type: 'upper' as const, x: 700, y: UpperPipeManager.PIPE_Y_POSITION },
    
    // Floating pipe with custom config
    { type: 'floating' as const, x: 1000, y: 850 },
  ],
  enemies: []
};

// Template for testing lower pipe configurations
export const LOWER_PIPE_TEST_TEMPLATE: ChunkTemplate = {
  id: "lower_pipe_test",
  width: 1200,
  difficulty: 1,
  pipes: [
    // Standard lower pipe (default configuration)
    { type: 'lower' as const, x: 100, y: LowerPipeManager.LOWER_PIPE_Y_POSITION + 200 },
    
    // Wide lower pipe (custom configuration - would need to be passed to createLowerPipe)
    { type: 'lower' as const, x: 400, y: LowerPipeManager.LOWER_PIPE_Y_POSITION + 200 },
    
    // Custom colored lower pipe (custom configuration - would need to be passed to createLowerPipe)
    { type: 'lower' as const, x: 700, y: LowerPipeManager.LOWER_PIPE_Y_POSITION + 200 },
  ],
  enemies: []
}; 