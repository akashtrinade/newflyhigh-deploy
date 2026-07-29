const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
  },
  expertEmail: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['chat', 'video-call'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  roomName: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
