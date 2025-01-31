import Phaser from "phaser";

class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }
  preload() {
    this.load.image("sky-bg", "assets/sky.png");
    this.load.image("kilboy", "assets/kilboy.png");
    this.load.image("kilboy2", "assets/kilboy_swing.png");
    //     this.load.spritesheet("kilboy", "assets/kilboy.png", {
    //       frameWidth: 63,
    //       frameHeight: 66,
    //     });
    this.load.image("pipe", "assets/pipe.png");
    this.load.image("pause", "assets/pause.png");
    this.load.image("back", "assets/back.png");
  }

  create() {
    this.scene.start("MenuScene");
  }
}

export default PreloadScene;
