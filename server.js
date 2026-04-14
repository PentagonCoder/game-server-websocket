const { WebSocketServer } = require('ws');
const url = require('url');

const PORT = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });

// store all clients
const clients = [];

wss.on('connection', (ws, request) => {
  // get username from URL
  const { username } = url.parse(request.url, true).query;

  if (!username) {
    ws.close(1008, 'username is required');
    return;
  }

  // attach data to ws object (VERY IMPORTANT TRICK)
  ws.username = username;
  ws.state = { x: 0, z: 0, rotation: 0 };
  ws.hitCount = 0;

  console.log(`${username} connected`);

  ws.send('You are now connected!');

  // add client
  clients.push(ws);

  broadcast();

  // when message comes
  ws.on('message', (data) => {
    let parsedData;

    try {
      parsedData = JSON.parse(data.toString());
    } catch (err) {
      console.error('Invalid JSON from client:', ws.username);
      return;
    }

    if (!parsedData || typeof parsedData !== 'object') {
      return;
    }

    if (parsedData.type === 'hit') {
      const targetUsername = parsedData.target;

      if (!targetUsername) return;

      // find target player
      const target = clients.find((c) => c.username === targetUsername);

      if (target) {
        target.hitCount += 1;

        console.log(target.username, 'hit:', target.hitCount);

        // 💀 OUT CONDITION
        if (target.hitCount >= 10) {
          console.log(`${target.username} OUT`);

          // Use an app-specific close code so the client can force logout UX.
          target.close(4001, 'eliminated');
        }
      }
      return;
    }

    const nextX = Number(parsedData.x);
    const nextZ = Number(parsedData.z);
    const nextRotation = Number(parsedData.rotation);

    // update this user's state
    ws.state = {
      x: Number.isFinite(nextX) ? nextX : 0,
      z: Number.isFinite(nextZ) ? nextZ : 0,
      rotation: Number.isFinite(nextRotation) ? nextRotation : 0,
    };

    broadcast();
  });

  // when user leaves
  ws.on('close', () => {
    console.log(`${ws.username} disconnected`);

    const index = clients.indexOf(ws);
    if (index !== -1) {
      clients.splice(index, 1);
    }

    broadcast();
  });

  // error handling
  ws.on('error', (err) => {
    console.error('Socket error:', err.message);
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);

// 🔥 broadcast function
function broadcast() {
  const allUsers = clients.map(client => ({
    username: client.username,
    state: client.state
  }));

  const message = JSON.stringify(allUsers);

  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}