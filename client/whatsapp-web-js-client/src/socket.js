const { io } = require('socket.io-client')

const socket = () =>
  io(process.env.REACT_APP_SOCKET_URL || window.location.origin, {
    path: '/socket.io',
    transports: ['websocket']
  })

module.exports = { socket }