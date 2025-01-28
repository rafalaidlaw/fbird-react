import Phaser from "phaser";

class PlayScene extends Phaser.Scene {
  constructor(config) {
    super("PlayScene");
    this.config = config;

    this.kilroy = null;
  }

  preload() {
    this.load.image("sky-bg", "assets/sky.png");
    this.load.image("kilroy", "assets/kilroy.png");
  }

  create() {
    this.add.image(0, 0, "sky-bg").setOrigin(0);
    this.kilroy = this.physics.add
      .sprite(
        this.config.startPosition.x,
        this.config.startPosition.y,
        "kilroy"
      )
      .setOrigin(0);
    this.kilroy.body.gravity.y = 400;
  }

  update() {}
}

export default PlayScene;
