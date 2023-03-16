import React, { useState, useEffect } from 'react';

const CHUNK_SIZE = 4096;

const AudioStreamer = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);

  const startRecording = async () => {
    setIsRecording(true);
    setTranscript([]);
  
    const ws = new WebSocket('ws://localhost:8080/');
  
    ws.onopen = () => {
      console.log('WebSocket connection established');
      ws.send('start');
    };
  
    ws.onmessage = (event) => {
      setTranscript((prevTranscript) => prevTranscript.concat(event.data));
    };
  
    ws.onclose = () => {
      setIsRecording(false);
    };
  
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000, // Set the sample rate to 16000Hz
    });
    
    const source = audioContext.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: true }));
    const processor = audioContext.createScriptProcessor(CHUNK_SIZE, 1, 1);
  
    source.connect(processor);
    processor.connect(audioContext.destination);
  
    processor.onaudioprocess = (event) => {
      if (!isRecording) return;
      const audioData = event.inputBuffer.getChannelData(0);
      ws.send(downsampleBuffer(audioData, audioContext.sampleRate, 16000));
    };
  
    return () => {
      return new Promise((resolve) => {
        setIsRecording(false);
        ws.close();
        processor.disconnect();
        source.disconnect();
        resolve();
      });
    };
  };

  const stopRecording = () => {
    setIsRecording(false);
  };
  useEffect(() => {
    let cleanup;
    if (isRecording) {
      startRecording().then((cleanupFunc) => {
        cleanup = cleanupFunc;
      });
    }
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isRecording]);

  return (
    <div>
      <h1>Audio Streamer</h1>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      <table>
          <thead>
              <tr>
                  <th>time</th>
                  <th>text</th>
              </tr>
          </thead>
          <tbody>
              {transcript.map((message) => {
                message = JSON.parse(message);
                return (<tr key={message.timestamp}>
                    <td>{message.timestamp}</td>
                    <td>{message.text}</td>
                </tr>)
              })}
          </tbody>
      </table>
    </div>
  );
};

const downsampleBuffer = (buffer, sampleRate, outSampleRate) => {
  if (outSampleRate > sampleRate) {
      console.error('downsampling rate show be smaller than original sample rate');
  }

  const sampleRateRatio = sampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  // bpsを縮める処理 (n byte分のデータを合算して、n byteで割る)
  while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);

      // 次のoffsetまでの合計を保存
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
          accum += buffer[i];
          count += 1;
      }

      // 16進数で保存 (LINEAR16でストリーミングするため)
      result[offsetResult] = Math.min(1, accum / count) * 0x7FFF;
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
  }
  return result.buffer;
};

export default AudioStreamer;
