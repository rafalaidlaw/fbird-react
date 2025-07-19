import Phaser from "phaser";
import UpperPipeManager from "./UpperPipeManager";

export default class FloatingPipeManager {
  private scene: Phaser.Scene;
  public pipes: Phaser.Physics.Arcade.Group;
  public blueHitboxes: Phaser.Physics.Arcade.Group;

  // References to existing pipe managers
  private upperPipeManager: UpperPipeManager;

  // Floating pipe dimensions
  private static readonly PIPE_HEIGHT = 80; // Height of pipe

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string, upperPipeManager: UpperPipeManager, lowerPipeManager: any) {
    this.scene = scene;
    this.upperPipeManager = upperPipeManager;
    this.pipes = this.scene.physics.add.group();
    this.blueHitboxes = this.scene.physics.add.group();
  }

  // Create a floating pipe at the specified position
  createFloatingPipe(x: number, y: number, upperPipeConfig?: any, lowerPipeConfig?: any): any {
    // Create main floating pipe container
    const floatingPipeContainer = this.scene.add.container(x, y);
    
    // Create an upper pipe (purple cubes + blue platform) with optional config
    const upperPipe = this.upperPipeManager.createUpperPipe(x, y, upperPipeConfig);
    floatingPipeContainer.add(upperPipe);
    (floatingPipeContainer as any).upperPipe = upperPipe;
    
    // Add the blue hitbox to our group for easy access
    if ((upperPipe as any).blueHitbox) {
      this.blueHitboxes.add((upperPipe as any).blueHitbox);
      (floatingPipeContainer as any).blueHitbox = (upperPipe as any).blueHitbox;
    }
    
    // Set up physics for the container
    this.scene.physics.add.existing(floatingPipeContainer);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(80, FloatingPipeManager.PIPE_HEIGHT);
    
    this.pipes.add(floatingPipeContainer as any);
    
    return floatingPipeContainer;
  }

  // Generate purple cubes for the upper pipe
  public generatePurpleCubesForPipe(pipeContainer: any): void {
    if ((pipeContainer as any).upperPipe) {
      this.upperPipeManager.generatePurpleCubesForPipe((pipeContainer as any).upperPipe);
    }
  }

  // Remove pipes that are far behind the player (for recycling)
  public recyclePipes(playerX: number, recycleDistance: number = 1000): void {
    const pipesToRemove: any[] = [];
    
    this.pipes.getChildren().forEach((pipe: any) => {
      if (pipe.x < playerX - recycleDistance) {
        pipesToRemove.push(pipe);
      }
    });
    
    pipesToRemove.forEach(pipe => {
      // Remove associated hitboxes
      if ((pipe as any).blueHitbox) {
        this.blueHitboxes.remove((pipe as any).blueHitbox);
        (pipe as any).blueHitbox.destroy();
      }
      
      // Remove the pipe itself
      this.pipes.remove(pipe);
      pipe.destroy();
    });
    
    if (pipesToRemove.length > 0) {
      console.log(`[FLOATING PIPE MANAGER] Recycled ${pipesToRemove.length} pipes`);
    }
  }

  public getRightMostPipe(): number {
    let rightMostX = 0;
    this.pipes.getChildren().forEach((pipe: any) => {
      if (pipe.x > rightMostX) {
        rightMostX = pipe.x;
      }
    });
    return rightMostX;
  }
}
