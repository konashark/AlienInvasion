console.log("Javascript is alive!");

window.addEventListener("load", initApp, false);

var spriteList;
var shipSprite;
var alienSprites = [];
var laserStuff = [];
var explSprites = [];
var KEYSTATE = [];
var KEY = {LEFT: 37, RIGHT: 39, UP: 38, DOWN: 40, ENTER: 13, SPACE: 32, X: 88, Z: 90 };
var ctx;    // Main canvas context
var path = [];
var stars = [];
var NUM_LASERS = 8;
var NUM_ALIENS = 8;
var NUM_STARS = 100;
var PLAYFIELD_WIDTH = 480;
var PLAYFIELD_HEIGHT = 640;
var firing = false;
var firingThrottle = 1;
var FIRING_SPEED = 8;

/*************************************************/
function initApp () {
    console.log("Initializing...");

    // Initialize the amazing JGL and create a new sprite list
    jgl = new Jgl;

    var canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0,0,PLAYFIELD_HEIGHT,PLAYFIELD_WIDTH);
    ctx.font = "40px _sans";
    ctx.fillStyle = "#00AA00";

    document.addEventListener("keydown", processKeyDown);
    document.addEventListener("keyup", processKeyUp);

    createStars();

    path = createPath(4);

    loadResources(function() {
        gameLoop();
    });

    var element = document.getElementById('canvas');
    element.onmousemove = function(e) {
        if (shipSprite.active) {
            if (e.offsetX < PLAYFIELD_WIDTH - 35) {
                shipSprite.x = e.offsetX;
            }
        }
    };
/*
    element.onmousedown = function(e) {
        if (shipSprite.active) {
            for (var i = 0; i < NUM_LASERS; i++) {
                if (laserStuff[i].sprite.active == false) {
                    laserStuff[i].laserSound.play();
                    laserStuff[i].sprite.setPosition(shipSprite.x + 16, shipSprite.y);
                    laserStuff[i].sprite.active = true;
                    break;
                }
            }
        }
    };
 */
    element.onmousedown = function(e) {
        firing = true;
        firingThrottle = 1;
    };
    element.onmouseup = function(e) {
        firing = false;
        firingThrottle = 1;
    };
}

/*************************************************/
function processKeyDown(ev) {
    KEYSTATE[ev.keyCode] = true;

    switch (ev.keyCode)
    {
        case KEY.SPACE:
            break;

        default:
            console.log("Pressed key: " + ev.keyCode);
    }
}

/*************************************************/
function processKeyUp(ev) {
    KEYSTATE[ev.keyCode] = false;
}

/*************************************************/
function fireLaser() {
    if (shipSprite.active) {
        if (--firingThrottle < 1) {
            for (var i = 0; i < NUM_LASERS; i++) {
                if (laserStuff[i].sprite.active == false) {
                    laserStuff[i].laserSound.play();
                    laserStuff[i].sprite.setPosition(shipSprite.x + 16, shipSprite.y);
                    laserStuff[i].sprite.active = true;
                    break;
                }
            }
            firingThrottle = FIRING_SPEED;
        }
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
function loadResources(callback) {
    // Load images, sounds, etc.

    spriteList = jgl.newSpriteList();

    var shipImg = jgl.newImage('resources/ship.png', function() {
        shipSprite = spriteList.newSprite({
            id: 'ship',
            image: shipImg,
            x: 200, y: PLAYFIELD_HEIGHT - 75,
            width: 34, height: 40
        });
    });

    var laserImg = jgl.newImage('resources/laser.png', function() {
        for (var i = 0; i < NUM_LASERS; i++) {
            laserStuff[i] = {};
            laserStuff[i].sprite = spriteList.newSprite({
                id: 'laser' + i,
                image: laserImg,
                width: 2, height: 8,
                active: false
            });
            laserStuff[i].laserSound = new Audio('resources/laser.mp3');
            laserStuff[i].explosionSound = new Audio('resources/crash.mp3');
        }

        // Example of loading and defining an animated sprite
        var explosionImg = jgl.newImage("resources/explosion.png", function() {
            for (var i = 0; i < NUM_LASERS; i++) {
                sprite = spriteList.newSprite({
                    id: 'explosion' + i,
                    width: 88, height: 90,
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
                for (var frame = 0; frame < 40; frame++) {
                    sprite.setAnimFrame(frame, explosionImg, frame * 88, 0, 88, 90);
                }
                sprite.setHotSpot(44, 44);

                laserStuff[i].explosionSprite = sprite;
            }
        });
    });

    var alienImg = jgl.newImage('resources/alien1.png', function() {
        for (var i = 0; i < NUM_ALIENS; i++) {
            alienSprites[i] = spriteList.newSprite({
                id: 'alien' + i,
                image: alienImg,
                x: -50, y: 0,
                width: 24, height: 24
            });
        }
        callback(); // resume initialization
    });

}

/*************************************************/
function doExplosion(alien) {
    laserStuff[alien].explosionSound.play();
    var sprite = laserStuff[alien].explosionSprite;
    sprite.setRotation(jgl.random(360));
    sprite.setAnimActions(true);
    sprite.setPosition(alienSprites[alien].x, alienSprites[alien].y);
    sprite.setCurrentFrame(0);
    sprite.show();
}

/*************************************************/
function createPath(speed) {
    var setVector = function() {
        return ( {
            rotationTarget: 135 + Math.floor(Math.random() * 90),
            length: 40 + Math.floor(Math.random() * 100),
            rotateDir: Math.random() > .5 ? 1 : -1
        })
    };
    var DEGREES_TO_RADIANS = Math.PI / 180;
    var x = Math.floor(Math.random() * (PLAYFIELD_HEIGHT - 40) + 20);
    var y = 0;
    var path = [];
    var vector = setVector();
    var currentRotation = vector.rotationTarget;

    while (y < PLAYFIELD_HEIGHT + 10) {
        if (Math.abs(currentRotation - vector.rotationTarget) > (speed -1 )) {
            currentRotation += ((speed - 1) * vector.rotateDir);
            if (currentRotation > 359) { currentRotation = 0 };
            if (currentRotation < 0) { currentRotation = 359 };
        } else {
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
var pathIndex = 0;
function gameLoop() {
    if (++pathIndex < path.length + 100) {
        window.requestAnimationFrame(gameLoop);

        var i;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0,0,PLAYFIELD_WIDTH,PLAYFIELD_HEIGHT);

        for (i = 0; i < NUM_STARS; i++) {
            ctx.fillStyle = stars[i].bright;
            ctx.fillRect(stars[i].x, stars[i].y, 2, 2);
            if ((stars[i].y += 4) > PLAYFIELD_HEIGHT) {
                stars[i].x = 10 + Math.random() * PLAYFIELD_WIDTH - 20;
                stars[i].y = 0 - Math.random() * 10;
            }
        }

        // Update alien sprites
        for (i = 0; i < NUM_ALIENS; i++) {
            if (alienSprites[i].active) {
                instanceIndex = pathIndex - (i * 10);
                if (instanceIndex >= 0 && instanceIndex < path.length) {
                    var point = path[pathIndex- (i * 10)];
                    alienSprites[i].setPosition(point.x, point.y);
                    alienSprites[i].setRotation(point.rot);
                }
            }
        }

        // Update laser sprites
        for (i = 0; i < NUM_LASERS; i++) {
            var laser = laserStuff[i].sprite;
            if (laser.active) {
                laser.y -= 12;
                if (laser.y < -8) {
                    laser.active = false;
                } else {
                    for (var alien = 0; alien < NUM_ALIENS; alien++) {
                        if (alienSprites[alien].active) {
                            if (spriteList.collision(laser, alienSprites[alien], 0, false)) {
                                doExplosion(alien);
                                alienSprites[alien].active = false;
                                laser.active = false;
                            }
                        }
                    }
                }
            }
        }

        if (firing) {
            fireLaser();
        }

        // Redraw sprites
        spriteList.drawSprites(ctx);

        // Draw images
        //ctx.drawImage(jet, 0, 0);
    } else {
        console.log('Done!');
    }
}

