import UpperPipeManager from '../scenes/UpperPipeManager';

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

// Template for testing pipe creation with chunk-based system
export const CURRENT_PIPES_TEMPLATE: ChunkTemplate = {
  id: "test_pipes",
  width: 800,
  difficulty: 1,
  pipes: [
    // First pipe pair
    { type: 'upper' as const, x: 200, y: UpperPipeManager.PIPE_Y_POSITION },  // Uses configurable Y position
    { type: 'lower' as const, x: 200, y: UpperPipeManager.PIPE_Y_POSITION + 200 },  // Lower pipe positioned below upper pipe
    
    // Floating pipe (testing)
    { type: 'floating' as const, x: 400, y: UpperPipeManager.PIPE_Y_POSITION + 100 },  // Floating pipe in the middle
    
    // Second pipe pair (further ahead)
    { type: 'upper' as const, x: 600, y: UpperPipeManager.PIPE_Y_POSITION },  // Uses configurable Y position
    { type: 'lower' as const, x: 600, y: UpperPipeManager.PIPE_Y_POSITION + 200 },  // Lower pipe positioned below upper pipe
  ],
  enemies: [
    // No enemies for now
  ]
}; 