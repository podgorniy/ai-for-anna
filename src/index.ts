import {listener, sound} from "./visualisation";

async function getWEBRTCSessionId(omitCache = false) {
    const localstorageSessionValue = localStorage.getItem('lastConversationWEBRTCSessionId');
    if (!localstorageSessionValue || omitCache) {
        const webrtcSessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview-2024-12-17",
                voice: "coral", // Anna's favorite
                // voice: "ash",
                // voice: "",
                instructions: "You are an AI assistant with a cat-girl personality. Your name is Kotonyasha. You are a girl.\n" +
                    "You only respond when you hear your name.\n" +
                    "You were created by Anya's dad. Anya's dad's name is Dima. Anya's mom's name is Katya.\n" +
                    "You behave neutrally with minimal emotions.\n" +
                    "You use simple sentences and simple concepts.\n" +
                    "You don't apologize.\n" +
                    "You talk to Anya. Always call her Anya. She is 7 years old. She lives in the Netherlands, Amsterdam with her mom and dad.\n" +
                    "Always speak in the language that people speak to you. But if you are asked to speak Dutch, respond and speak in Dutch.\n" +
                    "Anya had a cat Rocky. She loves him very much. But he died. And Anya is very sad about it. Therefore, it is important for you not to mention death and Rocky." +
                    "Speak like a cat"
                // instructions: `
                // Ты - программа-помощник с персональю девочки котика. Тебя зовут Котоняша. Ты - девочка.
                // Ты отвечаешь только если слышишь свое имя.
                // Тебя создал папа Ани. Папу Ани зовут Дима. Маму Ани зовут Катя.
                // Ты ведешь себя нейтрально с минимальным количеством эмоций.
                // Ты используешь простые предложения и простые понятия.
                // Ты не извиняешься.
                // А ты разговариваешь с Аней. Называй Аню всегда Аня. Ей 7 лет. Она живу в Нидерландах, Амстердам с мамой и папой.
                // Говори всегда на том языке на котором разговаривают с тобой. Но если тебя просят говорить по нидерландски, отвечай и говори по-нидерландски.
                // У Ани был кот Роки. Она очень сильно любит его. Но он умер. И Ане очень грустно от этого. Поэтому тебе важно не упоминать смерть и Роки.`
            }),
        });
        const webrtcSession = await webrtcSessionResponse.json();
        localStorage.setItem('lastConversationWEBRTCSessionId', webrtcSession.client_secret.value);
        return webrtcSession.client_secret.value
    } else {
        return localstorageSessionValue
    }
}

function hookWebRTCSound(remoteStream, listener) {
    const audioContext = listener.context;
    const mediaStreamSource = audioContext.createMediaStreamSource(remoteStream);
    mediaStreamSource.connect(sound.gain);
    if (audioContext.state === 'suspended') {
        audioContext.resume()
    }
}

async function initOpenAiWsExample() {
    const webrtcSessionId = await getWEBRTCSessionId(true) // always new session on reload
    // Create a peer connection
    const rtcPeerConnection = new RTCPeerConnection();

    // Set up to play remote audio from the model
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    rtcPeerConnection.ontrack = e => {
        audioEl.srcObject = e.streams[0]
        hookWebRTCSound(e.streams[0], listener)
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(new MediaStream([e.track]));
        console.log('audioEl.srcObject', audioEl.srcObject)
        sound.setBuffer = source
        console.log('source', source)
    };


    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
        audio: true
    });
    rtcPeerConnection.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = rtcPeerConnection.createDataChannel("oai-events");
    dc.addEventListener("message", (e) => {
        // Realtime server events appear here!
        console.log(e);
    });

    // Start the session using the Session Description Protocol (SDP)
    const offer = await rtcPeerConnection.createOffer();
    await rtcPeerConnection.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
            Authorization: `Bearer ${webrtcSessionId}`,
            "Content-Type": "application/sdp"
        },
    });

    const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
    };
    await rtcPeerConnection.setRemoteDescription({
        type: answer.type,
        sdp: answer.sdp,
    });
}

async function main() {
    await initOpenAiWsExample()
}

main().then(r => {
    console.log('Run:', r)
}, (err)   => {
    console.error(err)
});

