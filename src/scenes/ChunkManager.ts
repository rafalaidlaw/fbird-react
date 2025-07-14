import Phaser from "phaser";

// Chunk template interfaces
interface PipeConfig {
  type: 'upper' | 'lower';
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

export default class ChunkManager {
  private scene: Phaser.Scene;
  private config: any;
  private currentChunkIndex: number = 0;
  private activeChunks: any[] = [];
  private chunkWidth: number = 800; // Width of each chunk
  private chunkSpacing: number = 1000; // Distance between chunk start positions
  private chunkTemplates: ChunkTemplate[] = [];

  constructor(scene: Phaser.Scene, config: any) {
    this.scene = scene;
    this.config = config;
    this.initializeChunkTemplates();
  }

  private initializeChunkTemplates(): void {
    // Basic chunk - simple pipes with one enemy
    const basicChunk: ChunkTemplate = {
      id: 'basic',
      width: 800,
      difficulty: 1,
      pipes: [
        { type: 'upper', x: 200, y: 300 },
        { type: 'lower', x: 200, y: 500 }
      ],
      enemies: [
        { x: 250, y: 450, type: 'basic' }
      ]
    };

    // Purple chunk - pipes with purple cubes and two enemies
    const purpleChunk: ChunkTemplate = {
      id: 'purple',
      width: 800,
      difficulty: 2,
      pipes: [
        { type: 'upper', x: 200, y: 300, hasPurpleCubes: true },
        { type: 'lower', x: 200, y: 500 }
      ],
      enemies: [
        { x: 250, y: 450, type: 'basic' },
        { x: 550, y: 450, type: 'basic' }
      ]
    };

    // Maroon chunk - pipes with maroon cubes and three enemies
    const maroonChunk: ChunkTemplate = {
      id: 'maroon',
      width: 800,
      difficulty: 3,
      pipes: [
        { type: 'upper', x: 200, y: 300 },
        { type: 'lower', x: 200, y: 500, hasMaroonCubes: true }
      ],
      enemies: [
        { x: 250, y: 450, type: 'basic' },
        { x: 400, y: 450, type: 'basic' },
        { x: 550, y: 450, type: 'basic' }
      ]
    };

    this.chunkTemplates = [basicChunk, purpleChunk, maroonChunk];
  }

  // Get the current chunk index based on player position
  getCurrentChunkIndex(playerX: number): number {
    return Math.floor(playerX / this.chunkSpacing);
  }

  // Check if we need to spawn a new chunk
  shouldSpawnNewChunk(playerX: number): boolean {
    const currentChunkIndex = this.getCurrentChunkIndex(playerX);
    return currentChunkIndex > this.currentChunkIndex;
  }

  // Get the X position for a specific chunk
  getChunkXPosition(chunkIndex: number): number {
    return chunkIndex * this.chunkSpacing;
  }

  // Basic method to track chunk positions (for debugging)
  getChunkInfo(playerX: number): { currentIndex: number, chunkX: number } {
    const currentIndex = this.getCurrentChunkIndex(playerX);
    const chunkX = this.getChunkXPosition(currentIndex);
    return { currentIndex, chunkX };
  }

  // Get a chunk template by index (cycles through available templates)
  getChunkTemplate(chunkIndex: number): ChunkTemplate | null {
    if (this.chunkTemplates.length === 0) return null;
    const templateIndex = chunkIndex % this.chunkTemplates.length;
    return this.chunkTemplates[templateIndex];
  }

  // Get chunk template info for debugging
  getChunkTemplateInfo(chunkIndex: number): { templateId: string, difficulty: number } | null {
    const template = this.getChunkTemplate(chunkIndex);
    if (!template) return null;
    return { templateId: template.id, difficulty: template.difficulty };
  }

  // Spawn a chunk at the specified index
  spawnChunk(chunkIndex: number): { pipes: any[], enemies: any[] } | null {
    const template = this.getChunkTemplate(chunkIndex);
    if (!template) return null;

    const chunkX = this.getChunkXPosition(chunkIndex);
    const spawnedPipes: any[] = [];
    const spawnedEnemies: any[] = [];

    console.log(`[CHUNK SPAWN] Spawning chunk ${chunkIndex} (${template.id}) at X: ${chunkX}`);

    // For now, just log what would be spawned
    // We'll integrate with PipeManager and enemy creation later
    template.pipes.forEach(pipeConfig => {
      const absoluteX = chunkX + pipeConfig.x;
      const absoluteY = pipeConfig.y;
      console.log(`[CHUNK SPAWN] Would create ${pipeConfig.type} pipe at (${absoluteX}, ${absoluteY})`);
      spawnedPipes.push({
        type: pipeConfig.type,
        x: absoluteX,
        y: absoluteY,
        hasPurpleCubes: pipeConfig.hasPurpleCubes,
        hasMaroonCubes: pipeConfig.hasMaroonCubes
      });
    });

    template.enemies.forEach(enemyConfig => {
      const absoluteX = chunkX + enemyConfig.x;
      const absoluteY = enemyConfig.y;
      console.log(`[CHUNK SPAWN] Would create ${enemyConfig.type} enemy at (${absoluteX}, ${absoluteY})`);
      spawnedEnemies.push({
        type: enemyConfig.type,
        x: absoluteX,
        y: absoluteY
      });
    });

    return { pipes: spawnedPipes, enemies: spawnedEnemies };
  }

  // Check if we need to spawn a new chunk and spawn it
  checkAndSpawnChunk(playerX: number): boolean {
    if (this.shouldSpawnNewChunk(playerX)) {
      const currentChunkIndex = this.getCurrentChunkIndex(playerX);
      this.currentChunkIndex = currentChunkIndex;
      
      // Spawn the chunk
      const spawnResult = this.spawnChunk(currentChunkIndex);
      if (spawnResult) {
        console.log(`[CHUNK SPAWN] Successfully spawned chunk ${currentChunkIndex} with ${spawnResult.pipes.length} pipes and ${spawnResult.enemies.length} enemies`);
        return true;
      }
    }
    return false;
  }
} 