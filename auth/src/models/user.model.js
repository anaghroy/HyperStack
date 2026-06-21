import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    githubAccessToken: { type: String },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    avatar: { type: String },
    location: { type: String, default: "" },
    city: { type: String, default: "" },
    dob: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 200 },

    twoFactorEnabled: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('user', userSchema);

export default User;