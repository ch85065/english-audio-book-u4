async function test() {
    const formData = new FormData();
    formData.append('scenesData', JSON.stringify([{image:'1.png', audio:null}]));
    try {
        const res = await fetch('http://localhost:5000/publish', { method: 'POST', body: formData });
        const json = await res.json();
        console.log("Response:", json);
    } catch(e) {
        console.error("Error:", e);
    }
}
test();
