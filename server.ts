import * as http from 'http';
import * as WebSocket from 'ws';
import 'dotenv/config';
import {msgType, Alert} from './Interfaces/interfaces';
import UserMap from './DataStructures/UserMap';
import {initialUriVerify} from './baseLib/baselib';
import mongoose from 'mongoose';
import UserModel from './userModel';
const PORT: number = 8999;

var UsersOnline: UserMap = new UserMap();

const server = http.createServer((reg, res) => console.log("reveived a message"));

const WsServer = new WebSocket.Server({
    server
});

//@ts-ignore
const URI: string = process.env.DB_URI;
mongoose.connect(URI,
    {useNewUrlParser: true, useUnifiedTopology: true},
    (err) => {
        if (err) {
            console.log("Error:", err);
        }
        else {
            console.log("Connected to DB:", URI);
        }
    }
)

WsServer.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {

    ws.on('close', (code: number, info: string) => {
        console.log("close info:", code, info);
    });

    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {

        const msg: any = JSON.parse(message);
        
        switch(msg.method) {
            case 'close':
                UsersOnline.removeUser(msg.id);
                console.log("close connection, user id:", msg.id);
                break;
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
                const fun = async () => {

                    let user: any = await UserModel.findById(msg.toId);
                    if (!user)  return;
                    
                    const invitePayload: Alert = {
                        topic: "Zaprosznie do znajomych",
                        info: `${msg.fromName} wysyła ci zaproszenie do grona znajomych`,
                        fromId: msg.fromId,
                        toId: msg.toId
                    }

                    UserModel.updateOne(
                        { _id: msg.toId }, 
                        { $push: { notifications: invitePayload } },
                        {new: true},
                        async (err: any, user: any) => {
                            if (err) {
                                console.warn("DB ERROR", err)
                            } else {
                                if (user) {
                                    console.log("succes alert Add", user);
                                }
                                else {
                                    console.warn("DB ERROR", user);
                                }
                            }
                        }
                    );

                    if (user.status != 'niedostępny') {
                        UsersOnline.sendToUser(msg.toId, "Alert", invitePayload);
                        console.log("sending Alert:", invitePayload);
                    }
                };

                fun();
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
        //@ts-ignore
        const userInfo = initialUriVerify(req.url);
        if (userInfo === undefined) {
            const errMsg: msgType = {method: "ERROR", info:"Brak dostępu - nie rozpoznano użytkownika"}; 
            ws.close(1000, JSON.stringify(errMsg));
        }
        else {
            let userDbInfo = await UserModel.findOne(
                {_id: userInfo},
                '-_id name status email friends chats notifications desc icon joinTime groups'
                );
            ws.send(JSON.stringify({
                method: 'loginPayload',
                payload: userDbInfo
            }));
            console.log("new user connected:", userInfo);
            UsersOnline.addUser(userInfo, ws);
        }
    }

    firstConnect();
    //send immediatly a feedback to the incoming connection
});

//start our server
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT} |0_0|`);
});