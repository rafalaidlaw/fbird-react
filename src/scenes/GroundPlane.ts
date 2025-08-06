import PlayScene from './PlayScene';

export default class GroundPlane {
  private scene: PlayScene;
  private groundPlaneSegments: Phaser.GameObjects.Sprite[] = [];
  private parallaxSegments: Phaser.GameObjects.Sprite[] = [];
  private parallaxSegments2: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: PlayScene) {
    this.scene = scene;
  }

  create(): void {
    // Create segmented ground plane system
    this.createInitialGroundSegments();
    // Create parallax effect at bottom of screen
    this.createInitialParallaxSegments();
    // Create second parallax effect
    this.createInitialParallaxSegments2();
  }

  destroy(): void {
    // Destroy and clear all segments
    this.groundPlaneSegments.forEach(segment => segment.destroy());
    this.groundPlaneSegments = [];
    this.parallaxSegments.forEach(segment => segment.destroy());
    this.parallaxSegments = [];
    this.parallaxSegments2.forEach(segment => segment.destroy());
    this.parallaxSegments2 = [];
  }

  update(): void {
    // Update ground plane segments - recycle off-screen segments
    this.updateGroundSegments();
    // Update parallax segments - recycle off-screen segments
    this.updateParallaxSegments();
    // Update second parallax segments - recycle off-screen segments
    this.updateParallaxSegments2();
  }

  private createInitialGroundSegments(): void {
    // Create initial ground segments to cover the starting area
    const segmentWidth = 200; // Smaller segments for better memory management
    const groundHeight = 80;
    const groundY = 1000;
    
    // Create segments starting from left edge of world
    const startX = -200; // Start before screen
    const endX = this.scene.getConfig().width + 400; // Extend beyond screen
    
    for (let x = startX; x < endX; x += segmentWidth) {
      this.createGroundSegment(x, groundY, segmentWidth, groundHeight);
    }
  }



  private createInitialParallaxSegments(): void {
    // Create initial parallax segments at the bottom of the screen
    const segmentWidth = 200; // Smaller segments for better memory management
    const parallaxHeight = 64; // Height of the parallax effect
    const parallaxY = 1016; // Position at bottom of screen
    
    // Create segments starting from left edge of world
    const startX = -200; // Start before screen
    const endX = this.scene.getConfig().width + 400; // Extend beyond screen
    
    for (let x = startX; x < endX; x += segmentWidth) {
      this.createParallaxSegment(x, parallaxY, segmentWidth, parallaxHeight);
    }
  }

  private createInitialParallaxSegments2(): void {
    // Create initial second parallax segments
    const segmentWidth = 200; // Smaller segments for better memory management
    const parallaxHeight = 32; // Height of the parallax effect
    const parallaxY = 992; // Position -8 pixels from ground segment (ground is at Y=1000)
    
    // Create segments starting from left edge of world
    const startX = -200; // Start before screen
    const endX = this.scene.getConfig().width + 400; // Extend beyond screen
    
    for (let x = startX; x < endX; x += segmentWidth) {
      this.createParallaxSegment2(x, parallaxY, segmentWidth, parallaxHeight);
    }
  }

  private createGroundSegment(x: number, y: number, width: number, height: number): Phaser.GameObjects.Sprite {
    const groundSegment = this.scene.add.sprite(x, y, 'ground00');
    groundSegment.setDisplaySize(width, height);
    groundSegment.setOrigin(0);
    
    // Add physics to the ground segment
    this.scene.physics.add.existing(groundSegment);
    (groundSegment.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (groundSegment.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    // Add collider with player
    this.scene.physics.add.collider(
      this.scene.player.sprite,
      groundSegment,
      () => {
        // Player hit the ground - stop Y movement but preserve X velocity
        if (this.scene.player && this.scene.player.sprite && this.scene.player.sprite.body) {
          const body = this.scene.player.sprite.body as Phaser.Physics.Arcade.Body;
          // Only stop Y velocity, preserve X velocity for chunk-based movement
          body.setVelocityY(0);
          // Switch to run animation when touching ground
          this.scene.player.sprite.anims.play("kilboy_run_anim", true);
        }
      },
      undefined,
      this.scene
    );
    
    this.groundPlaneSegments.push(groundSegment);
    return groundSegment;
  }



  private createParallaxSegment(x: number, y: number, width: number, height: number): Phaser.GameObjects.Sprite {
    const parallaxSegment = this.scene.add.sprite(x, y, 'ground01');
    parallaxSegment.setDisplaySize(width, height);
    parallaxSegment.setOrigin( 0);
    
    // Set z-index to layer in front of ground plane
    parallaxSegment.setDepth(10); // Higher z-index to appear in front
    
    // Add physics to enable velocity
    this.scene.physics.add.existing(parallaxSegment);
    (parallaxSegment.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (parallaxSegment.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    // Set constant negative velocity for parallax effect
    (parallaxSegment.body as Phaser.Physics.Arcade.Body).setVelocityX(-20); // Negative velocity to move left (slower)
    
    // Debug: Log the velocity to ensure it's being set
    console.log('Created parallax segment with velocity:', (parallaxSegment.body as Phaser.Physics.Arcade.Body).velocity.x);
    
    this.parallaxSegments.push(parallaxSegment);
    return parallaxSegment;
  }

  private createParallaxSegment2(x: number, y: number, width: number, height: number): Phaser.GameObjects.Sprite {
    const parallaxSegment = this.scene.add.sprite(x, y, 'ground02');
    parallaxSegment.setDisplaySize(width, height);
    parallaxSegment.setOrigin(0);
    
    // Set z-index to layer in front of ground plane
    parallaxSegment.setDepth(8); // Higher z-index to appear in front
    
    // Add physics to enable velocity
    this.scene.physics.add.existing(parallaxSegment);
    (parallaxSegment.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (parallaxSegment.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    // Set constant positive velocity for parallax effect
    (parallaxSegment.body as Phaser.Physics.Arcade.Body).setVelocityX(10); // Positive velocity to move right
    
    this.parallaxSegments2.push(parallaxSegment);
    return parallaxSegment;
  }

  private updateGroundSegments(): void {
    if (!this.scene.player || !this.scene.player.sprite) return;
    
    const playerX = this.scene.player.sprite.x;
    const screenLeft = playerX - this.scene.getConfig().width / 2;
    const screenRight = playerX + this.scene.getConfig().width / 2;
    const segmentWidth = 200;
    
    // Remove segments that are too far to the left (off-screen)
    this.groundPlaneSegments = this.groundPlaneSegments.filter(segment => {
      const segmentRight = segment.x + segmentWidth;
      if (segmentRight < screenLeft - 100) { // 100px buffer
        // Destroy the segment
        if (segment.body && segment.body instanceof Phaser.Physics.Arcade.Body) {
          segment.body.destroy();
        }
        segment.destroy();
        return false; // Remove from array
      }
      return true; // Keep in array
    });
    
    // Add new segments to the right if needed
    const rightmostSegment = this.groundPlaneSegments.length > 0 
      ? Math.max(...this.groundPlaneSegments.map(s => s.x))
      : screenRight;
    
    if (rightmostSegment < screenRight + 200) { // 200px buffer
      const newSegmentX = rightmostSegment + segmentWidth;
      this.createGroundSegment(newSegmentX, 1000, segmentWidth, 80);
    }
  }



  private updateParallaxSegments(): void {
    if (!this.scene.player || !this.scene.player.sprite) return;
    
    const playerX = this.scene.player.sprite.x;
    const playerY = this.scene.player.sprite.y;
    const screenLeft = playerX - this.scene.getConfig().width / 2;
    const screenRight = playerX + this.scene.getConfig().width / 2;
    const segmentWidth = 200;
    const parallaxHeight = 64;
    
    // Calculate dynamic parallax Y based on camera Y position
    // When camera is at Y=560, parallax should be at Y=1016
    // For every 1 pixel camera moves up, parallax moves down by 0.5 pixels
    const baseCameraY = 560;
    const baseParallaxY = 1016;
    const cameraY = this.scene.cameras.main.scrollY;
    const parallaxY = baseParallaxY + (baseCameraY - cameraY) * 0.5;
    
    // Update Y position of all existing parallax segments
    this.parallaxSegments.forEach(segment => {
      segment.setY(parallaxY);
    });
    
    // Remove segments that are too far to the left (off-screen)
    this.parallaxSegments = this.parallaxSegments.filter(segment => {
      const segmentRight = segment.x + segmentWidth;
      if (segmentRight < screenLeft - 100) { // 100px buffer
        segment.destroy();
        return false; // Remove from array
      }
      return true; // Keep in array
    });
    
    // Add new segments to the right if needed
    const rightmostSegment = this.parallaxSegments.length > 0 
      ? Math.max(...this.parallaxSegments.map(s => s.x))
      : screenRight;
    
    if (rightmostSegment < screenRight + 200) { // 200px buffer
      const newSegmentX = rightmostSegment + segmentWidth;
      this.createParallaxSegment(newSegmentX, parallaxY, segmentWidth, parallaxHeight);
    }
  }

  private updateParallaxSegments2(): void {
    if (!this.scene.player || !this.scene.player.sprite) return;
    
    const playerX = this.scene.player.sprite.x;
    const screenLeft = playerX - this.scene.getConfig().width / 2;
    const screenRight = playerX + this.scene.getConfig().width / 2;
    const segmentWidth = 200;
    const parallaxHeight = 32;
    const parallaxY = 992;
    
    // Remove segments that are too far to the left (off-screen)
    this.parallaxSegments2 = this.parallaxSegments2.filter(segment => {
      const segmentRight = segment.x + segmentWidth;
      if (segmentRight < screenLeft - 100) { // 100px buffer
        segment.destroy();
        return false; // Remove from array
      }
      return true; // Keep in array
    });
    
    // Add new segments to the right if needed
    const rightmostSegment = this.parallaxSegments2.length > 0 
      ? Math.max(...this.parallaxSegments2.map(s => s.x))
      : screenRight;
    
    if (rightmostSegment < screenRight + 200) { // 200px buffer
      const newSegmentX = rightmostSegment + segmentWidth;
      this.createParallaxSegment2(newSegmentX, parallaxY, segmentWidth, parallaxHeight);
    }
  }
} 