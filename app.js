process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
    console.log(err.stack);
});

var colyseus = require('colyseus');
var express = require('express');
var http = require('http');

var app = express();
var server = http.createServer(app);

var gameServer = new colyseus.Server({ server: server });
var BattleRoom = require('./rooms/battle_room');

// register battle room handler
gameServer.register('battle', BattleRoom)

var port = parseInt(process.env.TANX_PORT || process.env.PORT || '51000', 10) || 30043;
var host = process.env.TANX_HOST || '0.0.0.0';

app.use(express.static( __dirname ))
server.listen(port, host, function () {
    var host = server.address();
    console.log('Listening on %s:%s', host.address, host.port);
});
