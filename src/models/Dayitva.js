import mongoose from "mongoose";

const DayitvaSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true }


});

export default mongoose.model("Dayitva", DayitvaSchema);
