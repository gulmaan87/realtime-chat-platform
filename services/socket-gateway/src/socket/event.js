module.exports = (socket) => {
    socket.on("ping", () => {
      socket.emit("pong");
    });
  };
  