import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
   active: { type: Boolean, default: true }
});

export default mongoose.model('Role', RoleSchema);