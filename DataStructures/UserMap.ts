import {Alert, FriendInfo, StatusInfo} from '../Interfaces/interfaces';

export default class UserMap {

    private onlineUsers: Map<string, any>;

    constructor() {
        this.onlineUsers = new Map<string, any>();
    }

    public addUser(userId: string, userSocket: any) : void {
        this.onlineUsers.set(userId, userSocket);
    }

    public removeUser(userId: string): void {
        this.onlineUsers.delete(userId);
    }

    public sendToUser(userId: string, method: string, data: Alert | FriendInfo | StatusInfo) {
        if (this.onlineUsers.has(userId) && data != undefined) {
            console.log("sending:", method, "to", userId);
            this.onlineUsers.get(userId)!.send(JSON.stringify(
                {
                    method: method,
                    payload: data
                }
            ));
        }
    }

}