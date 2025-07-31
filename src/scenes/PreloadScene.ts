import Phaser from "phaser";

class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    this.load.image("sky-bg", "assets/sky.png");
    this.load.image("kilboy", "assets/kilboy.png");
    this.load.image("kilboy2", "assets/kilboy_swing.png");
    this.load.image("kilboy_run1", "assets/kilboy_run1.png");
    this.load.image("kilboy_run2", "assets/kilboy_run2.png");
    this.load.image("kilboy_run3", "assets/kilboy_run3.png");
    this.load.image("kilboy_run4", "assets/kilboy_run4.png");
    this.load.image("kilboy_run5", "assets/kilboy_run5.png");
    this.load.image("kilboy_run6", "assets/kilboy_run6.png");
    this.load.image("kilboy_run7", "assets/kilboy_run7.png");
    this.load.image("kilboy_run8", "assets/kilboy_run8.png");
    this.load.image("kilboy_run9", "assets/kilboy_run9.png");
    this.load.image("kilboy_run10", "assets/kilboy_run10.png");
    this.load.image("kilboy_hurt", "assets/kilboy_hurt.png");
    this.load.image("kilboy_swing_anim1", "assets/kilboy_swing_anim1.png");
    this.load.image("kilboy_swing_anim2", "assets/kilboy_swing_anim2.png");
    this.load.image("kilboy_swing_anim3", "assets/kilboy_swing_anim3.png");
    this.load.image("kilboy_swing_ledgeGrab", "assets/kilboy_swing_ledgeGrab.png");
    //     this.load.spritesheet("kilboy", "assets/kilboy.png", {
    //       frameWidth: 63,
    //       frameHeight: 66,
    //     });
    this.load.image("pipe", "assets/pipe.png");
    this.load.image("pause", "assets/pause.png");
    this.load.image("back", "assets/back.png");
    this.load.image("health-face", "assets/health-face.png");
    this.load.image("dead-face", "assets/dead-face.png");
    this.load.image("enemy_met", "assets/met_enemy.png"); // Preload enemy texture
    this.load.image('bush', 'assets/bush-16x16.png');
    
    // Preload the custom font using a custom loader
    this.load.on('complete', () => {
      // Font should be loaded by CSS @font-face, but we can ensure it's ready
      document.fonts.ready.then(() => {
        console.log('Fonts loaded in PreloadScene');
      });
    });
  }

  create(): void {
    this.scene.start("MenuScene");
  }
}

export default PreloadScene; 