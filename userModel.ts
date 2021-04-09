import mongoose from 'mongoose';
import ChatModel from './chatModel';

const UserSchema = new mongoose.Schema({
    _id: String, 
    name: String,
    password: String,
    private: {
        type: String,
        required: true
    },
    public: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "niedostępny"
    },
    email: {
        type: String,
        unique: true
    },
    friends: [
        {id: String, note: String}
    ],
    chats: [],
    notifications: [],
    desc: String,
    icon: {
        type: String,
        default: "bird"
    },
    joinTime: String
}, { _id: false });

export default mongoose.model('User', UserSchema, 'users');