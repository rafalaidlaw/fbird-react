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
      this.pausedObjects.forEach(entry => {
        const body = (entry.obj.body as Phaser.Physics.Arcade.Body | undefined);
        // Resume physics
        if (body && entry.velocity && entry.gravity) {
          body.setVelocity(entry.velocity.x, entry.velocity.y);
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
      if (onEnd) onEnd();
      // Always trigger dash at the end of hitstop if player exists and has startDash
      const player = (this.scene as any).player;
      if (player && typeof player.startDash === 'function') {
        console.log('[HitStop] Calling player.startDash() from HitStop');
        player.startDash();
      }
    });
  }
} 