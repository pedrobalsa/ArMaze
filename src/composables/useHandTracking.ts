import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { ref, shallowRef } from 'vue';

export function useHandTracking() {
  const handLandmarker = shallowRef<HandLandmarker | null>(null);
  const results = ref<HandLandmarkerResult | null>(null);
  const isLoaded = ref(false);

  async function init() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      handLandmarker.value = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      isLoaded.value = true;
    } catch (error) {
      console.error('Error initializing HandLandmarker:', error);
    }
  }

  function detect(video: HTMLVideoElement, startTimeMs: number) {
    if (handLandmarker.value) {
      const res = handLandmarker.value.detectForVideo(video, startTimeMs);
      results.value = res;
    }
  }

  return {
    init,
    detect,
    results,
    isLoaded,
  };
}

