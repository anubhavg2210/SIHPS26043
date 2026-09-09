const jwt = require("jsonwebtoken");

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

function verifyToken(token) {
    return jwt.verify(
        token,
        process.env.JWT_SECRET
    );
}

module.exports = {
    generateToken,
    verifyToken
};