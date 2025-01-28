import Phaser from "phaser";

import PlayScene from "./scenes/PlayScene";

const WIDTH = 800;
const HEIGHT = 600;
const KILBOY_POSITION = { x: (WIDTH * 1) / 10, y: HEIGHT / 2 };
const SHARED_CONFIG = {
  width: WIDTH,
  height: HEIGHT,
  startPosition: KILBOY_POSITION,
};
const config = {
  //WebGL web graphics library
  type: Phaser.AUTO,
  ...SHARED_CONFIG,
  physics: {
    // Arcade physics plugin manages physics simulation
    default: "arcade",
    arcade: {
      // gravity: { y: 400 },
      debug: true,
    },
  },
  scene: [new PlayScene(SHARED_CONFIG)],
};
new Phaser.Game(config);
