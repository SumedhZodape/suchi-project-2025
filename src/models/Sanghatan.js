import mongoose from 'mongoose';

const SanghatanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
   active: { type: Boolean, default: true }
});

export default mongoose.model('Sanghatan', SanghatanSchema);