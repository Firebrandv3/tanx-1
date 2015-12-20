class State {

  constructor (world) {
    this.world = world
    this.score = 0

    this.winner = {
      team: null,
      scores: []
    }

    // add 4 teams
    this.teams = []
    for (var i=0; i<4; i++) {
      this.teams.push({ id: i, score: 0, tanks: 0 })
    }
  }

  reset () {
    // team scores
    for(var i = 0; i < 4; i++) {
      this.teams[i].score = 0;
    }

    // tanks scores
    this.world.forEach('tank', (tank) => {
      tank.score = 0;
      tank.killer = null;
      tank.respawn();
    });

    // room score
    this.score = 0;
  }

  toJSON () {
    var pickables = {}
    this.world.forEach('pickable', (item) => pickables[item.id] = item )

    var tanks = {}
    this.world.forEach('tank', (item) => tanks[item.id] = item )

    var bullets = {}
    this.world.forEach('bullet', (item) => bullets[item.id] = item )

    return {
      score: this.score,
      winner: this.winner,
      teams: this.teams,

      // world state
      pickables: pickables,
      tanks: tanks,
      bullets: bullets
    }
  }

}

module.exports = State
