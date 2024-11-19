/* Package imports */
import mongoose from "mongoose";

export const connectDB = async() => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URI);
        console.log(`Connected to database at ${connection.connection.host}`);
    }
    catch(error) {
        console.error("Error in connecting to the MongoDB database:   ", error);
        process.exit(1);
    }
}
