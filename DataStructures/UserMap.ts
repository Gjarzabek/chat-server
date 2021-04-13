import { LeanDocument } from 'mongoose';
import {Alert, FriendInfo, StatusInfo, MessageConfirmation, NewMessage} from '../Interfaces/interfaces';

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

    public sendToUser(userId: string, method: string, data: MessageConfirmation | NewMessage | Alert | FriendInfo | StatusInfo | LeanDocument<any>) {
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

    public isOnline(userId: string): boolean {
        return this.onlineUsers.has(userId);
    }

}