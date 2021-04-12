import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    users: [
        {
            userId: String,
            messages: [
                {
                    timestamp: Number,
                    content: String,
                    author: {
                        id: String,
                    },
                    id: Number
                }
            ]
        }
    ],
    type: {
        type: Number
    }
}, { _id: false });

export default mongoose.model('Chat', ChatSchema, 'chats');