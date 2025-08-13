// Script to promote a user to admin
const { connectDB } = require('../database/mongodb');
const User = require('../database/models/User');

async function makeAdmin(email) {
    try {
        await connectDB();
        
        const user = await User.findOne({ email: email });
        if (!user) {
            console.log(`User with email ${email} not found`);
            return;
        }
        
        user.isAdmin = true;
        await user.save();
        
        console.log(`✅ User ${email} has been promoted to admin`);
        process.exit(0);
    } catch (error) {
        console.error('Error promoting user to admin:', error);
        process.exit(1);
    }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.log('Usage: node make-admin.js <user-email>');
    console.log('Example: node make-admin.js admin@crowd.com');
    process.exit(1);
}

makeAdmin(email);