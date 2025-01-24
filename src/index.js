import Phaser from "phaser";

const config = {
  //WebGL web graphics library
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    // Arcade physics plugin manages physics simulation
    default: "arcade",
    arcade: {
      gravity: { y: 200 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update,
  },
};
//loading assets, such as images, music, animations
function preload() {
  // 'this' context - scene
  //contains functions and properties we can use
  this.load.image("sky-bg", "assets/sky.png");
  this.load.image("kilroy", "assets/kilroy.png");
}

let kilroy = null;
let totalDelta = null;

function create() {
  // x
  // y
  // key of the image
  this.add.image(0, 0, "sky-bg").setOrigin(0);
  kilroy = this.physics.add
    .sprite(config.width * 0.1, config.height / 2, "kilroy")
    .setOrigin(0);
  //kilroy.body.gravity.y = 200;
}

//t0 = 0px/s
//t1

// 60 fps
function update(time, delta) {
  totalDelta += delta;

  if (totalDelta >= 1000) {
    totalDelta = 0;
  }

  console.log(totalDelta);
}

new Phaser.Game(config);
