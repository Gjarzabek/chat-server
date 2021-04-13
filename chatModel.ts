import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    userId: String,
    friendId: String,
    userMessages: [
        {
            timestamp: Number,
            authorId: String,
            content: String
        }
    ],
    friendMessages: [
        {
            timestamp: Number,
            authorId: String,
            content: String
        }
    ]
});

export default mongoose.model('Chat', ChatSchema, 'chats');