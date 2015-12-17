class GameState {

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
      tank.scoreLast = -1;
      tank.killer = null;
      tank.respawn();
    });

    // room score
    this.score = 0;
  }

}

module.exports = GameState
