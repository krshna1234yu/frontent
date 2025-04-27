const Order = require("../models/Order");
const Notification = require("../models/Notification");

// Mock orders for fallback
const mockOrders = [
  {
    _id: 'ord1',
    user: {
      _id: 'user1',
      name: 'John Smith',
      email: 'john.smith@example.com'
    },
    orderItems: [
      {
        product: {
          _id: 'mock1',
          title: 'Pink Roses Bouquet',
          price: 49.99,
          image: 'uploads/pink_roses.jpg'
        },
        quantity: 1,
        price: 49.99
      },
      {
        product: {
          _id: 'mock2',
          title: 'Luxury Chocolate Box',
          price: 29.99,
          image: 'uploads/chocolate_box.jpg'
        },
        quantity: 2,
        price: 59.98
      }
    ],
    shippingAddress: {
      address: '123 Main St',
      city: 'New York',
      postalCode: '10001',
      country: 'USA'
    },
    paymentMethod: 'cash on delivery',
    totalPrice: 109.97,
    status: 'pending',
    createdAt: new Date('2023-05-01'),
    updatedAt: new Date('2023-05-01')
  },
  {
    _id: 'ord2',
    user: {
      _id: 'user2',
      name: 'Jane Doe',
      email: 'jane.doe@example.com'
    },
    orderItems: [
      {
        product: {
          _id: 'mock3',
          title: 'Personalized Photo Frame',
          price: 34.99,
          image: 'uploads/photo_frame.jpg'
        },
        quantity: 1,
        price: 34.99
      }
    ],
    shippingAddress: {
      address: '456 Oak St',
      city: 'Los Angeles',
      postalCode: '90001',
      country: 'USA'
    },
    paymentMethod: 'credit card',
    totalPrice: 34.99,
    status: 'delivered',
    createdAt: new Date('2023-05-15'),
    updatedAt: new Date('2023-05-18')
  },
  {
    _id: 'ord3',
    user: {
      _id: 'user3',
      name: 'David Wilson',
      email: 'david.wilson@example.com'
    },
    orderItems: [
      {
        product: {
          _id: 'mock5',
          title: 'Vintage Wine Bottle',
          price: 59.99,
          image: 'uploads/vintage_wine.jpg'
        },
        quantity: 1,
        price: 59.99
      },
      {
        product: {
          _id: 'mock4',
          title: 'Scented Candle Set',
          price: 24.99,
          image: 'uploads/candle_set.jpg'
        },
        quantity: 1,
        price: 24.99
      }
    ],
    shippingAddress: {
      address: '789 Pine St',
      city: 'Chicago',
      postalCode: '60601',
      country: 'USA'
    },
    paymentMethod: 'cash on delivery',
    totalPrice: 84.98,
    status: 'shipped',
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-02')
  }
];

// CREATE ORDER
exports.createOrder = async (req, res) => {
  try {
    const { customerName, email, address, phone, items, total, userId, paymentMethod } = req.body;
    
    // Validate required fields
    if (!customerName || !email || !address || !phone || !items || !total) {
      return res.status(400).json({ 
        message: "Missing required fields",
        requiredFields: "customerName, email, address, phone, items, total",
        received: Object.keys(req.body).join(', ')
      });
    }
    
    // Process items with titles and validate
    const processedItems = items.map(item => ({
      ...item,
      product: item.product || null,
      title: item.title || "Unknown Product",
      price: item.price || 0,
      quantity: item.quantity || 1,
      image: item.image || ""
    }));
    
    // Create the order
    const order = new Order({
      customerName,
      email,
      address,
      phone,
      items: processedItems,
      total,
      userId: userId || null,
      status: 'Pending',
      paymentMethod: paymentMethod || 'cod', // Default to cash on delivery
      statusUpdates: [{
        status: 'Pending',
        date: new Date(),
        time: new Date().toLocaleTimeString(),
        comments: 'Order received and is being processed.'
      }]
    });
    
    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Error creating order:', err);
    console.error("Order creation error:", err);
    res.status(400).json({ message: "Failed to create order", error: err.message });
  }
};

// GET ALL ORDERS (for admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// GET USER ORDERS
exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    
    if (!orders.length) {
      return res.json([]);
    }
    
    res.json(orders);
  } catch (err) {
    console.error("Error fetching user orders:", err);
    res.status(500).json({ message: "Failed to fetch user orders", error: err.message });
  }
};

// GET ORDER BY ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      console.log(`Order not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.json(order);
  } catch (err) {
    console.error(`Error retrieving order ${req.params.id}:`, err);
    res.status(500).json({ message: "Error retrieving order", error: err.message });
  }
};

// Update order status with status history
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    
    // Validate status
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Create a new status update
    const statusUpdate = {
      status,
      date: new Date(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      comments,
      updatedBy: req.user._id
    };
    
    // Update the order's current status
    order.status = status;
    
    // Add to status history
    if (!order.statusUpdates) {
      order.statusUpdates = [];
    }
    order.statusUpdates.push(statusUpdate);
    
    await order.save();
    
    // If order is delivered, send notification to user
    if (status === 'Delivered' && order.userId) {
      try {
        // Create a notification for the user
        const notification = new Notification({
          userId: order.userId,
          type: 'order_delivered',
          message: `Your order #${order._id.toString().slice(-8)} has been delivered. You can now rate the products!`,
          orderId: order._id,
          read: false
        });
        
        await notification.save();
        console.log(`Delivery notification created for user ${order.userId}`);
      } catch (notifError) {
        console.error('Failed to create delivery notification:', notifError);
        // Continue even if notification fails
      }
    }
    
    return res.status(200).json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ message: 'Failed to update order status' });
  }
}; 