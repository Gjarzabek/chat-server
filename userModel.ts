import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    _id: String, 
    name: String,
    status: {
        type: String,
        default: "niedostępny"
    },
    desc: String,
    icon: {
        type: String,
        default: "bird"
    },
    joinTime: String,
    password: String,
    email: {
        type: String,
        unique: true
    },
    friends: [
        {
            id: String,
            note: String
        }
    ],
    chats: [
        {id: String}
    ],
    groups: [],
    notifications: []
}, { _id: false });

export default mongoose.model('User', UserSchema, 'users');