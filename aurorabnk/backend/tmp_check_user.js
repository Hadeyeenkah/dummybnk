const mongoose=require('mongoose');
require('dotenv').config({path:'.env'});
(async()=>{
  try{
    await mongoose.connect(process.env.MONGODB_URI);
    const User=require('./src/models/User');
    const u=await User.findOne({email:'admin@aurorabank.com'}).select('+password');
    if(!u){console.log('no user');process.exit(0);} 
    console.log('user:',u.email,'verified:',u.isVerified,'pwHashLength:',u.password?u.password.length:0);
    await mongoose.disconnect();
  }catch(e){console.error(e);process.exit(2)}
})();
