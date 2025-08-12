import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  googleId: String,
  photoURL: String,
  predictions: [
    {
      time: { type: Date, default: Date.now },
      latitude: Number,
      longitude: Number
    }
  ]
});

export default mongoose.model("User", userSchema);
