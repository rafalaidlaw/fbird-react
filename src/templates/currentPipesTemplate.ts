import StaticPipeManager from '../scenes/StaticPipeManager';

// Define the interfaces locally since they're not exported from ChunkManager
interface PipeConfig {
  type: 'upper' | 'lower' | 'ground';
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

// Simplified template with just one upper pipe for testing
export const CURRENT_PIPES_TEMPLATE: ChunkTemplate = {
  id: 'current-pipes',
  width: 400, // Smaller width for testing
  difficulty: 1,
  pipes: [
    // Just one upper pipe for testing
    { type: 'upper', x: 200, y: StaticPipeManager.PIPE_Y_POSITION },  // Uses configurable Y position
    // Add a lower pipe for testing
    { type: 'lower', x: 200, y: StaticPipeManager.PIPE_Y_POSITION + 200 },  // Lower pipe positioned below upper pipe
  ],
  enemies: [
    // No enemies currently (enemy system is disabled)
  ]
};

// Alternative: Split into smaller chunks for better reusability
export const SMALL_CHUNK_TEMPLATES: ChunkTemplate[] = [
  {
    id: 'chunk-1',
    width: 400, // 600-1000
    difficulty: 1,
    pipes: [
      { type: 'upper', x: 200, y: StaticPipeManager.PIPE_Y_POSITION },  // Uses configurable Y position
      // Add a lower pipe for testing
      { type: 'lower', x: 200, y: StaticPipeManager.PIPE_Y_POSITION + 200 },  // Lower pipe positioned below upper pipe
    ],
    enemies: []
  }
]; 