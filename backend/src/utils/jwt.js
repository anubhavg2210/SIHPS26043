const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "civicsync_sih2026_super_secret_key_998877";

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            email: user.email
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

function verifyToken(token) {
    return jwt.verify(
        token,
        JWT_SECRET
    );
}

module.exports = {
    generateToken,
    verifyToken
};