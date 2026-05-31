import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    type: { type: String, required: true }, // e.g., 'SYSTEM', 'DEPLOYMENT', 'SECURITY'
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: "" } // optional link to navigate when clicked
}, { timestamps: true });

const Notification = mongoose.model('notification', notificationSchema);

export default Notification;
