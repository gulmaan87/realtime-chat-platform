require("dotenv").config();

module.exports = {
  port: process.env.SOCKET_PORT || 3001,
};
