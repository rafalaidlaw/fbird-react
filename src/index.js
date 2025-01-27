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
      // gravity: { y: 400 },
      debug: true,
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
  this.load.image("pipe", "assets/pipe.png");
}

const flapVELOCITY = 300;

const initialKilroyPosition = { x: config.width * 0.1, y: config.height / 2 };

const VELOCITY = 200;

let kilroy = null;
let upperPipe = null;
let lowerPipe = null;
let totalDelta = null;
let pipeVerticalDistanceRange = [150, 250];
let pipeVerticalDistance = Phaser.Math.Between(...pipeVerticalDistanceRange);
function create() {
  this.add.image(0, 0, "sky-bg").setOrigin(0);
  kilroy = this.physics.add
    .sprite(initialKilroyPosition.x, initialKilroyPosition.y, "kilroy")
    .setOrigin(0);
  kilroy.body.gravity.y = 400;

  upperPipe = this.physics.add.sprite(400, 200, "pipe").setOrigin(0, 1);
  lowerPipe = this.physics.add
    .sprite(400, upperPipe.y + pipeVerticalDistance, "pipe")
    .setOrigin(0);

  this.input.on("pointerdown", flap);

  this.input.keyboard.on("keydown-SPACE", flap);
}

//if kilroy position x is same or larger than width of canvas go back left
//if kilroy smaller than 0 than move back right

function update(time, delta) {
  if (kilroy.y <= 0 - kilroy.height || kilroy.y >= config.height) {
    restartKilroyPosition();
    // alert("You have lost");
  }
}

function restartKilroyPosition() {
  kilroy.x = initialKilroyPosition.x;
  kilroy.y = initialKilroyPosition.y;
  kilroy.body.velocity.y = 0;
  kilroy.gravity = 0;
}

function flap() {
  kilroy.body.velocity.y = -flapVELOCITY;
}

new Phaser.Game(config);
