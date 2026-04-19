/**
 * AudioWorklet Processor — PCM16 Converter
 * 
 * Converts Float32 audio samples from the AudioContext into
 * Int16 PCM data suitable for AssemblyAI's streaming API.
 * 
 * Runs in the AudioWorklet thread for low-latency processing.
 */

class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 1600; // 100ms at 16kHz = 1600 samples
  }

  /**
   * Process audio frames — called by the AudioWorklet runtime.
   * 
   * @param {Float32Array[][]} inputs - Input audio channels
   * @returns {boolean} true to keep the processor alive
   */
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0]; // Mono channel
    if (!channelData) return true;

    // Accumulate samples
    for (let i = 0; i < channelData.length; i++) {
      this._buffer.push(channelData[i]);
    }

    // When we have enough samples (100ms chunks), convert and send
    while (this._buffer.length >= this._bufferSize) {
      const chunk = this._buffer.splice(0, this._bufferSize);
      const pcm16Data = float32ToPCM16(chunk);

      this.port.postMessage({
        pcm16Data,
      }, [pcm16Data.buffer]); // Transfer ownership for performance
    }

    return true;
  }
}

/**
 * Convert Float32 audio samples to Int16 PCM.
 * 
 * @param {number[]} float32Samples - Array of float samples [-1.0, 1.0]
 * @returns {Int16Array} PCM16 encoded samples
 */
function float32ToPCM16(float32Samples) {
  const pcm16 = new Int16Array(float32Samples.length);
  for (let i = 0; i < float32Samples.length; i++) {
    // Clamp to [-1, 1] range and scale to Int16
    const s = Math.max(-1, Math.min(1, float32Samples[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

registerProcessor('pcm16-processor', PCM16Processor);
