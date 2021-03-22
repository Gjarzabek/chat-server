import 'dotenv/config';
import {verify} from 'jsonwebtoken';

export const initialUriVerify = function(uri: string): any {
    if (uri.substr(0, 1) === "/") {
        const strToken = uri.slice(1);

        let userCredits;
        try {
            //@ts-ignore
            userCredits = verify(strToken, process.env.ACCESS_SECRET_TOKEN);
        }
        catch (error) {
            console.log("jwtError:", error);
            return undefined;
        }
        if (!userCredits) {
            return undefined;
        }

        console.log("userCredits", userCredits);
        //@ts-ignore
        return userCredits.id;
    }
    else return undefined;
}