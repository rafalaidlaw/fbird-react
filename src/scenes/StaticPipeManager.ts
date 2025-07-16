import Phaser from "phaser";
import UpperPipeManager from "./UpperPipeManager";
import LowerPipeManager from "./LowerPipeManager";

export default class StaticPipeManager {
  private scene: Phaser.Scene;
  private config: any;
  private difficulties: any;
  private currentDifficulty: string;
  
  // Separate managers for upper and lower pipes
  private upperPipeManager: UpperPipeManager;
  private lowerPipeManager: LowerPipeManager;
  
  // Combined pipes group for look-ahead detection
  private combinedPipes: Phaser.Physics.Arcade.Group;

  // Expose groups from both managers for backward compatibility
  public get pipes() { 
    // Return the combined pipes group that includes both upper and lower pipes
    // This is needed for the look-ahead hitbox detection in PlayScene
    return this.combinedPipes;
  }
  public get greenHitboxes() { return this.lowerPipeManager.greenHitboxes; }
  public get blueHitboxes() { return this.upperPipeManager.blueHitboxes; }
  public get purpleHitboxes() { return this.upperPipeManager.purpleHitboxes; }
  public get maroonHitboxes() { return this.lowerPipeManager.maroonHitboxes; }
  public get fallingMaroonHitboxes() { return this.lowerPipeManager.fallingMaroonHitboxes; }
  public get fallingPurpleHitboxes() { return this.upperPipeManager.fallingPurpleHitboxes; }

  // Add these constants for column logic (same as original PipeManager)
  private static readonly PIPE_WIDTH = Math.ceil(78 / 16) * 16; // Always a multiple of 16
  // Width of each hitbox (purple/maroon cube)
  private static readonly hitboxWidth = 16;
  // Dynamically calculated number of columns
  public static get numColumns() {
    return Math.floor(StaticPipeManager.PIPE_WIDTH / StaticPipeManager.hitboxWidth);
  }
  
  // Configurable fade duration for purple cubes (in milliseconds)
  public static readonly PURPLE_CUBE_FADE_DURATION = 1000;
  
  // Configurable fade duration for maroon cubes (in milliseconds)
  public static readonly MAROON_CUBE_FADE_DURATION = 1000;
  
  private static readonly BLUE_HITBOX_HEIGHT = 32; // Height of blue hitbox area
  
  // Configurable container position - controls where the pipe container is positioned
  public static readonly CONTAINER_Y_POSITION = -800; // Y position for pipe container (sky level)

  // Random offset for pipe height and position
  private static readonly PIPE_HEIGHT_OFFSET = Math.floor(Math.random() * 801) - 400; // -400 to 400

  // Base pipe height and position
  private static readonly BASE_PIPE_HEIGHT = 800;
  private static readonly BASE_PIPE_Y_POSITION = 0;

  // Final randomized values
  public static readonly PIPE_HEIGHT = StaticPipeManager.BASE_PIPE_HEIGHT + StaticPipeManager.PIPE_HEIGHT_OFFSET;
  public static readonly PIPE_Y_POSITION = StaticPipeManager.BASE_PIPE_Y_POSITION + StaticPipeManager.PIPE_HEIGHT_OFFSET;

  // Centralized Y placement methods
  public static getUpperPipeY(): number {
    return StaticPipeManager.PIPE_Y_POSITION;
  }

  public static getLowerPipeY(): number {
    return StaticPipeManager.PIPE_Y_POSITION + 200; // Default vertical distance
  }

  public static getGroundY(): number {
    return 1000; // Ground plane Y position
  }

  public static getSkyY(): number {
    return -1000; // Sky plane Y position
  }

  public static getUpperPipeHeight(): number {
    return StaticPipeManager.PIPE_HEIGHT;
  }

  public static getLowerPipeHeight(pipeY: number): number {
    return StaticPipeManager.getGroundY() - pipeY;
  }

  public static getUpperPipeHeightFromPosition(pipeY: number): number {
    return pipeY - StaticPipeManager.getSkyY();
  }

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string) {
    this.scene = scene;
    this.config = config;
    this.difficulties = difficulties;
    this.currentDifficulty = currentDifficulty;
    
    // Initialize separate managers
    this.upperPipeManager = new UpperPipeManager(scene, config, difficulties, currentDifficulty);
    this.lowerPipeManager = new LowerPipeManager(scene, config, difficulties, currentDifficulty);
    
    // Initialize combined pipes group
    this.combinedPipes = this.scene.physics.add.group();
  }

  // Create a single pipe pair at a specific position (for chunk-based system)
  // Create an upper pipe that extends to the sky plane
  createUpperPipe(x: number, y: number): any {
    const upperPipe = this.upperPipeManager.createUpperPipe(x, y);
    // Add to combined pipes group for look-ahead detection
    this.combinedPipes.add(upperPipe);
    return upperPipe;
  }

  // Create a lower pipe that extends to the ground plane
  createLowerPipe(x: number, y: number): any {
    const lowerPipe = this.lowerPipeManager.createLowerPipe(x, y);
    // Add to combined pipes group for look-ahead detection
    this.combinedPipes.add(lowerPipe);
    return lowerPipe;
  }

  // Legacy method - kept for backward compatibility
  createPipePair(x: number, y: number, pipeVerticalDistance: number = 200): { upperPipe: any, lowerPipe: any } {
    const blueWidth = StaticPipeManager.PIPE_WIDTH;
    const numColumns = StaticPipeManager.numColumns;
    const hitboxWidth = StaticPipeManager.hitboxWidth;
    

    
    // Create upper pipe as a container with orange rectangle - extend to sky plane
    const skyY = StaticPipeManager.getSkyY(); // Sky plane Y position
    const upperPipeHeight = StaticPipeManager.getUpperPipeHeightFromPosition(y); // Height needed to reach sky plane from pipe position
    const upperPipeContainer = this.scene.add.container(x, y);
    // Add orange rectangle to container - extend to sky plane
    const upperOrangeRect = this.scene.add.rectangle(0, 0, blueWidth, upperPipeHeight, 0xff8c00, 0); // alpha 0
    upperOrangeRect.setOrigin(0, 0); // Change to top-left origin so it extends downward
    upperOrangeRect.setPosition(0, -upperPipeHeight); // Position it to extend from pipe position down to sky
    upperPipeContainer.add(upperOrangeRect);
    // Add blue rectangle as child of the container
    const blueRect = this.scene.add.rectangle(0, 0, blueWidth, 32, 0x0000ff, 0);
    blueRect.setOrigin(0, 0);
    upperPipeContainer.add(blueRect);
    // Create separate hitbox for blue rectangle (positioned at bottom of purple cube column)
    const purpleColumnHeight = 23 * StaticPipeManager.hitboxWidth; // 23 rows × 16px each = 368px
    const purpleColumnBottom = -288 + purpleColumnHeight; // -288 + 368 = 80
    const blueHitbox = this.scene.add.rectangle(x - 2, y + purpleColumnBottom, blueWidth, 16, 0x00ffff, 1);
    blueHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(blueHitbox);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).pushable = false;
    this.blueHitboxes.add(blueHitbox);
    // Initialize empty purple hitboxes array (will be populated on-demand)
    (upperPipeContainer as any).purpleHitboxes = [];
    
    // Create placeholder orange rectangle covering the purple cube area
    const purpleAreaWidth = blueWidth; // Same as blue hitbox width
    const purpleAreaHeight = upperPipeHeight - 96; // Dynamic height minus blue hitbox area
    const purpleAreaX = -2; // Same X offset as purple cubes
    const purpleAreaY = -upperPipeHeight + 96; // Start from top of pipe, below blue hitbox area
    const placeholderRect = this.scene.add.rectangle(purpleAreaX, purpleAreaY, purpleAreaWidth, purpleAreaHeight, 0xff8c00, 1);
    placeholderRect.setOrigin(0, 0);
    upperPipeContainer.add(placeholderRect);
    (upperPipeContainer as any).placeholderRect = placeholderRect;
    this.scene.physics.add.existing(upperPipeContainer);
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    // Calculate total height: pipe extends from sky plane (Y=-1000) to pipe position (Y=y)
    // Total span: from -upperPipeHeight to +96 (blue hitbox)
    const totalContainerHeight = upperPipeHeight + 96; // pipe height + blue hitbox area
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, totalContainerHeight);
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, -upperPipeHeight);
    this.pipes.add(upperPipeContainer as any);
    
    // Create lower pipe as a container with orange rectangle - extend to ground
    const groundY = StaticPipeManager.getGroundY(); // Ground plane Y position
    const lowerPipeY = y + pipeVerticalDistance; // Top of the lower pipe
    const lowerPipeHeight = StaticPipeManager.getLowerPipeHeight(lowerPipeY); // Height needed to reach ground
    
    const lowerPipeContainer = this.scene.add.container(x, lowerPipeY);
    const orangeRect = this.scene.add.rectangle(0, 0, blueWidth, lowerPipeHeight, 0xff8c00);
    orangeRect.setOrigin(0, 0);
    orangeRect.setName('orangeRect'); // Give it a name for easy identification
    lowerPipeContainer.add(orangeRect);
    const redRect = this.scene.add.rectangle(0, 0, blueWidth, 16, 0xff0000, 0);
    redRect.setOrigin(0, 0);
    lowerPipeContainer.add(redRect);
    // Initialize empty maroon hitboxes array for lower pipe (will be populated on-demand)
    (lowerPipeContainer as any).maroonHitboxes = [];
    this.scene.physics.add.existing(lowerPipeContainer);
    (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, lowerPipeHeight);
    (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, 16);
    // Create separate hitbox for red rectangle
    const redHitbox = this.scene.add.rectangle(x, lowerPipeY, blueWidth, 16, 0x00ff00, 0.5);
    redHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(redHitbox);
    (redHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.pipes.add(lowerPipeContainer as any);
    this.greenHitboxes.add(redHitbox);
    (lowerPipeContainer as any).redHitbox = redHitbox;
    (upperPipeContainer as any).blueHitbox = blueHitbox;
    (upperPipeContainer as any).blueRect = blueRect;
    (upperPipeContainer as any).purpleHitbox = this.purpleHitboxes;
    
    // Register all pipes and hitboxes with hitStop if available
    if ((this.scene as any).hitStop) {
      (this.scene as any).hitStop.register(upperPipeContainer);
      (this.scene as any).hitStop.register(lowerPipeContainer);
      (this.scene as any).hitStop.register(blueHitbox);
      (this.scene as any).hitStop.register(redHitbox);
    }
    

    
    return { upperPipe: upperPipeContainer, lowerPipe: lowerPipeContainer };
  }

  // Create a ground-based lower pipe that comes up from the ground plane
  createGroundPipe(x: number, height: number = 200): any {
    const groundPipe = this.lowerPipeManager.createGroundPipe(x, height);
    // Add to combined pipes group for look-ahead detection
    this.combinedPipes.add(groundPipe);
    return groundPipe;
  }

  // Generate purple cubes for a specific pipe (delegate to upper pipe manager)
  public generatePurpleCubesForPipe(pipeContainer: any): void {
    this.upperPipeManager.generatePurpleCubesForPipe(pipeContainer);
  }

  // Generate maroon cubes for a specific lower pipe (delegate to lower pipe manager)
  public generateMaroonCubesForPipe(pipeContainer: any): void {
    this.lowerPipeManager.generateMaroonCubesForPipe(pipeContainer);
  }

  // Remove pipes that are far behind the player (for chunk recycling)
  public recyclePipes(playerX: number, recycleDistance: number = 1000): void {
    // Get pipes to remove from both managers
    const upperPipesToRemove: any[] = [];
    const lowerPipesToRemove: any[] = [];
    
    this.upperPipeManager.pipes.getChildren().forEach((pipe: any) => {
      if (pipe.x < playerX - recycleDistance) {
        upperPipesToRemove.push(pipe);
      }
    });
    
    this.lowerPipeManager.pipes.getChildren().forEach((pipe: any) => {
      if (pipe.x < playerX - recycleDistance) {
        lowerPipesToRemove.push(pipe);
      }
    });
    
    // Remove from combined pipes group
    [...upperPipesToRemove, ...lowerPipesToRemove].forEach(pipe => {
      this.combinedPipes.remove(pipe);
    });
    
    // Delegate to individual managers for cleanup
    this.upperPipeManager.recyclePipes(playerX, recycleDistance);
    this.lowerPipeManager.recyclePipes(playerX, recycleDistance);
  }

  // Get the rightmost pipe position (for determining where to place new pipes)
  public getRightMostPipe(): number {
    const upperRightMost = this.upperPipeManager.getRightMostPipe();
    const lowerRightMost = this.lowerPipeManager.getRightMostPipe();
    return Math.max(upperRightMost, lowerRightMost);
  }

  // Set current difficulty
  public setCurrentDifficulty(currentDifficulty: string) {
    this.currentDifficulty = currentDifficulty;
    this.upperPipeManager.setCurrentDifficulty(currentDifficulty);
    this.lowerPipeManager.setCurrentDifficulty(currentDifficulty);
  }

  // Stop all blue box animations (delegate to upper pipe manager)
  public stopAllBlueBoxAnimations(): void {
    this.upperPipeManager.stopAllBlueBoxAnimations();
  }

  /**
   * Makes all maroon hitboxes above the given hitbox in the same column fall and fade out.
   * @param hitHitbox The hit maroon hitbox (Phaser.GameObjects.Rectangle)
   * @param isGameOver Whether the game is over
   * @param isDashTriggered Whether this was triggered by dash
   */
  public triggerFallForHitboxesAbove(hitHitbox: Phaser.GameObjects.Rectangle, isGameOver: boolean, isDashTriggered: boolean = false) {
    this.lowerPipeManager.triggerFallForHitboxesAbove(hitHitbox, isGameOver, isDashTriggered);
   }

  /**
   * Makes all purple hitboxes below the given hitbox in the same column fall and fade out.
   * @param hitHitbox The hit purple hitbox (Phaser.GameObjects.Rectangle)
   * @param isGameOver Whether the game is over (affects blue box animation)
   * @param isDashTriggered Whether this was triggered by dash (affects blue box rotation)
   */
  public triggerFallForHitboxesBelow(hitHitbox: Phaser.GameObjects.Rectangle, isGameOver: boolean, isDashTriggered: boolean = false) {
    this.upperPipeManager.triggerFallForHitboxesBelow(hitHitbox, isGameOver, isDashTriggered);
  }
} 