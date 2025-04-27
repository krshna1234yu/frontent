const User = require("../models/User");

exports.saveCart = async (req, res) => {
  try {
    const { cart } = req.body;

    // Validate cart data
    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ message: "Cart is empty or invalid format" });
    }

    // Find the user and update their cart
    const user = await User.findById(req.user.id); // Assuming user ID is provided by JWT
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's cart in the database
    user.cart = cart; // Overwrite the existing cart
    await user.save(); // Save the updated user document

    res.json(user.cart); // Return the updated cart
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save cart", error: err.message });
  }
};
