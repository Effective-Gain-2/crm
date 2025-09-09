require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { changeOffline } = require('./services/UserService');


class SocketServer {
    constructor(port = 3333) {
        this.app = express();
        this.port = port;
        
        // this.userHeartbeats = new Map();

        this.server = http.createServer(this.app);

        this.io = new Server(this.server, {
            cors: {
                origin: [
                    "http://localhost:3001", 
                    "chrome-extension://ophmdkgfcjapomjdpfobjfbihojchbko",
                    "https://landing-page-teste.8rxpnw.easypanel.host",
                    "https://landing-page-front.8rxpnw.easypanel.host",
                    "https://eg-crm.effectivegain.com",
                    "https://ilhadogovernador.effectivegain.com",
                    "https://barreiras.effectivegain.com",
                    "https://campo-grande.effectivegain.com",
                    "https://porto-alegre.effectivegain.com"

                ],
                methods: ["GET", "POST", "DELETE", "PUT"],
                allowedHeaders: ["Content-Type"],
                credentials: true
            }
        });

        SocketServer.io = this.io;
        
        this.middlewares();
        this.routes();
        this.sockets();
    }

    middlewares() {
        this.app.use(express.json());
    }

    routes() {
        this.app.get('/api/test', (req, res) => {
            res.json({ message: 'Hello from server!' });
        });
    }
    
    sockets() {
        this.io.on('connection', (socket) => {

            socket.on('user_login', async (data) => {
                try {
                    const { userId, schema } = data;
                    // const { changeOnline } = require('./services/UserService');
                    
                    // await changeOnline(userId, schema);
                    socket.userId = userId;
                    socket.schema = schema;
                    
                    // this.userHeartbeats.set(`${userId}_${schema}`, Date.now());
                    
                } catch (error) {
                    console.error('Erro ao conectar usuário:', error);
                }
            });

            socket.on('join', (room) => {
                socket.join(room);
                
                if (room && typeof room === 'string' && room.length > 10) {
                    socket.join(`user_${room}`);
                }
            });

            socket.on('leave', (roomId) => {
                socket.leave(roomId);
            });


            socket.on('disconnect', async () => {
                await changeOffline(socket.userId, socket.schema);
                
                if (socket.userId && socket.schema) {
                    try {
                        // const { changeOffline } = require('./services/UserService');
                        // await changeOffline(socket.userId, socket.schema);
                        
                        // this.userHeartbeats.delete(`${socket.userId}_${socket.schema}`);
                        
                    } catch (error) {
                        console.error('Erro ao desconectar usuário:', error);
                    }
                }
            });

            socket.on('message', (message) => {
                socket.broadcast.emit('message', message);
            });

            socket.on('lembrete', (data)=>{
                socket.broadcast.emit('lembrete', data);
            })

            // socket.on('page_visibility_change', async (data) => {
            //     try {
            //         const { isVisible, userId, schema } = data;
            //         const { changeOnline, changeOffline } = require('./services/UserService');
                    
            //         console.log(`📥 Recebido evento page_visibility_change:`, { isVisible, userId, schema });
                    
            //         if (isVisible) {
            //             await changeOnline(userId, schema);
            //             this.userHeartbeats.set(`${userId}_${schema}`, Date.now());
            //             console.log(`👤 Usuário ${userId} voltou à aba (online)`);
            //         } else {
            //             await changeOffline(userId, schema);
            //             this.userHeartbeats.delete(`${userId}_${schema}`);
            //             console.log(`👤 Usuário ${userId} saiu da aba (offline)`);
            //         }
            //     } catch (error) {
            //         console.error('Erro ao atualizar status de visibilidade:', error);
            //     }
            // });

            socket.on('leadMoved', (data) => {
                socket.broadcast.emit('leadMoved', data);
            });

            socket.on('contatosImportados', (data) => {
                socket.broadcast.emit('contatosImportados', data);
            });

            // socket.on('heartbeat', async (data) => {
            //     try {
            //         const { userId, schema } = data;
            //         const { changeOnline } = require('./services/UserService');
                    
            //         await changeOnline(userId, schema);
                    
            //         this.userHeartbeats.set(`${userId}_${schema}`, Date.now());
                    
            //         console.log(`Heartbeat recebido do usuário ${userId}`);
            //     } catch (error) {
            //         console.error('Erro ao processar heartbeat:', error);
            //     }
            // });
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Servidor rodando na porta ${this.port}`);
        });

        // setInterval(async () => {
        //     const now = Date.now();
        //     const timeout = 2 * 60 * 1000; 
            
        //     for (const [key, lastHeartbeat] of this.userHeartbeats.entries()) {
        //         if (now - lastHeartbeat > timeout) {
        //             const [userId, schema] = key.split('_');
                    
        //             try {
        //                 const { changeOffline } = require('./services/UserService');
        //                 await changeOffline(userId, schema);
        //                 this.userHeartbeats.delete(key);
        //                 console.log(`⏰ Usuário ${userId} marcado como offline por timeout`);
        //             } catch (error) {
        //                 console.error(`Erro ao marcar usuário ${userId} como offline:`, error);
        //             }
        //         }
        //     }
        // }, 60000); 
    }
}

module.exports = SocketServer;
