interface MsgPayload {
    event: string
}

export interface msgType {
    method: string,
    payload?: MsgPayload
    info?: string
}

export interface ConnectedUser {
    id: string,
    connection: any
    nick: string,
    lastPing?: number,
}