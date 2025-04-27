/**
 * Models index file
 * 
 * This file centralizes all model exports to ensure consistent casing 
 * and prevent the "Cannot overwrite model once compiled" error
 */

const User = require('./User');
const Product = require('./Product');
const Order = require('./Order');
const Message = require('./Message');
const Notification = require('./Notification');

module.exports = {
  User,
  Product,
  Order,
  Message,
  Notification
}; 