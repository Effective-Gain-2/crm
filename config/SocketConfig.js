const http = require('http');
const socketIo = require('socket.io');

function configureSocket(io, server) {
  io.on('connection', (socket) => {

    socket.on('sendMessage', (data) => {
        io.emit('newMessage', data); 
      });

    socket.on('disconnect', () => {
    });
  });
}

module.exports = configureSocket;
