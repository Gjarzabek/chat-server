import * as http from 'http';
import * as WebSocket from 'ws';
import 'dotenv/config';
import {msgType, Alert, FriendInfo} from './Interfaces/interfaces';
import UserMap from './DataStructures/UserMap';
import {initialUriVerify} from './baseLib/baselib';
import mongoose from 'mongoose';
import UserModel from './userModel';
import ChatModel from './chatModel';

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

function fetchChatInfo(chatDoc: any, userId: any): any {
    let chatInfo = {_id: chatDoc._id, messages: undefined, users: []};
    chatInfo.messages = chatDoc.userId === userId ? chatDoc.userMessages : chatDoc.friendMessages;
    //@ts-ignore
    chatInfo.users = [chatDoc.userId, chatDoc.friendId];
    return chatInfo;
}

function addAlert(userId: string, alertObj: Alert): void {
    UserModel.updateOne(
        { _id: userId }, 
        { $push: { notifications: alertObj } },
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
}

WsServer.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {

    ws.on('close', (code: number, info: string) => {
        console.log("close info:", code, info);
    });

    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {

        const msg: any = JSON.parse(message);
        
        switch(msg.method) {
            case 'notesChange':
                const changeNotes = async () => {
                    const userInfo = (await UserModel.findById(msg.id))?.toObject();
                    if (!userInfo)  return;

                    //@ts-ignore
                    let userFriends = userInfo.friends;
                    console.log(userFriends);

                    for (const friend of userFriends) {
                        for (let notePair of msg.newNotes) {
                            if (notePair[0] === friend.id) {
                                friend.note = notePair[1];
                            }
                        }
                    }
                    console.log(userFriends);

                    UserModel.updateOne(
                        {_id: msg.id},
                        {friends: userFriends},
                        {new: true},
                        async (err: any, user: any) => {
                            if (err) {
                                console.warn("DB ERROR", err)
                            } else {
                                if (user) {
                                    console.log("succes friends change", user);
                                }
                                else {
                                    console.warn("DB ERROR", user);
                                }
                            }
                    });
                }
                changeNotes();
                break;
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
            case 'userChange':

                const changeUser = async () => {
                    const userInfo = (await UserModel.findById(msg.id))?.toObject();
                    
                    if (!userInfo) {
                        console.error(msg);
                    }

                    if (msg.desc) {
                        UserModel.updateOne(
                            {_id: msg.id},
                            {desc: msg.desc},
                            {new: true},
                            async (err: any, user: any) => {
                                if (err) {
                                    console.warn("DB ERROR", err)
                                } else {
                                    if (user) {
                                        console.log("succes desc change", user);
                                    }
                                    else {
                                        console.warn("DB ERROR", user);
                                    }
                                }
                        });
                    }
                    else if (msg.icon) {
                        UserModel.updateOne(
                            {_id: msg.id},
                            {icon: msg.icon},
                            {new: true},
                            async (err: any, user: any) => {
                                if (err) {
                                    console.warn("DB ERROR", err)
                                } else {
                                    if (user) {
                                        console.log("succes icon change", user);
                                    }
                                    else {
                                        console.warn("DB ERROR", user);
                                    }
                                }
                        });
                    }
                    else if (msg.status) {
                        UserModel.updateOne(
                            {_id: msg.id},
                            {status: msg.status},
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
                    }
                    //@ts-ignore
                    for (const friend of userInfo.friends) {
                        UsersOnline.sendToUser(friend.id, 'friendInfoUpdate', msg);
                    }
                };
                changeUser();
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
                const deleteAlert = async () => {
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

                deleteAlert();
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
                        new: true,
                        timestamp: (new Date()).getTime()
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
                            let newFriends = [...firstUsr.friends, {id: newFriendId, note: ""}];
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
                                public: secondUsr.public
                            };
    
                            UsersOnline.sendToUser(firstUsr._id, 'newFriend', friendInfo);
                        }
                    };

                    addFriend(requestAuthor, invAuthor, msg.fromId);
                    addFriend(invAuthor, requestAuthor, msg.who);
                };
                acceptAction();
                break;
            case 'friendChatCreate':
                const chatCreate = async (userId: string, friendId: string): Promise<void> => {
                    let friendRecord: any = await UserModel.findById(friendId);

                    if (!friendRecord) {
                        console.warn('bad request');
                        return;
                    }
                    // check if chat bettween this two users allready exists
                    for (const chatId of friendRecord.chats) {
                        const chatRecord = (await ChatModel.findById(chatId))?.toObject();
                        //@ts-ignore
                        if (!chatRecord) {
                            console.error('empty chat id inside', friendId, 'chats');
                            continue;
                        }
                        //@ts-ignore
                        if (chatRecord.userId === userId && chatRecord.friendId === friendId || chatRecord.friendId === userId && chatRecord.userId === friendId) {                            
                            UsersOnline.sendToUser(userId, 'newChat', fetchChatInfo(chatRecord, userId));
                            return;
                        }
                    }

                    const newChat = new ChatModel({
                        userId: userId, friendId: friendId , userMessages: [], friendMessages: []
                    });

                    newChat.save((err: mongoose.CallbackError, doc: mongoose.Document<any, {}> | undefined) => {
                        if (err) {
                            console.warn('Failed to save chat id DB! -', err);
                        }
                        else if (!doc) {
                            console.error('Failed to save chat id DB!');
                        }
                        else {
                            console.log("Chat add success");

                            const updateUserChats = async (uId: string): Promise<void> => {
                                UserModel.updateOne(
                                    { _id: uId },
                                    { $push: { chats: doc._id } },
                                    {new: true},
                                    async (err: any, user: any) => {
                                        if (err) {
                                            console.warn("DB ERROR", err)
                                        } else {
                                            if (user) {
                                                console.log(uId, "succes updateUserChats", user);
                                            }
                                            else {
                                                console.warn("DB ERROR", user);
                                            }
                                        }
                                    }
                                );
                            }
                            const docObj = doc.toObject();
                            UsersOnline.sendToUser(userId, 'newChat', fetchChatInfo(docObj, userId));
                            UsersOnline.sendToUser(friendId, 'newChat', fetchChatInfo(docObj, friendId));
                            updateUserChats(userId);
                            updateUserChats(friendId);
                        }
                    });
                }

                chatCreate(msg.userId, msg.friendId);
                break;
            case 'message':
                const onMessage = async () => {
                    let chatObj = (await ChatModel.findById(msg.chatId))?.toObject();
                    
                    const userMessage: any = {
                        timestamp: msg.timestamp,
                        content: msg.authorData,
                        authorId: msg.userId
                    };
                    
                    const friendMessage: any = {
                        timestamp: msg.timestamp,
                        content: msg.friendData,
                        authorId: msg.userId
                    };
                    //@ts-ignore
                    const friendId = chatObj.userId !== msg.userId ? chatObj.userId : chatObj.friendId;

                    const saveMessage = async (firstUserMessages: any, secondMessages: any, firstId: string, secondId: string) => {
                        ChatModel.updateOne(
                            {_id: msg.chatId},
                            {$push: {userMessages: firstUserMessages}},
                            {new: true},
                            async (err: any, chat: any) => {
                                if (err) {
                                    console.warn("DB ERROR", err)
                                } else {
                                    if (chat) {
                                        console.log('changed chat', chat);
                                        //@ts-ignore
                                        let messages = (await ChatModel.findById(msg.chatId))?.toObject().userMessages;
                                        const newMessId = messages[messages.length - 1]._id;
                                        console.log("New message ID", newMessId);

                                        UsersOnline.sendToUser(firstId, 'messageConfirm', {
                                            tempId: msg.tempMessageId,
                                            messageId : newMessId,
                                            chatId: msg.chatId
                                        });

                                    }
                                    else {
                                        console.warn("DB ERROR", chat);
                                    }
                                }
                            }
                        );
                        ChatModel.updateOne(
                            {_id: msg.chatId},
                            {$push: {friendMessages: secondMessages}},
                            {new: true},
                            async (err: any, chat: any) => {
                                if (err) {
                                    console.warn("DB ERROR", err)
                                } else {
                                    if (chat) {
                                        console.log('changed chat', chat);
                                        //@ts-ignore
                                        let messages = (await ChatModel.findById(msg.chatId))?.toObject().friendMessages;
                                        const newMessId = messages[messages.length - 1]._id;
                                        console.log("New message ID", newMessId);
                                        if (!UsersOnline.isOnline(secondId)) {
                                            addAlert(secondId, {
                                                topic: "Message",
                                                info: `Wiadomość od ${msg.userId}`,
                                                fromId: msg.userId,
                                                id: Math.random().toString(36).substr(2, 4),
                                                new: true,
                                                chatId: msg.chatId,
                                                timestamp: (new Date()).getTime()
                                            });
                                        }
                                        else {
                                            UsersOnline.sendToUser(secondId, 'newMessage', {
                                                friendId: msg.userId,
                                                chatId: msg.chatId,
                                                friendData: msg.friendData,
                                                timestamp: msg.timestamp,
                                                msgId: secondId
                                            });
                                        }
                                            return;
                                        }
                                    else {
                                        console.warn("DB ERROR", chat);
                                    }
                                }
                            }
                        );
                    };
                    console.log("chatObj", chatObj);
                    console.log("msg", msg);
                    //@ts-ignore
                    if (msg.userId === chatObj.userId) {
                        saveMessage(userMessage, friendMessage, msg.userId, friendId);
                    }
                    else {
                        saveMessage(friendMessage, userMessage, msg.userId, friendId);
                    }
                };
                onMessage();
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
        console.log('received: ', message);
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
                '-_id name status email friends chats notifications desc icon joinTime groups public'
                ))?.toObject();

            if (!userDbInfo) {
                ws.close(1000, JSON.stringify({method: "ERROR", info:"Brak dostępu - nie rozpoznano użytkownika"}));
                return;
            }

            let firendsData: Array<any> = [];
            //@ts-ignore
            for (let friend of userDbInfo.friends) {
                UsersOnline.sendToUser(friend.id, 'friendStatusUpdate', {id: userInfo, status:"dostępny"});
                const getFriend = async () => {
                    let friendObj = (await UserModel.findById(friend.id, 'name status desc icon joinTime public'))?.toObject();
                    firendsData.push({...friendObj, note: friend.note});
                };
                await getFriend();
            }
            let chatsData: Array<any> = [];
            //@ts-ignore
            for (const chatId of userDbInfo.chats) {
                let chatObj = (await ChatModel.findById(chatId))?.toObject();
                chatsData.push(fetchChatInfo(chatObj, userInfo));
            }
            //@ts-ignore
            userDbInfo.friends = firendsData;
            //@ts-ignore
            userDbInfo.chats = chatsData;
            ws.send(JSON.stringify({
                method: 'loginPayload',
                payload: userDbInfo
            }));

            console.log("new user connected:", userInfo);
            UsersOnline.addUser(userInfo, ws);
        }
    }

    firstConnect();
});

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT} |0_0|`);
});