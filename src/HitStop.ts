import Phaser from 'phaser';

interface PausedObject {
  obj: Phaser.GameObjects.GameObject;
  velocity?: Phaser.Math.Vector2;
  gravity?: Phaser.Math.Vector2;
  moves?: boolean;
}

export default class HitStop {
  private scene: Phaser.Scene;
  private pausedObjects: PausedObject[] = [];
  private activeHitstops = 0;
  private pausedTimers: Phaser.Time.TimerEvent[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Register an object to be paused during hitstop
  register(obj: Phaser.GameObjects.GameObject) {
    this.pausedObjects.push({ obj });
  }

  // Unregister an object (optional, for cleanup)
  unregister(obj: Phaser.GameObjects.GameObject) {
    this.pausedObjects = this.pausedObjects.filter(entry => entry.obj !== obj);
  }

  // Trigger hitstop for a duration in ms
  trigger(duration: number, onEnd?: () => void) {
    this.activeHitstops++;
    
    // Only pause objects if this is the first hitstop
    if (this.activeHitstops === 1) {

    // Pause the player's timers if they exist
    const player = (this.scene as any).player;
    if (player) {
      if (player.hitStopCheckTimer && !player.hitStopCheckTimer.paused) {
        player.hitStopCheckTimer.paused = true;
        this.pausedTimers.push(player.hitStopCheckTimer);
      }
      if (player.swingFrameCheckTimer && !player.swingFrameCheckTimer.paused) {
        player.swingFrameCheckTimer.paused = true;
        this.pausedTimers.push(player.swingFrameCheckTimer);
      }
    }

    this.pausedObjects.forEach(entry => {
      const body = (entry.obj.body as Phaser.Physics.Arcade.Body | undefined);
      // Pause physics
      if (body) {
        entry.velocity = body.velocity.clone();
        entry.gravity = body.gravity.clone();
        entry.moves = body.moves;
        
        const player = (this.scene as any).player;
        const isPlayerSprite = player && entry.obj === player.sprite;
        

        
        body.setVelocity(0, 0);
        body.setGravity(0, 0);
        body.moves = false;
      }
      // Pause animation if it's a sprite with anims
      if (entry.obj instanceof Phaser.GameObjects.Sprite && entry.obj.anims.isPlaying) {
        (entry as any).wasPlaying = true;
        entry.obj.anims.pause();
      } else {
        (entry as any).wasPlaying = false;
      }
    });

    }

    this.scene.time.delayedCall(duration, () => {
      this.activeHitstops--;
      
      // Only resume objects if this was the last hitstop
      if (this.activeHitstops === 0) {
        this.pausedObjects.forEach(entry => {
          const body = (entry.obj.body as Phaser.Physics.Arcade.Body | undefined);
          // Resume physics
          if (body && entry.velocity && entry.gravity) {
            // For chunk-based system: preserve constant rightward velocity for player
            const player = (this.scene as any).player;
            const isPlayerSprite = player && entry.obj === player.sprite;
            
            if (isPlayerSprite) {
              // Restore Y velocity but maintain constant X velocity for chunk-based movement
              // Get the player X velocity from PlayScene
              const playScene = this.scene as any;
              const playerXVelocity = playScene.PLAYER_X_VELOCITY || 100; // Default to 100 if not found
              body.setVelocity(playerXVelocity, entry.velocity.y);
            } else {
              // For non-player objects, restore original velocity
              body.setVelocity(entry.velocity.x, entry.velocity.y);
            }
            body.setGravity(entry.gravity.x, entry.gravity.y);
            body.moves = entry.moves ?? true;
          }
          // Resume animation if it was playing
          if (entry.obj instanceof Phaser.GameObjects.Sprite && (entry as any).wasPlaying) {
            entry.obj.anims.resume();
          }
        });
        
        // Resume any paused timers
        this.pausedTimers.forEach(timer => {
          timer.paused = false;
        });
        this.pausedTimers = [];
      }
      
      // Force-set player X velocity one more time to ensure it's restored
      const player = (this.scene as any).player;
      if (player && player.sprite && player.sprite.body) {
        const playScene = this.scene as any;
        const playerXVelocity = playScene.PLAYER_X_VELOCITY || 100;
        (player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(playerXVelocity);
      }
      
      if (onEnd) onEnd();
      // Always trigger dash at the end of hitstop if player exists and has startDash
      if (player && typeof player.startDash === 'function') {
        player.startDash();
      }
    });
  }
} 