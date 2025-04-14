const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const PORT = process.env.PORT || 10000;

const server = new WebSocket.Server({ port: PORT }, () => {
  console.log(` Signal server running on port ${PORT}`);
});

const clients = new Map();

server.on("connection", (socket) => {
  const clientId = uuidv4().slice(0, 8);
  clients.set(clientId, { socket, username: `User-${clientId}` });

  // Send message to all clients
  const sendToAll = (data) => {
    const message = JSON.stringify(data);
    clients.forEach((client, id) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    });
  };

  // Send your own information to the client
  socket.send(JSON.stringify({
    type: "connection",
    clientId,
    username: `User-${clientId}`
  }));

  // New join notification to other users
  clients.forEach((client, id) => {
    if (id !== clientId && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify({
        type: "presence",
        event: "join",
        clientId,
        username: `User-${clientId}`,
        timestamp: Date.now()
      }));
    }
  });

  socket.on("message", (rawData) => {
    try {
      const data = JSON.parse(rawData);
      
      if (data.type === "chat") {
        // Send message to all users
        sendToAll({
          type: "chat",
          message: data.message,
          senderId: clientId,
          username: clients.get(clientId).username,
          timestamp: Date.now(),
          isOwn: false // To mark your own message on the frontend
        });
      }
    } catch (error) {
      console.error(" Message parse error:", error);
    }
  });

  socket.on("close", () => {
    clients.delete(clientId);
    // Leave notification to other users
    sendToAll({
      type: "presence",
      event: "leave",
      clientId,
      username: `User-${clientId}`,
      timestamp: Date.now()
    });
  });
});