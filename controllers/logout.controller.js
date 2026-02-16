const jwt = require("jsonwebtoken");
const UserToken = require("../models/token.schema");
const { JWT_SECRET } = require("../config/jwt");

exports.logoutUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(400).json({ message: "Token missing from request." });
    }

    jwt.verify(token, JWT_SECRET, async (err) => {
      if (err) {
        console.error("Token verification failed:", err);
        return res.status(403).json({ status: false, message: "Invalid token" });
      }

      const userToken = await UserToken.findOne({ user_id: userId });

      if (!userToken) {
        return res.status(404).json({ status: false, message: "User token not found." });
      }

      if (userToken.token !== token) {
        return res.status(403).json({ status: false, message: "Token does not match the stored token for this user." });
      }

      await UserToken.findOneAndDelete({ user_id: userId });

      res.status(200).json({ status: true, message: "User logged out successfully." });
    });
  } catch (error) {
    console.error("Error logging out user:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// exports.logoutUser = (req, res) => {
//   res.status(200).json({
//     status: true,
//     message: "Logout successful",
//   });
// };