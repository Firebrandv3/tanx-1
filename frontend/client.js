pc.script.create('client', function (context) {

    var tmpVec = new pc.Vec3();
    var uri = new pc.URI(window.location.href);
    var query = uri.getQuery();
    var gamepadNum = query.gamepad;

    var Client = function (entity) {
        this.entity = entity;
        this.id = null;
        this.movement = [ 0, 0 ];
        context.keyboard = new pc.input.Keyboard(document.body);

        document.body.style.cursor = 'none';
    };

    var getParameterByName = function(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    Client.prototype = {
        initialize: function () {
            this.tanks = context.root.getChildren()[0].script.tanks;
            this.bullets = context.root.getChildren()[0].script.bullets;
            this.pickables = context.root.getChildren()[0].script.pickables;
            this.teams = context.root.getChildren()[0].script.teams;
            this.profile = context.root.getChildren()[0].script.profile;

            var self = this;
            var protocol = location.protocol.replace("http", "ws")
            var servers = {
                'local': protocol + '//localhost:51000', // local
                'us': protocol + '//colyseus-tanx.herokuapp.com', // us
                'uk': protocol + '//colyseus-tanx-europe.herokuapp.com', // uk
                'default': protocol + '//colyseus-tanx.herokuapp.com' //
            };

            var env = getParameterByName('server') || 'default';
            var url = env && servers[env] || servers['default'];

            this.client = new Colyseus.Client(url)
            this.room = this.client.join('battle')

            this.room.onJoin.add(function(err) { self.connected = true });
            this.room.onLeave.add(function(err) { self.connected = false });
            this.room.onError.add(function(err) { console.error(err); });

            //
            // Listening for patches
            //
            this.room.listen("tanks/:id", function (change) {
              if (change.operation === "add") {
                self.tanks.new(change.value);

              } else if (change.operation === "remove") {
                self.tanks.delete(change.path.id);
              }
            });

            this.room.listen("pickables/:id", function (change) {
              if (change.operation === "add") {
                self.pickables.new(change.value);

              } else if (change.operation === "remove") {
                self.pickables.finish(change.path.id);
              }
            });

            this.room.listen("bullets/:id", function (change) {
              if (change.operation === "add") {
                self.bullets.new(change.value);

              } else if (change.operation === "remove") {
                self.bullets.finish(change.path.id);
              }
            });

            this.room.listen("tanks/:id/:attribute", function (change) {
              self.tanks.updateProperty(change.path.id, change.path.attribute, change.value);
            });

            this.room.listen("teams/:number/score", function (change) {
              self.teams.teamScore(change.path.number, change.value);
            });

            this.room.listen("winner", function (change) {
              if (change.operation === "replace") {
                self.shoot(false);
                self.teams.teamWin(change.value);
              }
            });

            context.mouse.on('mousedown', this.onMouseDown, this);
            context.mouse.on('mouseup', this.onMouseUp, this);

            this.gamepadConnected = false;
            this.gamepadActive = false;

            window.addEventListener('gamepadconnected', function () {
                this.gamepadConnected = true;
            }.bind(this));
            window.addEventListener('gamepaddisconnected', function () {
                this.gamepadConnected = false;
            }.bind(this));

            // Chrome doesn't have the gamepad events, and we can't
            // feature detect them in Firefox unfortunately.
            if ('chrome' in window) {
                // This is a lie, but it lets us begin polling.
                this.gamepadConnected = true;
            }
        },

        update: function (dt) {
            if (!this.connected)
                return;

            // WASD movement
            var movement = [
                context.keyboard.isPressed(pc.input.KEY_D) - context.keyboard.isPressed(pc.input.KEY_A),
                context.keyboard.isPressed(pc.input.KEY_S) - context.keyboard.isPressed(pc.input.KEY_W)
            ];

            // ARROWs movement
            movement[0] += context.keyboard.isPressed(pc.input.KEY_RIGHT) - context.keyboard.isPressed(pc.input.KEY_LEFT);
            movement[1] += context.keyboard.isPressed(pc.input.KEY_DOWN) - context.keyboard.isPressed(pc.input.KEY_UP);

            // gamepad controls
            // AUTHORS: Potch and cvan
            if (context.gamepads.gamepadsSupported && this.gamepadConnected) {
                var gamepadIdx = gamepadNum - 1;

                if (!context.gamepads.poll()[gamepadIdx]) {
                    // If it was active at one point, reset things.
                    if (self.gamepadActive && self.link && self.link.mouse) {
                        self.link.mouse.move = true;
                        this.gamepadActive = false;
                    }
                } else {
                    // Gamepad movement axes.
                    var x = context.gamepads.getAxis(gamepadIdx, pc.PAD_L_STICK_X);
                    var y = context.gamepads.getAxis(gamepadIdx, pc.PAD_L_STICK_Y);
                    if ((x * x + y * y) > .25) {
                        movement[0] += x;
                        movement[1] += y;
                    }

                    // Gamepad firing axes.
                    var gpx = context.gamepads.getAxis(gamepadIdx, pc.PAD_R_STICK_X);
                    var gpy = context.gamepads.getAxis(gamepadIdx, pc.PAD_R_STICK_Y);

                    if (x || y || gpx || gpy) {
                        this.gamepadActive = true;

                        if (this.link && this.link.mouse) {
                            this.link.mouse.move = false;

                            // TODO: Figure out how to hide cursor without destroying
                            // (so we can show the cursor again if gamepad is disconnected).
                            var target = context.root.findByName('target');
                            if (target) {
                                target.destroy();
                            }
                        }
                    }

                    // Gamepad shooting.
                    if (gpx * gpx + gpy * gpy > .25) {
                        this.shoot(true);

                        if (this.link) {
                            this.link.mPos = [
                                gpx / 2 * (context.graphicsDevice.width / 2),
                                gpy / 2 * (context.graphicsDevice.height / 2)
                            ];

                            this.link.angle = Math.floor(Math.atan2(gpx, gpy) / (Math.PI / 180) + 45);
                            this.link.link.targeting(this.link.angle);
                        }
                    } else {
                        this.shoot(false);
                    }
                }
            }

            // rotate vector
            var t =       movement[0] * Math.sin(Math.PI * 0.75) - movement[1] * Math.cos(Math.PI * 0.75);
            movement[1] = movement[1] * Math.sin(Math.PI * 0.75) + movement[0] * Math.cos(Math.PI * 0.75);
            movement[0] = t;

            // check if it is changed
            if (movement[0] !== this.movement[0] || movement[1] != this.movement[1]) {
                this.movement = movement;
                this.room.send(['move', this.movement]);
            }
        },

        onMouseDown: function() {
            this.shoot(true);
        },

        onMouseUp: function() {
            this.shoot(false);
        },

        shoot: function(state) {
            if (!this.connected)
                return;

            if (this.shootingState !== state) {
                this.shootingState = state;

                this.room.send(['shoot', this.shootingState]);
            }
        }
    };

    return Client;
});
