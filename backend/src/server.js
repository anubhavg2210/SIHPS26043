const app = require("./app");

const PORT = process.env.PORT || 5000;

console.log("🔥 SIH26043 SERVER FILE LOADED - TEST MATCHING VERSION");

app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
});