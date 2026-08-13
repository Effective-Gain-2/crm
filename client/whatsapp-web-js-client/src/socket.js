const { io } = require('socket.io-client')

// withCredentials: envia o cookie httpOnly de sessão no handshake —
// o servidor de socket agora exige JWT válido e restringe salas por empresa.
const socket = () => io(process.env.REACT_APP_SOCKET_URL || window.location.origin, {
    withCredentials: true,
})

module.exports = {
    socket
}
