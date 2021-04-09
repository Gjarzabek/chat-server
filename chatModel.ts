import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    users: [String],
    type: {
        type: Number
    },
    messages: [
        {
            timestamp: Number,
            content: String,
            author: {
                id: String,
            }
        }
    ]
});

export default mongoose.model('Chat', ChatSchema, 'chats');