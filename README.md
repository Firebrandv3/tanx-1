# tanx-colyseus

This is a fork of [tanx](http://playcanv.as/p/aP0oxhUr) client and
[server](https://github.com/Maksims/tanx), modified to show
[Colyseus](https://github.com/gamestdio/colyseus) usage advantages as a game
server.

**What has been changed in the server?**

- Lobby and room creation were removed.
- Messages to ensure sync state were removed.
- Added [`State`](modules/state.js) class to handle synchronized room state.
- Added `toJSON` method on `state`, `bulled`, `pickable`, and `tank` to expose
  public data to the clients.
- [View room handler](rooms/battle_room.js)

**What has been changed in the client?**

- Removed `users.js` (used to manage user-related events)
- Removed specific game event handling (`init`, `tank.new`, `tank.delete`, `user.add`, `user.sync`, `user.remove`, `user.name`)
- Modified `update` event to handle Colyseus room patched state
- [View client](frontend/client.js#L44-L94)

## Related links

**Tanx**

- [forked tanx project](https://playcanvas.com/project/367035/overview/tanxcolyseus)
- [original tanx game](http://playcanv.as/p/aP0oxhUr)
- [original tanx server](https://github.com/Maksims/tanx)

**Colyseus**

- [Colyseus Server](https://github.com/gamestdio/colyseus)
- [Colyseus JavaScript Client](https://github.com/gamestdio/colyseus.js)

## License

See LICENSE file.
