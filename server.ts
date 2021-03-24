import * as http from 'http';
import * as WebSocket from 'ws';
import 'dotenv/config';
import {msgType, Alert, FriendInfo} from './Interfaces/interfaces';
import UserMap from './DataStructures/UserMap';
import {initialUriVerify} from './baseLib/baselib';
import mongoose from 'mongoose';
import UserModel from './userModel';
import { isRegularExpressionLiteral } from 'typescript';
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
                const closeAction = async () => {
                    
                    UserModel.updateOne(
                        {_id: msg.id},
                        {status: "niedostępny"},
                        {new: true},
                        async (err: any, user: any) => {
                            if (err) {
                                console.warn("DB ERROR", err)
                            } else {
                                if (user) {
                                    console.log("succes status change", user);
                                }
                                else {
                                    console.warn("DB ERROR", user);
                                }
                            }
                        });
                    
                    UsersOnline.removeUser(msg.id);
                    console.log("close connection, user id:", msg.id);
                    
                    const userInfo = (await UserModel.findById(msg.id))?.toObject();

                    if (!userInfo)  return;
                    
                    //@ts-ignore
                    for (let friend of userInfo.friends) {
                        UsersOnline.sendToUser(friend.id, 'friendStatusUpdate', {id: msg.id, status:"niedostępny"});
                    }
                };

                closeAction();
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
            case 'markAlertsOld':
                const f = async () => {
                    const user = await UserModel.findById(msg.who);
                    //@ts-ignore
                    let oldAlerts = user.notifications;
                    for (const old of oldAlerts) {
                        for (const id of msg.alerts) {
                            if (id === old.id) {
                                old.new = false;
                            }
                        }
                    }

                    UserModel.updateOne(
                        { _id: msg.who }, 
                        { notifications: oldAlerts },
                        {new: true},
                        async (err: any, user: any) => {
                            if (err) {
                                console.warn("DB ERROR", err)
                            } else {
                                if (user) {
                                    console.log("succes alerts replace", user);
                                }
                                else {
                                    console.warn("DB ERROR", user);
                                }
                            }
                        }
                    );
                }

                f();
                break;
            case 'deleteAlert':
                // userId, alertId
                const action = async () => {
                    const user = await UserModel.findById(msg.userId);
                    //@ts-ignore
                    let oldAlerts = user.notifications;
                    oldAlerts = oldAlerts.filter((alert:any) => {return alert.id != msg.alertId});

                    UserModel.updateOne(
                        { _id: msg.userId }, 
                        { notifications: oldAlerts },
                        {new: true},
                        async (err: any, user: any) => {
                            if (err) {
                                console.warn("DB ERROR", err)
                            } else {
                                if (user) {
                                    console.log("succes alerts remove", user);
                                }
                                else {
                                    console.warn("DB ERROR", user);
                                }
                            }
                        }
                    );
                }

                action();
                break;
            case 'friendInvite':
                const inviteFriendFun = async () => {

                    let user: any = await UserModel.findById(msg.toId);
                    
                    if (!user || user.friends.includes(msg.toId))  return;
                    
                    // check if friend request was allready sent
                    if (user.notifications.find((alert:any)=>{return alert.topic === 'Zaproszenie do znajomych' && alert.fromId === msg.fromId}) !== undefined)
                        return;


                    const invitePayload: Alert = {
                        topic: "Zaprosznie do znajomych",
                        info: `${msg.fromName} wysyła ci zaproszenie do grona znajomych`,
                        fromId: msg.fromId,
                        toId: msg.toId,
                        id: Math.random().toString(36).substr(2, 4),
                        new: true
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

                inviteFriendFun();
                break;
            case 'acceptFriend':
                const acceptAction = async () => {
                    let requestAuthor: any = await UserModel.findById(msg.who);
                    let invAuthor: any = await UserModel.findById(msg.fromId);

                    const addFriend = async (firstUsr: any, secondUsr: any, newFriendId: string) => {
                        if (!firstUsr.friends.includes(secondUsr._id)) {
                            let newFriends = [...firstUsr.friends, {id: newFriendId}];
                            //newFriends.push(secondUsr.id);
                            console.log("newFriends:", newFriends);
                            UserModel.updateOne(
                                { _id: firstUsr._id}, 
                                { friends: newFriends },
                                {new: true},
                                async (err: any, info: any) => {
                                    if (err) {
                                        console.warn("DB ERROR", err)
                                    } else {
                                        if (info) {
                                            console.log("succes friend Add", info);
                                        }
                                        else {
                                            console.warn("DB ERROR", info);
                                        }
                                    }
                                }
                            );
    
                            const friendInfo: FriendInfo = {
                                id: newFriendId,
                                name: secondUsr.name,
                                status: secondUsr.status,
                                desc: secondUsr.desc,
                                icon: secondUsr.icon,
                                joinTime: secondUsr.joinTime,
                            };
    
                            UsersOnline.sendToUser(firstUsr._id, 'newFriend', friendInfo);
                        }
                    };

                    addFriend(requestAuthor, invAuthor, msg.fromId);
                    addFriend(invAuthor, requestAuthor, msg.who);
                };
                acceptAction();
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
            await UserModel.updateOne(
                {_id: userInfo},
                {status: "dostępny"},
            );
            let userDbInfo = (await UserModel.findOne(
                {_id: userInfo},
                '-_id name status email friends chats notifications desc icon joinTime groups'
                ))?.toObject();

            if (!userDbInfo) {
                ws.close(1000, JSON.stringify({method: "ERROR", info:"Brak dostępu - nie rozpoznano użytkownika"}));
                return;
            }

            let firendsData: Array<any> = [];
            //@ts-ignore
            for (let friend of userDbInfo.friends) {
                UsersOnline.sendToUser(friend.id, 'friendStatusUpdate', {id: userInfo, status:"dostępny"});
                const getFriend = async () => {firendsData.push(await UserModel.findById(friend.id, 'name status desc icon joinTime'))};
                await getFriend();
            }
            //@ts-ignore
            userDbInfo.friends = firendsData;
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