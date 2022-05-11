const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const customerVerificationTokenSchema = new mongoose.Schema({
 owner: {
     type: mongoose.Schema.Types.ObjectId,
     ref: 'Customer',
     required: true,
 },
 token: {
     type: String,
     required: true,
 },
 createdAt: {
     type: Date,
     expires: '10m',
     default: Date.now
 }
});

// fire a function before doc saved to db
customerVerificationTokenSchema.pre("save", async function (next) {
  if(this.isModified('token')) {
    const salt = await bcrypt.genSalt(12);
    this.token = await bcrypt.hash(this.token, salt);  
  }
  next();
});

// method to compare token
customerVerificationTokenSchema.methods.compareToken = async function (token) {
  const result = await bcrypt.compareSync(token, this.token);
  return result;
};

module.exports = mongoose.model("CustomerVerificationToken", customerVerificationTokenSchema);

