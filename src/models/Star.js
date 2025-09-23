import mongoose from 'mongoose';

const StarSchema = new mongoose.Schema({
   
  name: { type: String, required: true, unique: true },
   active: { type: Boolean, default: true }
});

export default mongoose.model('Star', StarSchema);