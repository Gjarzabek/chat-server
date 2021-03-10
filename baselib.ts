export const initialUriParse = function(uri: string): any {
    if (uri.substr(0, 1) === "/") {
        const p = uri.lastIndexOf(":");
        if (p === -1)
            return undefined;
        
        const strNick = uri.slice(p+1);
        const strId: string = uri.slice(1, p);

        if (strId.length === 6 && strNick !== undefined) {
            return {id: strId, nick: strNick};
        }
        else return undefined;
    }
    else return undefined;
}