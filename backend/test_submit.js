const axios = require("axios");

async function testSubmit() {
    try {
        console.log("Sending to backend...");
        const res = await axios.post("http://127.0.0.1:5000/api/submissions", {
            userId: "00000000-0000-0000-0000-000000000000",
            description: "test problem",
            code: "test code",
            language: "javascript",
            irOutput: "test ir",
            translatedCode: "test trans"
        });
        console.log("Response:", res.data);
    } catch (e) {
        if (e.response) {
            console.error("Backend error status:", e.response.status);
            console.error("Backend error data:", e.response.data);
        } else {
            console.error("Error making request:", e.message);
        }
    }
}

testSubmit();
