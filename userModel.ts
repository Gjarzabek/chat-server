import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    _id: String, 
    name: String,
    password: String,
    status: {
        type: String,
        default: "niedostępny"
    },
    email: {
        type: String,
        unique: true
    },
    friends: [
        {id: String}
    ],
    chats: [
        {id: String}
    ],
    groups: [],
    notifications: [],
    desc: String,
    icon: {
        type: String,
        default: "bird"
    },
    joinTime: String
}, { _id: false });

export default mongoose.model('User', UserSchema, 'users');