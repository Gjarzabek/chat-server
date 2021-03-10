import * as http from 'http';
import * as WebSocket from 'ws';
import {msgType, ConnectedUser} from './Interfaces/interfaces';
import UserMap from './DataStructures/UserMap';
import {initialUriParse} from './baseLib/baselib';

const PORT: number = 8999;
var UsersOnline: UserMap = new UserMap();

const server = http.createServer((reg, res) => console.log("reveived a message"));

const WsServer = new WebSocket.Server({
    server
});

WsServer.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {

    ws.on('close', (code: number, info: string) => {
        console.log("close info:", code, info);
    });

    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {

        const msg: msgType = JSON.parse(message);
        
        switch(msg.method) {
            case 'isAlivePing':
                /*
                payload: {
                    userId: number
                    // update last alive time if timeout disconect user
                }
                */
                break;
            case 'userchange':
                // change attributes of user and send updates to all his friends
                /*
                    payload: {
                        userid: number,
                        islogged: boolean <-- to info trzymam na serwerze w DB
                        loginTimestamp: number,
                        userInfo: {
                            desc: "" | string,
                            status: "dostepny" | "zaraz-wracam" | "zajęty",
                            icon: "bird" | "fsociety"
                        }
                    }
                */
                // and ppl that are in group with him
                break;
            case 'friendInvite':
                // send friend invite to a user of and ID
                /*
                    payload: {
                        fromId: number,
                        toId: number,
                        timestamp: number
                    }
                */
                break;
            case 'friendAccept':
                /*
                    payload: {
                        fromId: number,
                        toId: number
                    }
                */
                break;
            case 'FriendMsgForward':
                /*
                    payload: {
                        fromUserId: number
                        toUserId: number,
                        chatId: nubmer,
                        timestamp: nubmer,
                        msg: payload
                    }
                */
                break;
            case 'UniqueChatOpenRequest':
                /*
                    payload: {
                        timestamp: number,
                        fromUserId: number,
                        toUserId: number
                    }
                */
                break;
            case 'UniqueChatOpenReponse':
                /*
                    payload: {
                        isAccepted: boolean,
                        fromUserId: number,
                        toUserId: number
                        // if accepted send confirmations to users with newChatId
                    }
                */
                break;
            case 'publicRoomJoinRequest':
                /*
                    payload: {
                        userId: number,
                        roomId: number
                    }
                */
                break;
            case 'publicRoomLeave':
                /*
                */
                break;
            case 'privateGroupInvite':
                /*
                    payload: {
                        fromUserId: number,
                        toUserId: number,
                        groupId: number
                    }
                */
                break;
            case 'privateGroupJoin':
                /*
                    payload: {
                        userId: nubmer
                        groupId: number
                    }
                */
               break;
            case 'privateGroupCreate':
                /*
                    payload: {
                        adminUserId: number,
                        groupType: nubmer,
                    }
                */
                break;
            case 'privateGroupKick':
                /*
                    payload: {
                        userId: number,
                        chatId: number,
                        info: string
                    }
                */
               break;
        }

        //log the received message and send it back to the client
        console.log('received: %s', message);
    });

    const firstConnect = async () => {
        const userInfo = initialUriParse(req.url);
        if (userInfo === undefined) {
            const errMsg: msgType = {method: "ERROR", info:"Brak dostępu - nie rozpoznano użytkownika"}; 
            ws.close(1000, JSON.stringify(errMsg));
        }
        else {
            console.log("new user connected:", userInfo);
            UsersOnline.addUser(userInfo, req.socket);
        }
    }

    firstConnect();
    //send immediatly a feedback to the incoming connection
});

//start our server
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT} |0_0|`);
});