interface MsgPayload {
    event: string
}

export interface msgType {
    method: string,
    payload?: MsgPayload
    info?: string
}

export interface Alert {
    topic: string,
    info?: string,
    fromId: string,
    toId?: string,
    id: string,
    new: boolean,
    chatId?: string
}

export interface FriendInfo {
    id: string,
    name: string,
    status: string,
    desc: string,
    icon: string,
    joinTime: string,
    public: string
}

export interface StatusInfo {
    id: string,
    status: string
}

export interface MessageConfirmation {
    tempId: number,
    messageId : number;
    chatId: string
}

export interface NewMessage {
    chatId: string,

}