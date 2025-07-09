import Phaser from "phaser";

class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    this.load.image("sky-bg", "assets/sky.png");
    this.load.image("kilboy", "assets/kilboy.png");
    this.load.image("kilboy2", "assets/kilboy_swing.png");
    this.load.image("kilboy_run", "assets/kilboy_run.png");
    this.load.image("kilboy_hurt", "assets/kilboy_hurt.png");
    this.load.image("kilboy_swing_anim1", "assets/kilboy_swing_anim1.png");
    this.load.image("kilboy_swing_anim2", "assets/kilboy_swing_anim2.png");
    this.load.image("kilboy_swing_anim3", "assets/kilboy_swing_anim3.png");
    //     this.load.spritesheet("kilboy", "assets/kilboy.png", {
    //       frameWidth: 63,
    //       frameHeight: 66,
    //     });
    this.load.image("pipe", "assets/pipe.png");
    this.load.image("pause", "assets/pause.png");
    this.load.image("back", "assets/back.png");
    this.load.image("health-face", "assets/health-face.png");
    this.load.image("dead-face", "assets/dead-face.png");
  }

  create(): void {
    this.scene.start("MenuScene");
  }
}

export default PreloadScene; 