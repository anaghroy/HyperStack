import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    title: {
        type: String,
        default: "Untitled Project"
    },
    githubUrl: {
        type: String,
        default: ""
    },
    installCmd: {
        type: String,
        default: ""
    },
    startCmd: {
        type: String,
        default: ""
    },
    port: {
        type: Number,
        default: 5173
    },
    collaborators: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
                required: true
            },
            role: {
                type: String,
                enum: ['Editor', 'Viewer'],
                default: 'Viewer'
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
});

const Project = mongoose.model('project', projectSchema);

export default Project;