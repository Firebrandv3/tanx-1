pc.script.create('tanks', function (context) {
    var Tanks = function (entity) {
        this.entity = entity;
        this.ind = 0;
    };


    Tanks.prototype = {
        initialize: function () {
            this.tank = context.root.findByName('tank');
            this.tank.enabled = false;
            // this.tank.findByName('light').enabled = false;

            this.tanks = context.root.findByName('tanks');
            this.client = context.root.getChildren()[0].script.client;
            this.camera = context.root.findByName('camera');
            this.minimap = context.root.getChildren()[0].script.minimap;
            this.teams = context.root.getChildren()[0].script.teams;
            // this.hpBar = context.root.getChildren()[0].script.hp;

            this.own = null;
        },

        new: function(args) {
            var newTank = this.tank.clone();
            newTank.setName('tank_' + args.id);
            newTank.owner = args.owner;
            newTank.enabled = true;
            newTank.setPosition(args.x, 0, args.y);
            newTank.rotate(0, Math.random() * 360, 0);

            // set inital data
            newTank.script.tank.setHP(args.hp)
            newTank.script.tank.setSP(args.shield);
            newTank.script.tank.setDead(args.dead);
            newTank.script.tank.setName(args.clientName)
            newTank.script.tank.moveTo([args.x, args.y])
            newTank.script.tank.targeting(args.angle)

            this.teams.tankAdd(newTank.script.tank, args.team);

            if (args.owner == this.client.room.sessionId) {
                this.camera.script.link.link = newTank;
                this.own = newTank;
            }

            this.tanks.addChild(newTank);
        },

        delete: function(id) {
            var tank = this.tanks.findByName('tank_' + id);
            if (! tank) return;

            tank.fire('destroy');
            tank.destroy();
        },

        updateProperty: function(id, property, value) {
          var entity = this.tanks.findByName('tank_' + id);
          var tank = entity.script.tank

          if (!tank.dead && (property == "x" || property == "y")) {
            if (property === 'y') property = 'z'
            tank.movePoint[property] = value

          } else if (!tank.own && property == "angle") {
            tank.targeting(value)

          } else if (property == "hp") {
            tank.setHP(value)

          } else if (property == "shield") {
            tank.setSP(value || 0);

          } else if (property == "killer") {
            var killerEntity = this.tanks.findByName('tank_' + value);

            // when the game is finished killer entity may not exists due re-initialization
            if (killerEntity) {
              var killerTank = killerEntity.script.tank
              tank.killer = killerTank;
            }

          } else if (property == "dead") {
            tank.setDead(value);

          } else if (property == "clientName") {
            tank.setName(value)
          }

        },

        updateData: function(index, path, value) {
            // for(var i = 0; i < data.length; i++) {
            //     var tankData = data[i];
            //
            //     var tank = this.tanks.findByName('tank_' + tankData.id);
            //     if (! tank) continue;
            //     tank = tank.script.tank;
            //
            //     // movement
            //     if (tankData.hasOwnProperty('x'))
            //         tank.moveTo([ tankData.x, tankData.y ]);
            //
            //     // targeting
            //     if (! tank.own && tankData.hasOwnProperty('a'))
            //         tank.targeting(tankData.a);
            //
            //     // hp
            //     if (tankData.hasOwnProperty('hp'))
            //         tank.setHP(tankData.hp);
            //
            //     // shield
            //     tank.setSP(tankData.sp || 0);
            //
            //     // killer
            //     if (tank.own && tankData.hasOwnProperty('killer')) {
            //         // find killer
            //         tank.killer = this.tanks.findByName('tank_' + tankData.killer);
            //     }
            //
            //     // dead/alive
            //     tank.setDead(tankData.dead || false);
            //
            //     // score
            //     // if (tank.own && tankData.hasOwnProperty('s'))
            //         // this.hpBar.setScore(tankData.s);
            // }

            this.minimap.draw();
        }
    };

    return Tanks;
});
