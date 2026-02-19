const { io } = require('socket.io-client')

const socket = () =>
  io(process.env.REACT_APP_SOCKET_URL || window.location.origin, {
    path: '/socket.io/',
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    forceNew: false,
    credentials: true
  })

module.exports = { socket }