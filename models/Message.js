const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  },
  attachments: [
    {
      fileUrl: String,
      fileName: String,
      fileType: String,
      fileSize: Number
    }
  ]
}, { timestamps: true });

// Create indexes for better query performance
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, read: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
module.exports = Message; 