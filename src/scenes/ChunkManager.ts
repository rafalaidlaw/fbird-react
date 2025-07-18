import Phaser from "phaser";
import { CURRENT_PIPES_TEMPLATE } from '../templates/currentPipesTemplate';
import UpperPipeManager from "./UpperPipeManager";
import LowerPipeManager from "./LowerPipeManager";
import FloatingPipeManager from "./FloatingPipeManager";

// Chunk template interfaces
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

export default class ChunkManager {
  private scene: Phaser.Scene;
  private config: any;
  private currentChunkIndex: number = 0;
  private lastSpawnedX: number = 0; // Track the actual last spawned X position
  private activeChunks: any[] = []; // Track spawned chunks for recycling
  private chunkWidth: number = 800; // Width of each chunk
  private chunkSpacing: number = 1000; // Distance between chunk start positions
  private chunkTemplates: ChunkTemplate[] = [];
  private lastSpawnTime: number = 0; // Track last spawn time to prevent duplicates

  // Direct references to pipe managers
  private upperPipeManager: UpperPipeManager;
  private lowerPipeManager: LowerPipeManager;
  private floatingPipeManager: FloatingPipeManager;
  private combinedPipes: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, config: any, upperPipeManager: UpperPipeManager, lowerPipeManager: LowerPipeManager, floatingPipeManager: FloatingPipeManager) {
    this.scene = scene;
    this.config = config;
    this.upperPipeManager = upperPipeManager;
    this.lowerPipeManager = lowerPipeManager;
    this.floatingPipeManager = floatingPipeManager;
    this.combinedPipes = this.scene.physics.add.group();
    this.initializeChunkTemplates();
  }

  private initializeChunkTemplates(): void {
    // Use our new template for testing
    this.chunkTemplates = [CURRENT_PIPES_TEMPLATE];

  }

  // Get the current chunk index based on player position
  getCurrentChunkIndex(playerX: number): number {
    return Math.floor(playerX / this.chunkSpacing);
  }

  // Check if we need to spawn a new chunk - spawn 500 pixels ahead of player
  shouldSpawnNewChunk(playerX: number): boolean {
    // Check if we need to spawn a new chunk 500 pixels ahead
    const spawnDistance = 500;
    const minDistanceBetweenChunks = 800; // Minimum distance between chunk spawns
    const currentTime = Date.now();
    const timeSinceLastSpawn = currentTime - this.lastSpawnTime;
    const minSpawnCooldown = 100; // Minimum 100ms between spawns
    
    const shouldSpawn = playerX + spawnDistance > this.lastSpawnedX + minDistanceBetweenChunks && 
                       timeSinceLastSpawn > minSpawnCooldown;
    if (shouldSpawn) {
      // console.log(`[CHUNK SPAWN] Player at ${playerX}, spawning chunk at ${playerX + spawnDistance}`);
    }
    return shouldSpawn;
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

    // Create all pipes from the template (skip ground pipes)
    template.pipes.forEach(pipeConfig => {
      const absoluteX = chunkX + pipeConfig.x;
      const absoluteY = pipeConfig.y;
      
      if (pipeConfig.type === 'upper') {
        // console.log(`[CHUNK TEST] Creating upper pipe at (${absoluteX}, ${absoluteY}) from template`);
        const createdPipe = this.upperPipeManager.createUpperPipe(absoluteX, absoluteY);
        this.combinedPipes.add(createdPipe);
        spawnedPipes.push(createdPipe);
      } else if (pipeConfig.type === 'lower') {
        // console.log(`[CHUNK TEST] Creating lower pipe at (${absoluteX}, ${absoluteY}) from template`);
        const createdPipe = this.lowerPipeManager.createLowerPipe(absoluteX, absoluteY);
        this.combinedPipes.add(createdPipe);
        spawnedPipes.push(createdPipe);
      } else if (pipeConfig.type === 'floating') {
        // console.log(`[CHUNK TEST] Creating floating pipe at (${absoluteX}, ${absoluteY}) from template`);
        const createdPipe = this.floatingPipeManager.createFloatingPipe(absoluteX, absoluteY);
        this.combinedPipes.add(createdPipe);
        spawnedPipes.push(createdPipe);
      } else if (pipeConfig.type === 'ground') {
        // console.log(`[CHUNK TEST] Skipping ground pipe at (${absoluteX}, ${absoluteY}) to avoid ground plane conflicts`);
      }
    });

    template.enemies.forEach(enemyConfig => {
      const absoluteX = chunkX + enemyConfig.x;
      const absoluteY = enemyConfig.y;
  
      spawnedEnemies.push({
        type: enemyConfig.type,
        x: absoluteX,
        y: absoluteY
      });
    });

    return { pipes: spawnedPipes, enemies: spawnedEnemies };
  }

  // Spawn a chunk at a specific X position (for 500px ahead spawning)
  spawnChunkAtPosition(chunkX: number): { pipes: any[], enemies: any[] } | null {
    const template = this.getChunkTemplate(this.currentChunkIndex);
    if (!template) return null;

    const spawnedPipes: any[] = [];
    const spawnedEnemies: any[] = [];

    // Create all pipes from the template (skip ground pipes)
    template.pipes.forEach(pipeConfig => {
      const absoluteX = chunkX + pipeConfig.x;
      const absoluteY = pipeConfig.y;
      
      if (pipeConfig.type === 'upper') {
        // console.log(`[CHUNK TEST] Creating upper pipe at (${absoluteX}, ${absoluteY}) from template`);
        const createdPipe = this.upperPipeManager.createUpperPipe(absoluteX, absoluteY);
        this.combinedPipes.add(createdPipe);
        spawnedPipes.push(createdPipe);
      } else if (pipeConfig.type === 'lower') {
        // console.log(`[CHUNK TEST] Creating lower pipe at (${absoluteX}, ${absoluteY}) from template`);
        const createdPipe = this.lowerPipeManager.createLowerPipe(absoluteX, absoluteY);
        this.combinedPipes.add(createdPipe);
        spawnedPipes.push(createdPipe);
      } else if (pipeConfig.type === 'floating') {
        // console.log(`[CHUNK TEST] Creating floating pipe at (${absoluteX}, ${absoluteY}) from template`);
        const createdPipe = this.floatingPipeManager.createFloatingPipe(absoluteX, absoluteY);
        this.combinedPipes.add(createdPipe);
        spawnedPipes.push(createdPipe);
      } else if (pipeConfig.type === 'ground') {
        // console.log(`[CHUNK TEST] Skipping ground pipe at (${absoluteX}, ${absoluteY}) from template`);
      }
    });

    template.enemies.forEach(enemyConfig => {
      const absoluteX = chunkX + enemyConfig.x;
      const absoluteY = enemyConfig.y;
  
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
      // Spawn chunk 500 pixels ahead of player
      const spawnDistance = 500;
      const chunkX = playerX + spawnDistance;
      this.currentChunkIndex++;
      this.lastSpawnedX = chunkX; // Update the last spawned position
      this.lastSpawnTime = Date.now(); // Update spawn time
      
      // Spawn the chunk at the calculated position
      const spawnResult = this.spawnChunkAtPosition(chunkX);
      if (spawnResult) {
        // Track the spawned chunk for recycling
        this.activeChunks.push({
          x: chunkX,
          pipes: spawnResult.pipes,
          enemies: spawnResult.enemies,
          templateId: this.getChunkTemplate(this.currentChunkIndex - 1)?.id || 'unknown'
        });
        return true;
      }
    }
    return false;
  }

  // Recycle chunks that are far behind the player
  recycleChunks(playerX: number, recycleDistance: number = 1000): void {
    const chunksToRemove: any[] = [];
    
    this.activeChunks.forEach(chunk => {
      if (chunk.x < playerX - recycleDistance) {
        chunksToRemove.push(chunk);
      }
    });
    
    chunksToRemove.forEach(chunk => {
      // console.log(`[CHUNK RECYCLE] Recycling chunk at X: ${chunk.x} (template: ${chunk.templateId})`);
      
      // Clean up pipes (they should be handled by individual pipe managers)
      // Clean up enemies (if we add them later)
      
      // Remove from active chunks
      const index = this.activeChunks.indexOf(chunk);
      if (index > -1) {
        this.activeChunks.splice(index, 1);
      }
    });
    
    if (chunksToRemove.length > 0) {
      // console.log(`[CHUNK RECYCLE] Recycled ${chunksToRemove.length} chunks behind player at X: ${playerX}`);
    }
  }

  // Expose combined pipes group for look-ahead detection
  public get pipes() {
    return this.combinedPipes;
  }

  // Reset chunk index for testing (temporary)
  resetChunkIndex(): void {
    this.currentChunkIndex = 0;

  }
} 