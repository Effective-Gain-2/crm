const {io} = require('socket.io-client')

const socket = () => io('http://eg-crm.effectivegain.com', {
  path: '/socket.io',
  transports: ['websocket']
});

module.exports = {
    socket
}