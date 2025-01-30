/* Package imports */
import mongoose from "mongoose";

export const connectDB = async() => {
    try {
        mongoose.set("debug", true);
        const connection = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // Wait for 10s for the server to respond
            socketTimeoutMS: 45000, // After 45 seconds of inactivity, the socket will be closed.
            maxPoolSize: 10 // Up to 10 simultaneous connections can be handled
        });
        console.log(`✅ Connected to database at ${connection.connection.host}`);
    }
    catch(error) {
        console.error("❌ Error in connecting to the MongoDB database:   ", error);
        process.exit(1);
    }
}

mongoose.connection.on("connected", () => console.log("🟢 MongoDB connected"));
mongoose.connection.on("error", (err) => console.error("🔴 MongoDB error:", err));
mongoose.connection.on("disconnected", () => console.log("🟡 MongoDB disconnected"));
