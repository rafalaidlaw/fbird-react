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
  private isActive = false;
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
    if (this.isActive) return;
    this.isActive = true;

    // Pause the player's attack hitbox timers if they exist
    const player = (this.scene as any).player;
    if (player) {
      if (player.attackHitboxTimer && !player.attackHitboxTimer.paused) {
        player.attackHitboxTimer.paused = true;
        this.pausedTimers.push(player.attackHitboxTimer);
      }
      if (player.attackCompletionTimer && !player.attackCompletionTimer.paused) {
        player.attackCompletionTimer.paused = true;
        this.pausedTimers.push(player.attackCompletionTimer);
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
        
        console.log('[HitStop] Pausing object:', entry.obj);
        console.log('[HitStop] Is player sprite:', isPlayerSprite);
        console.log('[HitStop] Saving velocity:', entry.velocity.x, entry.velocity.y);
        
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

    this.scene.time.delayedCall(duration, () => {
      console.log('[HitStop] HitStop ending, restoring velocities...');
      
      this.pausedObjects.forEach(entry => {
        const body = (entry.obj.body as Phaser.Physics.Arcade.Body | undefined);
        // Resume physics
        if (body && entry.velocity && entry.gravity) {
          // For chunk-based system: preserve constant rightward velocity for player
          const player = (this.scene as any).player;
          const isPlayerSprite = player && entry.obj === player.sprite;
          
          console.log('[HitStop] Restoring velocity for object:', entry.obj);
          console.log('[HitStop] Is player sprite:', isPlayerSprite);
          console.log('[HitStop] Original velocity:', entry.velocity.x, entry.velocity.y);
          
          if (isPlayerSprite) {
            // Restore Y velocity but maintain constant X velocity for chunk-based movement
            // Get the player X velocity from PlayScene
            const playScene = this.scene as any;
            const playerXVelocity = playScene.PLAYER_X_VELOCITY || 100; // Default to 100 if not found
            console.log('[HitStop] Setting player velocity to (', playerXVelocity, ',', entry.velocity.y, ')');
            body.setVelocity(playerXVelocity, entry.velocity.y);
            
            // Double-check that the velocity was set correctly
            console.log('[HitStop] Player velocity after setting:', body.velocity.x, body.velocity.y);
          } else {
            // For non-player objects, restore original velocity
            console.log('[HitStop] Setting non-player velocity to (', entry.velocity.x, ',', entry.velocity.y, ')');
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
      this.isActive = false;
      
      // Force-set player X velocity one more time to ensure it's restored
      const player = (this.scene as any).player;
      if (player && player.sprite && player.sprite.body) {
        const playScene = this.scene as any;
        const playerXVelocity = playScene.PLAYER_X_VELOCITY || 100;
        console.log('[HitStop] Final check - forcing player X velocity to:', playerXVelocity);
        (player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(playerXVelocity);
        console.log('[HitStop] Final player velocity:', (player.sprite.body as Phaser.Physics.Arcade.Body).velocity.x, (player.sprite.body as Phaser.Physics.Arcade.Body).velocity.y);
      }
      
      if (onEnd) onEnd();
      // Always trigger dash at the end of hitstop if player exists and has startDash
      if (player && typeof player.startDash === 'function') {
        console.log('[HitStop] Calling player.startDash() from HitStop');
        player.startDash();
      }
    });
  }
} 