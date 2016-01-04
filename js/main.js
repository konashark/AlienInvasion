// Alien Invasion!
// Copyright (c) 2016 by Jeffrey Sprague
// See the accompanying book for thorough, step-by-step explanation of how this application works.
// This source code is intended for educational purposes for use by owners of the accompanying book. Derivitive works
// that are significantly modified may be used for any reasonable purpose. Duplicate or lightly modified versions of
// this code may not be distributed or sold without permission from the author.

console.log("Alien Invasion is starting!");
console.log("Source code licensed for use by owners of the book 'Javascript Rockstar Vol 1'");
console.log("www.wildlizardranch.com/jsrockstar/vol1");
console.log("Copyright (c) 2016 Jeffrey Sprague");

window.addEventListener("load", initApp, false);
var isTouchDevice = 'ontouchstart' in document.documentElement;

// Configuration options that don't change during application lifecycle
var NUM_LASERS = 11;
var NUM_ALIENS = 8;
var NUM_STARS = 100;
var PLAYFIELD_WIDTH = 480;
var PLAYFIELD_HEIGHT = 640;
var FIRING_SPEED = 5;
var NUM_SWARMS = 3;
var NUM_ASTEROIDS = 3;
var NUM_BACKGROUNDS = 3;

// Game State
var START_GAME = 0;
var IN_PLAY = 1;
var PAUSED = 2;
var END_GAME = 3;
var QUIT = 4;
var gameState = START_GAME;

var score = 0;
var distance = 0;
var shieldPower = 100;
var mousePosX;

var ctx;    // Main canvas context
var shipImg, shieldImg, laserImg, explosionImg, earthriseImg, nebulaImg;
var backgroundMode = 0;
var spriteList;
var shipSprite;
var shieldSprite;
var explosionSprite;
var explosionSound;
var clickSound;
var stars = [];
var swarms = [];
var swarmSpeedBase = 2.5;
var asteroidStuff = [];
var asteroidSpeedBase = 1;
var laserStuff = [];
var firing = false;
var firingThrottle = 1;
var framesTilEndOfGame = 0;

/*************************************************/
function initApp () {
    console.log("Initializing...");

    // Initialize the JGL sprite utility
    jgl = new Jgl;
    spriteList = jgl.newSpriteList();

    var canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    document.addEventListener("keydown", processKeyDown);

    createStars();

    // create swarms
    for (var i = 0; i < NUM_SWARMS; i++) {
        swarms[i] = createSwarm(i);
    }

    loadImages(function() {
        gameLoop(); // Kick off the main animation loop once the images are loaded
    });

    // Declare event listeners for mouse click, release, and move
    var element = document.getElementById('canvas');
    element.onmousemove = mouseMove;
    element.onmousedown = mouseDown;
    element.onmouseup = mouseUp;
}

/*************************************************/
function mouseDown() {
    if (gameState == START_GAME) {
        gameState = IN_PLAY;
        clickSound.play();
        resetGame();
        shipSprite.show();
    } else if (gameState == END_GAME){
        gameState = START_GAME;
        clickSound.play();
        resetGame();
    } else {
        firing = true;
        firingThrottle = 1;
    }
}

/*************************************************/
function mouseUp() {
    // On PC, stop firing. On touch-based devices, do not stop firing while the game is in play
    if (isTouchDevice == false) {
        firing = false;
        firingThrottle = 1;
    }
}

/*************************************************/
function mouseMove(e) {
    mousePosX = e.offsetX == undefined ? e.layerX : e.offsetX;  // FireFox uses 'layer', Chrome & Safari use 'offset'
}

/*************************************************/
function processKeyDown(ev) {
    switch (ev.keyCode)
    {
        case 81:     // 'Q' key
            gameState = QUIT;
            break;

        case 80:    // 'P' key
            if (gameState == IN_PLAY) {
                gameState = PAUSED;
            } else {
                if (gameState == PAUSED) {
                    gameState = IN_PLAY;
                    gameLoop();
                }
            }
            break;

        default:
            console.log("Pressed key: " + ev.keyCode);
    }
}

/*************************************************/
function resetGame() {
    var i;
    firing = false;
    score = 0;
    distance = 0;
    swarmSpeedBase = 2.5;
    asteroidSpeedBase = 1;
    shieldPower = 100;

    // Reset swarms and asteroids
    for (i = 0; i < NUM_SWARMS; i++) {
        resetSwarm(i);
    }
    for (i = 0; i < NUM_ASTEROIDS; i++) {
        resetAsteroid(asteroidStuff[i]);
    }
}

/*************************************************/
function createSwarm (index) {
    var swarm = {
        active: false,
        pathIndex: 0,
        path: createPath(swarmSpeedBase + index),
        numAlive: NUM_ALIENS,
        sprites: []
    };

    swarm.image = jgl.newImage('resources/alien'+index+'.png', function() {
        for (var i = 0; i < NUM_ALIENS; i++) {
            swarm.sprites[i] = spriteList.newSprite({
                image: swarm.image,
                x: 0, y: -50,
                width: 24, height: 24
            });
        }
    });

    return swarm;
}

/*************************************************/
function resetSwarm (index) {
    swarms[index].pathIndex = 0;
    if (gameState == IN_PLAY && swarmSpeedBase < 7.25) {
        swarmSpeedBase += .25;
    }
    swarms[index].path = createPath(swarmSpeedBase + index);
    swarms[index].numAlive = NUM_ALIENS;
    for (var i = 0; i < NUM_ALIENS; i++) {
        swarms[index].sprites[i].show();
        swarms[index].sprites[i].x = 0;
        swarms[index].sprites[i].y = -50;
    }
}

/*************************************************/
function createStars() {
    for (var i = 0; i < NUM_STARS; i++) {
        var bright = Math.floor(64 + Math.random() * 100);
        stars.push({ x: 10 + Math.random() * (PLAYFIELD_WIDTH - 20),
            y: 5 + Math.random() * (PLAYFIELD_HEIGHT - 10),
            bright: 'rgb('+bright+','+bright+','+bright+')'
        });
    }
}

/*************************************************/
function loadImages(callback) {
    var numToLoad = 6;
    var loadComplete = function() {
        if (--numToLoad == 0) {
            callback();
        }
    };

    var frame, i;

    shipImg = jgl.newImage('resources/ship.png', function() {
        shipSprite = spriteList.newSprite({
            image: shipImg,
            x: 200, y: PLAYFIELD_HEIGHT - 60, width: 38, height: 43, center: true,
            active: false
        });
        loadComplete();
    });

    shieldImg = jgl.newImage('resources/shield.png', function() {
        shieldSprite = spriteList.newSprite({
            image: shieldImg,
            x: 0, y: 0, width: 72, height: 72, center: true,
            active: false
        });
        loadComplete();
    });

    asteroidImg = jgl.newImage('resources/asteroid.png', function() {
        for (i = 0; i < NUM_ASTEROIDS; i++) {
            sprite = spriteList.newSprite({
                image: asteroidImg,
                x: 0, y: 0, width: 64, height: 64, center: true,
                active: true
            });
            asteroidStuff[i] = { sprite: sprite };
            resetAsteroid(asteroidStuff[i]);
        }
        loadComplete();
    });

    laserImg = jgl.newImage('resources/laser.png', function() {
        for (i = 0; i < NUM_LASERS; i++) {
            laserStuff[i] = {};
            laserStuff[i].sprite = spriteList.newSprite({
                image: laserImg,
                width: 3, height: 16,
                active: false
            });
            laserStuff[i].laserSound = new Audio('resources/laser.mp3');
            laserStuff[i].explosionSound = new Audio('resources/crash.mp3');
        }
        clickSound = new Audio('resources/laser.mp3');
        loadComplete();
    });

    // Example of loading and defining an animated sprite
    explosionImg = jgl.newImage("resources/explosion.png", function() {
        for (i = 0; i < NUM_LASERS; i++) {
            sprite = spriteList.newSprite({
                width: 88, height: 90, center: true,
                image: explosionImg,
                animate: true,
                autoLoop: false,
                autoDeactivate: true,
                currentFrame: 0,
                startFrame: 0,
                endFrame: 39,
                active: false
            });

            // Define animation frames
            for (frame = 0; frame < 40; frame++) {
                sprite.setAnimFrame(frame, explosionImg, frame * 88, 0, 88, 90);
            }
            laserStuff[i].explosionSprite = sprite;
        }

        explosionSprite = spriteList.newSprite({
            width: 88, height: 90, scale: 4, center: true,
            image: explosionImg,
            animate: true,
            autoLoop: false,
            autoDeactivate: true,
            currentFrame: 0,
            startFrame: 0,
            endFrame: 39,
            active: false
        });

        // Define animation frames
        for (frame = 0; frame < 40; frame++) {
            explosionSprite.setAnimFrame(frame, explosionImg, frame * 88, 0, 88, 90);
        }
        explosionSound = new Audio('resources/crash.mp3');

        loadComplete();
    });

    earthriseImg = jgl.newImage('resources/earthrise.png', function() {
        nebulaImg = jgl.newImage('resources/nebula.png', function() {
            loadComplete();
        });
    });
}

/*************************************************/
function fireLaser() {
    if (shipSprite.active) {
        if (--firingThrottle < 1) {
            for (var i = 0; i < NUM_LASERS; i++) {
                if (laserStuff[i].sprite.active == false) {
                    laserStuff[i].laserSound.play();
                    laserStuff[i].sprite.setPosition(shipSprite.x - 1, shipSprite.y - 34);
                    laserStuff[i].sprite.show();
                    break;
                }
            }
            firingThrottle = FIRING_SPEED;
        }
    }
}

/*************************************************/
function doExplosion(laserIndex, alien) {
    laserStuff[laserIndex].explosionSound.play();
    var sprite = laserStuff[laserIndex].explosionSprite;
    sprite.setRotation(Math.floor(Math.random() * 360));
    sprite.setAnimActions(true);
    sprite.setPosition(alien.x, alien.y);
    sprite.setCurrentFrame(0);
    sprite.show();

    score += 10;
}

/*************************************************/
function shipExplodes() {
    explosionSprite.setAnimActions(true);
    explosionSprite.setCurrentFrame(0);
    explosionSprite.x = shipSprite.x;
    explosionSprite.y = shipSprite.y;
    explosionSprite.show();
    explosionSound.play();
    shipSprite.hide();
}

/*************************************************/
function createPath(speed) {
    var setVector = function() {
        return ( {
            rotationTarget: 135 + Math.floor(Math.random() * 90),
            length: 40 + Math.floor(Math.random() * 100),   // number of frames to stay at same angle before making a change
            rotateDir: Math.random() > .5 ? 1 : -1
        })
    };
    var DEGREES_TO_RADIANS = Math.PI / 180;
    var x = Math.floor(Math.random() * (PLAYFIELD_HEIGHT - 40) + 20);
    var y = 0;
    var path = [];
    var vector = setVector();
    var currentRotation = vector.rotationTarget;

    // Keeping adding to the path until the path goes off the bottom of the screen
    while (y < PLAYFIELD_HEIGHT + 10) {
        if (Math.abs(currentRotation - vector.rotationTarget) > (speed -1 )) {
            currentRotation += ((speed - 1) * vector.rotateDir);
            if (currentRotation > 359) { currentRotation = 0; }
            if (currentRotation < 0) { currentRotation = 359; }
        } else {
            // See if it's time to change to a new angle
            vector.length -= speed;
            if (vector.length < 0) {
                vector = setVector();
            }
        }
        x += speed * (Math.sin(currentRotation * DEGREES_TO_RADIANS));
        y -= speed * (Math.cos(currentRotation * DEGREES_TO_RADIANS));
        if (x > PLAYFIELD_WIDTH) { x -= PLAYFIELD_WIDTH; }
        if (x < 0) { x += PLAYFIELD_WIDTH; }

        path.push( { x: x, y: y, rot: currentRotation } );
    }

    return path;
}

/*************************************************/
function gameLoop() {
/*************************************************/

    if (gameState == QUIT || gameState == PAUSED) { return; }

    // Recompose screen elements, from bottom-most layer to top-most
    shieldSprite.hide();
    clearScreen();
    updateSwarms();
    updateLasers();
    updateAsteroids();
    updateShip();

    spriteList.drawSprites(ctx);
    updateStatus();

    // Delay exiting the game for a little while after you explode
    if (framesTilEndOfGame) {
        if (--framesTilEndOfGame == 0) {
            gameState = END_GAME;
        }
    }

    if (gameState == START_GAME) {
        startGameOverlay();
    }

    if (gameState == END_GAME) {
        endGameOverlay();
    }

    window.requestAnimationFrame(gameLoop);
}

/*************************************************/
function clearScreen() {
    // Every 1000 frames, change the background
    backgroundMode = Math.floor(distance / 1000) % NUM_BACKGROUNDS;

    switch (backgroundMode) {
        case 0:     // starfield
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
            updateStars();
            break;

        case 1:
            ctx.drawImage(earthriseImg, 0, 0);
            break;

        case 2:
            ctx.drawImage(nebulaImg, 0, 0);
            break;
    }
}

/*************************************************/
function updateStars() {
    var i;
    for (i = 0; i < NUM_STARS; i++) {
        ctx.fillStyle = stars[i].bright;
        ctx.fillRect(stars[i].x, stars[i].y, 2, 2);
        if ((stars[i].y += 4) > PLAYFIELD_HEIGHT) {
            stars[i].x = 10 + Math.random() * PLAYFIELD_WIDTH - 20;
            stars[i].y = 0 - Math.random() * 10;
        }
    }
}

/*************************************************/
function updateShip() {
    if (shipSprite.active) {
        if (mousePosX < PLAYFIELD_WIDTH - 35) {
            shipSprite.x = mousePosX + 17;
        }
        if (didCollideWithAlien(shipSprite)) {
            raiseShields();
        }
        distance++;
    }
}

/*************************************************/
function updateSwarms() {
    var swarmIndex, alienIndex;
    for (swarmIndex = 0; swarmIndex < NUM_SWARMS; swarmIndex++) {
        var swarm = swarms[swarmIndex];
        for (alienIndex = 0; alienIndex < NUM_ALIENS; alienIndex++) {
            var sprite = swarm.sprites[alienIndex];
            if (sprite.active) {
                var instanceIndex = swarm.pathIndex - (alienIndex * 10);
                if (instanceIndex >= 0 && instanceIndex < swarm.path.length) {
                    var point = swarm.path[swarm.pathIndex - (alienIndex * 10)];
                    sprite.setPosition(point.x, point.y);
                    sprite.setRotation(point.rot);
                }
            }
        }
        swarm.pathIndex++;
        if (swarm.pathIndex > swarm.path.length + 100) {
            resetSwarm(swarmIndex);
        }
    }
}

/*************************************************/
function didCollideWithAlien(sprite) {
    var swarmIndex, alienIndex;
    for (swarmIndex = 0; swarmIndex < NUM_SWARMS; swarmIndex++) {
        var swarm = swarms[swarmIndex];
        for (alienIndex = 0; alienIndex < NUM_ALIENS; alienIndex++) {
            var alien = swarm.sprites[alienIndex];
            if (alien.active) {
                if(spriteList.collision(sprite, alien, 0, false)) {
                    return alien;
                }
            }
        }
    }
    return null;
}

/*************************************************/
function updateLasers() {
    var laserIndex;
    for (laserIndex = 0; laserIndex < NUM_LASERS; laserIndex++) {
        var laser = laserStuff[laserIndex].sprite;
        if (laser.active) {
            laser.y -= 12;
            if (laser.y < -8) {
                laser.hide();
            } else {
                var alienSpriteHit = didCollideWithAlien(laser);
                if (alienSpriteHit) {
                    doExplosion(laserIndex, alienSpriteHit);
                    alienSpriteHit.hide();
                    laser.hide();
                }
                for (var i = 0; i < NUM_ASTEROIDS; i++) {
                    if(spriteList.collision(laser, asteroidStuff[i].sprite, 4, false)) {
                        laser.hide();
                    }
                }
            }
        }
    }

    if (firing) {
        fireLaser();
    } else {
        if (shipSprite.active) {
            score++;
        }
    }
}

/*************************************************/
function resetAsteroid(asteroid) {
    asteroid.y = -50 - Math.random() * 200;
    asteroid.x = 20 + Math.floor(Math.random() * (PLAYFIELD_WIDTH - 40));
    asteroid.speed = asteroidSpeedBase + Math.random() * 2;
    if (gameState == IN_PLAY && asteroidSpeedBase < 6) {
        asteroidSpeedBase += .1;
    }
    asteroid.rot = Math.floor(Math.random() * 360);
    asteroid.rotSpeed = Math.random() * 3;
    asteroid.sprite.show();
}

/*************************************************/
function updateAsteroids() {
    var asteroidIndex;
    for (asteroidIndex = 0; asteroidIndex < NUM_ASTEROIDS; asteroidIndex++) {
        var asteroid = asteroidStuff[asteroidIndex];
        if (asteroid.sprite.active) {
            asteroid.y += asteroid.speed;
            asteroid.rot += asteroid.rotSpeed;
            if (asteroid.rot > 360) {
                asteroid.rot -= 360;
            }
            asteroid.sprite.setPosition(asteroid.x, asteroid.y);
            asteroid.sprite.setRotation(asteroid.rot);
            if (asteroid.y > PLAYFIELD_HEIGHT + 50) {
                resetAsteroid(asteroid);
            } else {
                if(spriteList.collision(shipSprite, asteroid.sprite, 4, false)) {
                    raiseShields();
                }
            }
        }
    }
}

/*************************************************/
function updateStatus() {
    ctx.fillStyle = "#080";
    ctx.fillText('SCORE: ' + score, 20, 30);
    ctx.fillText('DIST: ' + distance, PLAYFIELD_WIDTH - 170, 30);
}

/*************************************************/
function raiseShields() {
    shieldPower -= Math.floor(2 + Math.random() * 2.5);
    if (shieldPower < 0) {
        shieldPower = 0;
        shipExplodes();
        framesTilEndOfGame = 100;
    }
    shieldSprite.x = shipSprite.x;
    shieldSprite.y = shipSprite.y;
    shieldSprite.show();

    ctx.fillStyle = "#080";
    ctx.fillText(shieldPower + '%', shieldSprite.x + 40, shieldSprite.y - 10);
}

/*************************************************/
function startGameOverlay() {
    ctx.fillStyle = "#FC0";
    ctx.font = "40px ocr";
    ctx.fillText('INVASION!', PLAYFIELD_WIDTH / 2 - 127, PLAYFIELD_HEIGHT / 3);
    ctx.fillStyle = "#080";
    ctx.font = "20px ocr";
    ctx.fillText('CLICK TO START', PLAYFIELD_WIDTH / 2 - 105, PLAYFIELD_HEIGHT / 3 + 40);
}

/*************************************************/
function endGameOverlay() {
    ctx.fillStyle = "#FC0";
    ctx.font = "40px ocr";
    ctx.fillText('GAME OVER', PLAYFIELD_WIDTH / 2 - 130, PLAYFIELD_HEIGHT / 3);
    ctx.fillStyle = "#C90";
    ctx.font = "20px ocr";
    ctx.fillText('CLICK TO RESTART', PLAYFIELD_WIDTH / 2 - 114, PLAYFIELD_HEIGHT / 3 + 40);
}



