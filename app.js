document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    const state = {
        scenes: [
            { image: '1.png', audioBlob: null, audioUrl: null },
            { image: '2.png', audioBlob: null, audioUrl: null },
            { image: '3.png', audioBlob: null, audioUrl: null }
        ],
        currentSceneIndex: 0,
        isRecording: false,
        mediaRecorder: null,
        audioChunks: [],
        playerInterval: null,
        playerAudio: new Audio()
    };

    // --- DOM Elements ---
    const screens = {
        start: document.getElementById('start-screen'),
        editor: document.getElementById('editor-screen'),
        player: document.getElementById('player-screen')
    };

    const ui = {
        startBtn: document.getElementById('start-btn'),
        // Editor
        sceneNum: document.getElementById('current-scene-num'),
        totalNum: document.getElementById('total-scenes-num'),
        sceneImg: document.getElementById('scene-image'),
        recordBtn: document.getElementById('record-btn'),
        playBtn: document.getElementById('play-btn'),
        deleteBtn: document.getElementById('delete-btn'),
        statusTxt: document.getElementById('recording-status'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        publishBtn: document.getElementById('publish-btn'),
        // Player
        playerImg: document.getElementById('player-image'),
        playerPlayBtn: document.getElementById('player-play-btn'),
        playerPrevBtn: document.getElementById('player-prev-btn'),
        playerNextBtn: document.getElementById('player-next-btn'),
        backEditBtn: document.getElementById('back-edit-btn'),
        publishNetworkBtn: document.getElementById('publish-network-btn'),
        qrContainer: document.getElementById('qr-container'),
        qrCodeImg: document.getElementById('qr-code-img'),
        publishLink: document.getElementById('publish-link')
    };

    // --- Initialization ---
    ui.totalNum.textContent = state.scenes.length;

    function switchScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        Object.values(screens).forEach(s => s.classList.add('hidden'));
        
        screens[screenName].classList.remove('hidden');
        // Small timeout to allow display:block to apply before opacity transition
        setTimeout(() => screens[screenName].classList.add('active'), 50);
    }

    ui.startBtn.addEventListener('click', () => {
        switchScreen('editor');
        loadEditorScene();
    });

    // --- Editor Logic ---
    function loadEditorScene() {
        const scene = state.scenes[state.currentSceneIndex];
        ui.sceneNum.textContent = state.currentSceneIndex + 1;
        ui.sceneImg.src = scene.image;

        // Reset UI
        ui.recordBtn.classList.remove('hidden');
        ui.recordBtn.classList.remove('recording');
        ui.recordBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        state.isRecording = false;

        if (scene.audioBlob) {
            ui.playBtn.classList.remove('hidden');
            ui.deleteBtn.classList.remove('hidden');
            ui.statusTxt.textContent = "Audio recorded for this scene.";
        } else {
            ui.playBtn.classList.add('hidden');
            ui.deleteBtn.classList.add('hidden');
            ui.statusTxt.textContent = "Ready to record.";
        }

        ui.prevBtn.disabled = state.currentSceneIndex === 0;
        
        if (state.currentSceneIndex === state.scenes.length - 1) {
            ui.nextBtn.classList.add('hidden');
            ui.publishBtn.classList.remove('hidden');
        } else {
            ui.nextBtn.classList.remove('hidden');
            ui.publishBtn.classList.add('hidden');
        }
        
        checkAllRecorded();
    }

    ui.prevBtn.addEventListener('click', () => {
        if (state.currentSceneIndex > 0) {
            state.currentSceneIndex--;
            loadEditorScene();
        }
    });

    ui.nextBtn.addEventListener('click', () => {
        if (state.currentSceneIndex < state.scenes.length - 1) {
            state.currentSceneIndex++;
            loadEditorScene();
        }
    });

    function checkAllRecorded() {
        const allRecorded = state.scenes.every(s => s.audioBlob !== null);
        if (allRecorded) {
            ui.publishBtn.classList.remove('secondary-btn');
            ui.publishBtn.classList.add('primary-btn');
            ui.publishBtn.innerHTML = '<i class="fa-solid fa-book-open"></i> Publish Book';
        } else {
            ui.publishBtn.innerHTML = '<i class="fa-solid fa-book-open"></i> Publish (Incomplete)';
            ui.publishBtn.classList.remove('primary-btn');
            ui.publishBtn.classList.add('secondary-btn');
        }
    }

    // --- Recording Logic ---
    ui.recordBtn.addEventListener('click', async () => {
        if (state.isRecording) {
            // Stop recording
            state.mediaRecorder.stopRecording(() => {
                const audioBlob = state.mediaRecorder.getBlob();
                const audioUrl = URL.createObjectURL(audioBlob);
                
                const scene = state.scenes[state.currentSceneIndex];
                scene.audioBlob = audioBlob;
                scene.audioUrl = audioUrl;

                // Release microphone
                state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                
                state.isRecording = false;
                ui.recordBtn.classList.remove('recording');
                ui.recordBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
                ui.statusTxt.textContent = "Processing audio...";
                
                loadEditorScene();
            });
        } else {
            // Start recording using RecordRTC for cross-browser WAV format
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                state.mediaRecorder = new RecordRTC(stream, {
                    type: 'audio',
                    mimeType: 'audio/wav',
                    recorderType: RecordRTC.StereoAudioRecorder,
                    desiredSampRate: 16000 // optimize size
                });

                state.mediaRecorder.startRecording();
                state.isRecording = true;
                ui.recordBtn.classList.add('recording');
                ui.recordBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
                ui.statusTxt.textContent = "Recording... Click to stop.";
                
                // Keep stream reference to stop later
                state.mediaRecorder.stream = stream;

                // Hide play/delete while recording
                ui.playBtn.classList.add('hidden');
                ui.deleteBtn.classList.add('hidden');
            } catch (err) {
                console.error("Microphone error:", err);
                alert("Recording error: " + (err.message || err));
            }
        }
    });

    ui.playBtn.addEventListener('click', () => {
        const scene = state.scenes[state.currentSceneIndex];
        if (scene.audioUrl) {
            const audio = new Audio(scene.audioUrl);
            audio.play();
            ui.playBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            ui.playBtn.disabled = true;
            
            audio.onended = () => {
                ui.playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                ui.playBtn.disabled = false;
            };
        }
    });

    ui.deleteBtn.addEventListener('click', () => {
        const scene = state.scenes[state.currentSceneIndex];
        scene.audioBlob = null;
        scene.audioUrl = null;
        loadEditorScene();
    });

    // --- Player Logic ---
    ui.publishBtn.addEventListener('click', () => {
        state.currentSceneIndex = 0;
        switchScreen('player');
        loadPlayerScene();
    });

    ui.backEditBtn.addEventListener('click', () => {
        state.playerAudio.pause();
        switchScreen('editor');
        loadEditorScene();
    });

    function loadPlayerScene() {
        const scene = state.scenes[state.currentSceneIndex];
        ui.playerImg.src = scene.image;
        
        ui.playerPrevBtn.disabled = state.currentSceneIndex === 0;
        ui.playerNextBtn.disabled = state.currentSceneIndex === state.scenes.length - 1;
        
        ui.playerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }

    ui.playerPlayBtn.addEventListener('click', () => {
        if (!state.playerAudio.paused) {
            state.playerAudio.pause();
            ui.playerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            return;
        }
        playStoryFromCurrent();
    });

    function playStoryFromCurrent() {
        const scene = state.scenes[state.currentSceneIndex];
        if (!scene.audioUrl) {
            // No audio, just wait a bit and go next
            ui.playerPlayBtn.innerHTML = '<i class="fa-solid fa-forward"></i>';
            setTimeout(goToNextPlayerScene, 3000);
            return;
        }

        ui.playerPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        state.playerAudio.src = scene.audioUrl;
        state.playerAudio.play();

        state.playerAudio.onended = () => {
            ui.playerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            goToNextPlayerScene();
        };
    }

    function goToNextPlayerScene() {
        if (state.currentSceneIndex < state.scenes.length - 1) {
            state.currentSceneIndex++;
            loadPlayerScene();
            playStoryFromCurrent();
        }
    }

    ui.playerPrevBtn.addEventListener('click', () => {
        state.playerAudio.pause();
        if (state.currentSceneIndex > 0) {
            state.currentSceneIndex--;
            loadPlayerScene();
        }
    });

    ui.playerNextBtn.addEventListener('click', () => {
        state.playerAudio.pause();
        if (state.currentSceneIndex < state.scenes.length - 1) {
            state.currentSceneIndex++;
            loadPlayerScene();
        }
    });

    // --- Network Publish & QR Code Logic ---
    ui.publishNetworkBtn.addEventListener('click', async () => {
        ui.publishNetworkBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
        ui.publishNetworkBtn.disabled = true;
        ui.qrContainer.classList.add('hidden');

        try {
            const formData = new FormData();
            
            // Generate scenes meta data
            const scenesData = state.scenes.map((s, i) => ({
                image: s.image,
                audio: s.audioBlob ? `audio_${i}.wav` : null
            }));
            
            formData.append('scenesData', JSON.stringify(scenesData));

            // Append audio blobs
            state.scenes.forEach((s, i) => {
                if (s.audioBlob) {
                    formData.append(`audio_${i}.wav`, s.audioBlob, `audio_${i}.wav`);
                }
            });

            const response = await fetch('/publish', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                ui.qrCodeImg.src = result.qrCode;
                ui.publishLink.href = result.url;
                ui.qrContainer.classList.remove('hidden');
                ui.publishNetworkBtn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Update QR Code';
                ui.publishNetworkBtn.disabled = false;
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error("Failed to publish:", err);
            alert("Error publishing the audiobook: " + (err.message || err));
            ui.publishNetworkBtn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Get QR Code';
            ui.publishNetworkBtn.disabled = false;
        }
    });
});
