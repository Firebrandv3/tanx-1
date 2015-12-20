var Room = require('colyseus').Room;
var World = require('../modules/world');
var Block = require('../modules/block');
var Tank = require('../modules/tank');
var Bullet = require('../modules/bullet');
var Vec2 = require('../modules/vec2');
var Pickable = require('../modules/pickable');
var State = require('../modules/state');

class BattleRoom extends Room {

  constructor (options) {
    super(options)

    this.world = new World({
      width: 48,
      height: 48,
      clusterSize: 4,
      indexes: [ 'tank', 'bullet', 'pickable', 'block' ]
    });

    this.level = [
        [ 13.5, 2, 1, 4 ],
        [ 13.5, 12, 1, 2 ],
        [ 12.5, 13.5, 3, 1 ],
        [ 2, 13.5, 4, 1 ],
        [ 11.5, 15, 1, 2 ],
        [ 11.5, 23.5, 1, 5 ],

        [ 10, 26.5, 4, 1 ],
        [ 6, 26.5, 4, 1 ],

        [ 2, 34.5, 4, 1 ],
        [ 12.5, 34.5, 3, 1 ],
        [ 13.5, 36, 1, 2 ],
        [ 15, 36.5, 2, 1 ],
        [ 13.5, 46, 1, 4 ],

        [ 23.5, 36.5, 5, 1 ],
        [ 26.5, 38, 1, 4 ],
        [ 26.5, 42, 1, 4 ],

        [ 34.5, 46, 1, 4 ],
        [ 34.5, 36, 1, 2 ],
        [ 35.5, 34.5, 3, 1 ],
        [ 36.5, 33, 1, 2 ],
        [ 46, 34.5, 4, 1 ],

        [ 36.5, 24.5, 1, 5 ],
        [ 38, 21.5, 4, 1 ],
        [ 42, 21.5, 4, 1 ],

        [ 46, 13.5, 4, 1 ],
        [ 35.5, 13.5, 3, 1 ],
        [ 34.5, 12, 1, 2 ],
        [ 33, 11.5, 2, 1 ],
        [ 34.5, 2, 1, 4 ],

        [ 24.5, 11.5, 5, 1 ],
        [ 21.5, 10, 1, 4 ],
        [ 21.5, 6, 1, 4 ],

        // center
        [ 18.5, 22, 1, 6 ],
        [ 19, 18.5, 2, 1 ],
        [ 26, 18.5, 6, 1 ],
        [ 29.5, 19, 1, 2 ],
        [ 29.5, 26, 1, 6 ],
        [ 29, 29.5, 2, 1 ],
        [ 22, 29.5, 6, 1 ],
        [ 18.5, 29, 1, 2 ]
    ];

    // x, y, type, delay, lastSpawn
    this.pickables = [{
      x: 23.5,
      y: 9.5,
      type: 'repair',
      item: null,
      delay: 5000,
      picked: 0
    }, {
      x: 38.5,
      y: 23.5,
      type: 'repair',
      item: null,
      delay: 5000,
      picked: 0
    }, {
      x: 24.5,
      y: 38.5,
      type: 'repair',
      item: null,
      delay: 5000,
      picked: 0
    }, {
      x: 9.5,
      y: 24.5,
      type: 'repair',
      item: null,
      delay: 5000,
      picked: 0
    }, {
      x: 13.5,
      y: 15.5,
      type: 'damage',
      item: null,
      delay: 10000,
      picked: 0
    }, {
      x: 32.5,
      y: 13.5,
      type: 'damage',
      item: null,
      delay: 10000,
      picked: 0
    }, {
      x: 34.5,
      y: 32.5,
      type: 'damage',
      item: null,
      delay: 10000,
      picked: 0
    }, {
      x: 15.5,
      y: 34.5,
      type: 'damage',
      item: null,
      delay: 10000,
      picked: 0
    }, {
      x: 24,
      y: 24,
      type: 'shield',
      item: null,
      delay: 30000,
      picked: 0
    }];

    for(var i = 0; i < this.level.length; i++) {
      this.world.add('block', new Block({
        x: this.level[i][0],
        y: this.level[i][1],
        width: this.level[i][2],
        height: this.level[i][3]
      }));
    }

    this.updateInterval = setInterval(this.update.bind(this), 1000 / 20)
    this.setState(new State(this.world))
  }

  requestJoin (options) {
    return ( this.clients.length < 12 )
  }

  onJoin (client, options) {
    this.sendState(client)

    var tank = new Tank(client, this.pickWeakestTeam());
    client.tank = tank;

    this.world.add('tank', tank);
  }

  onMessage (client, data) {
    var type = data[0]
      , message = data[1]
      , tank = client.tank

    if (type === 'name') {
      if (/^([a-z0-9\-_]){4,8}$/i.test(message)) {
        client.name = message
      }

    } else if (type === 'move') {
      if (message &&
          message instanceof Array &&
          message.length == 2 &&
          typeof(message[0]) == 'number' &&
          typeof(message[1]) == 'number') {
          tank.movementDirection.setV(message);
      }

    } else if (type === 'target') {
      if (message && typeof(message) == 'number')
        tank.angle = message;

    } else if (type === 'shoot') {
      if (!tank.dead) {
        tank.shooting = message;
      }

    }
  }

  update () {
    var world = this.world;
    var now = Date.now();
    var winner = null;

    // for each tank
    world.forEach('tank', (tank) => {
      tank.update();

      if (! tank.dead) {
          // tank-tank collision
          world.forEachAround('tank', tank, (tankOther) => {
            if (tank === tankOther || tankOther.dead)
                return;

            // check for collision
            var dist = tank.pos.dist(tankOther.pos);
            if (dist < tank.radius + tankOther.radius) {
                // collided
                Vec2.alpha
                  .setV(tank.pos)
                  .sub(tankOther.pos)
                  .norm()
                  .mulS(dist - (tank.radius + tankOther.radius));

                // move apart
                tank.pos.sub(Vec2.alpha);
                tankOther.pos.add(Vec2.alpha);
            }
          });

          // tank-block collision
          world.forEachAround('block', tank, (block) => {
              var point = block.collideCircle(tank);
              if (point)
                  tank.pos.add(point);
          });

          // tank-pickable collision
          world.forEachAround('pickable', tank, (pickable) => {
              if (! pickable.collideCircle(tank))
                  return;

              switch(pickable.type) {
                  case 'repair':
                      // don't need repair
                      if (tank.hp == 10)
                          return;

                      // recover a bit
                      tank.hp = Math.min(10, tank.hp + 3);
                      break;
                  case 'damage':
                      // give 3 bullets
                      tank.bullets += 3;
                      break;
                  case 'shield':
                      // don't pickup if shield already full
                      if (tank.shield == 10)
                          return;
                      // set full shield
                      tank.shield = 10;
                      break;
              }

              world.remove('pickable', pickable);

              this.pickables[pickable.ind].picked = now;
              this.pickables[pickable.ind].item = null;

              pickable.delete();
          });
      }

      // update in world
      tank.node.root.updateItem(tank);

      // shoot
      if (! tank.dead && tank.shooting && ! tank.reloading) {
          // new bullet
          var bullet = tank.shoot();
          world.add('bullet', bullet);
      }
    });

    // respawn pickables
    for(var i = 0; i < this.pickables.length; i++) {
        var pickable = this.pickables[i];
        if (! pickable.item && (now - pickable.picked) > pickable.delay) {
            pickable.item = new Pickable({
                type: pickable.type,
                x: pickable.x,
                y: pickable.y
            });
            pickable.item.ind = i;
            world.add('pickable', pickable.item);
        }
    }

    // for each bullet
    world.forEach('bullet', (bullet) => {
        // bullet update
        bullet.update();

        var deleting = false;
        if (bullet.pos.dist(bullet.target) < 1) {
            deleting = true;
        } else if (bullet.pos[0] <= 0 ||
                   bullet.pos[1] <= 0 ||
                   bullet.pos[0] >= world.width ||
                   bullet.pos[1] >= world.height) {
            deleting = true;
        } else {
            // for each tank around
            world.forEachAround('tank', bullet, (tank) => {
                // refuse tank if any of conditions not met
                if (deleting ||  // bullet already hit the target
                    tank.dead ||  // tank is dead
                    tank === bullet.owner ||  // own bullet
                    tank.team === bullet.owner.team || // friendly tank
                    now - tank.respawned <= 2000 ||  // tank just respawned
                    tank.pos.dist(bullet.pos) > (tank.radius + bullet.radius)) {  // no collision
                    return;
                }

                // hit
                bullet.hit = true;
                bullet.pos.setV(tank.pos);

                if (! bullet.owner.deleted) {
                    // damage tank
                    var damage = bullet.damage;

                    tank.tHit = now;

                    // if has shield
                    if (tank.shield) {
                        if (tank.shield > damage) {
                            // enough to sustain whole damage
                            tank.shield -= damage;
                            damage = 0;
                        } else {
                            // shielded only some damage
                            damage -= tank.sheild;
                            tank.shield = 0;
                        }
                    }

                    if (damage) {
                        tank.hp -= damage;

                        // killed, give point
                        if (tank.hp <= 0) {
                            // add score
                            bullet.owner.score++;
                            bullet.owner.team.score++;
                            // winner?
                            if (bullet.owner.team.score === 10)
                                winner = bullet.owner.team;
                            // total score
                            this.state.score++;
                            // bullet.owner.owner.send('point', 1);
                            // remember killer
                            tank.killer = bullet.owner.id;
                            // respawn
                            tank.respawn();
                        }
                    }
                }

                // bullet delete
                deleting = true;
            });

            if (! deleting) {
                // for each block around
                world.forEachAround('block', bullet, (block) => {
                    if (deleting)
                        return;

                    // collision with level block
                    var point = block.collideCircle(bullet);
                    if (point) {
                        bullet.pos.add(point);
                        deleting = true;
                    }
                });
            }
        }

        if (! deleting) {
            // update in world
            bullet.node.root.updateItem(bullet);

        } else {
            // remove from world
            world.remove('bullet', bullet);

            // delete bullet
            bullet.delete();
        }
    });

    // winner?
    if (winner) {
        this.state.winner = {
            team: winner.id,
            scores: this.state.teams.map(function(team) {
              return team.score
            })
        };

        this.state.reset()
    }
  }

  onLeave (client) {
    client.tank.team.tanks--;
    this.world.remove('tank', client.tank);
    client.tank.delete();
  }

  pickWeakestTeam () {
    var list = this.state.teams.filter(function(item) {
        return item.tanks < 4;
    });

    // sort by number of tanks and then score
    list.sort(function(a, b) {
        var t = a.tanks - b.tanks;
        if (t === 0) {
            return a.score - b.score;
        } else {
            return t;
        }
    });

    // get list of same candidates
    list = list.filter(function(item) {
        return item.tanks === list[0].tanks && item.score === list[0].score;
    });

    // pick random
    return list[Math.floor(list.length * Math.random())];
  }

  dispose () {
    clearInterval(this.updateInterval)
  }

}

module.exports = BattleRoom;
