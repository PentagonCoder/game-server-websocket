const { WebSocketServer } = require('ws');
const url = require('url');

const wss = new WebSocketServer({ port: 8080 });

// store all clients
const clients = [];

wss.on('connection', (ws, request) => {
  // get username from URL
  const { username } = url.parse(request.url, true).query;

  // attach data to ws object (VERY IMPORTANT TRICK)
  ws.username = username;
  ws.state = {};

  console.log(`${username} connected`);

  ws.send('You are now connected!');

  // add client
  clients.push(ws);

  // when message comes
  ws.on('message', (data) => {
    const parsedData = JSON.parse(data.toString());

    // update this user's state
    ws.state = parsedData;

    console.log(`${ws.username} updated state:`, ws.state);

    // broadcast to everyone
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