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
                'default': protocol + '//colyseus-tanx.herokuapp.com' //
            };

            var env = getParameterByName('server') || 'default';
            var url = env && servers[env] || servers['default'];

            this.colyseus = new Colyseus(url)
            this.room = this.colyseus.join('battle')

            this.room.on('join', function(err) { self.connected = true })
            this.room.on('leave', function(err) { self.connected = false })

            this.room.on('error', function(err) {
              console.error(err);
            });

            this.room.on('update', function(newState, patches) {
              if (!patches) {
                // initial state
                var id = null

                for (id in newState.tanks) {
                  self.tanks.new(newState.tanks[id]);
                }

                for (id in newState.pickables) {
                  self.pickables.new(newState.pickables[id]);
                }

                for (id in newState.bullets) {
                  self.bullets.new(newState.bullets[id]);
                }

              } else {
                // patch state

                patches.forEach(function(patch) {
                  if (patch.op==='replace' && patch.path.indexOf("/tanks/") === 0) {
                    var matches = patch.path.match(/\/tanks\/([0-9]+)\/(.*)/)
                    var index = matches[1]
                    var property = matches[2]
                    self.tanks.updateProperty(index, property, patch.value)

                    // self.tanks.updateData(data.tanks);
                    // self.tanks.respawn(data.tanks);

                  } else if (patch.op==='replace' && patch.path.indexOf("/teams/") === 0) {
                    var index = patch.path.match("/teams/(.*)/score")
                    if (index && index[1]) {
                      self.teams.teamScore(index[1], patch.value);
                    }

                  } else if (patch.op==='add' && patch.path.indexOf("/tanks/") === 0) {
                    self.tanks.new(patch.value);

                  } else if (patch.op==='remove' && patch.path.indexOf("/tanks/") === 0) {
                    var id = patch.path.match("/tanks/(.*)")
                    self.tanks.delete(id[1]);

                  } else if (patch.op==='add' && patch.path.indexOf("/bullets/") === 0) {
                    self.bullets.new(patch.value);

                  } else if (patch.op==='remove' && patch.path.indexOf("/bullets/") === 0) {
                    var id = patch.path.match("/bullets/(.*)")
                    self.bullets.finish(id[1]);

                  } else if (patch.op==='add' && patch.path.indexOf("/pickables/") === 0) {
                    self.pickables.new(patch.value);

                  } else if (patch.op==='remove' && patch.path.indexOf("/pickables/") === 0) {
                    var id = patch.path.match("/pickables/(.*)")
                    self.pickables.finish(id[1]);

                  } else if (patch.op==='replace' && patch.path.indexOf("/winner/") === 0) {
                    self.shoot(false);
                    self.teams.teamWin(patch.value);
                  }

                })

              }

              // // bullets add
              // if (data.bullets) {
              //     for(var i = 0; i < data.bullets.length; i++)
              //         self.bullets.new(data.bullets[i]);
              // }

              // // pickables add
              // if (data.pickable) {
              //     for(var i = 0; i < data.pickable.length; i++)
              //         self.pickables.new(data.pickable[i]);
              // }

              // // tanks update
              // if (data.tanks)
              //     self.tanks.updateData(data.tanks);

              // // tanks respawn
              // if (data.tanksRespawn) {
              //     for(var i = 0; i < data.tanksRespawn.length; i++)
              //         self.tanks.respawn(data.tanksRespawn[i]);
              // }

              // // teams score
              // if (data.teams) {
              //     for(var i = 0; i < data.teams.length; i++) {
              //         self.teams.teamScore(i, data.teams[i]);
              //     }
              // }

              // // winner
              // if (data.winner) {
              //     self.shoot(false);
              //     self.teams.teamWin(data.winner);
              // }

              // users.on(self.id + ':name', function(name) {
              //   self.profile.set(name);
              // });
              //
              // socket.on('user.add', function(data) {
              //   users.add(data);
              // });
              //
              // socket.on('user.sync', function(data) {
              //   for(var i = 0; i < data.length; i++)
              //   users.add(data[i]);
              // });
              //
              // socket.on('user.remove', function(data) {
              //   users.remove(data.id);
              // });
              //
              // socket.on('user.name', function(data) {
              //   var user = users.get(data.id);
              //   if (! user) return;
              //
              //   user.name = data.name;
              //   users.emit(user.id + ':name', data.name);
              // });

            })

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
