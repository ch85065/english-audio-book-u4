async function test() {
    const formData = new FormData();
    formData.append('scenesData', JSON.stringify([{image:'1.png', audio:'audio_0.wav'}]));
    
    // Append a dummy blob
    const blob = new Blob(['dummy audio data'], { type: 'audio/wav' });
    formData.append('audio_0.wav', blob, 'audio_0.wav');

    try {
        const res = await fetch('http://localhost:5000/publish', { method: 'POST', body: formData });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch(e) {
        console.error("Error:", e);
    }
}
test();
