import mongoose from "mongoose";

const AdminSetting = new mongoose.Schema({
   Final_submmission_Date: { type: Date, default: Date.now },
   year: { type: Date, default: Date.now }

})
export default mongoose.model("AdminSetting", AdminSetting)