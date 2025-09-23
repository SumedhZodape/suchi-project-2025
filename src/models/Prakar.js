import mongoose from 'mongoose';

const PrakarSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
   active: { type: Boolean, default: true }
});

export default mongoose.model('Prakar', PrakarSchema);