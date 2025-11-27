<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useHandTracking } from "../composables/useHandTracking";
import { useGameLogic } from "../composables/useGameLogic";
import { useLevelEditor } from "../composables/useLevelEditor";

// UI Components
import TopBar from "./ui/TopBar.vue";
import MainMenu from "./ui/MainMenu.vue";
import LevelEditorControls from "./ui/LevelEditorControls.vue";
import GameStatusScreens from "./ui/GameStatusScreens.vue";

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const { init: initHandTracking, detect, results, isLoaded } = useHandTracking();
const {
  currentLevel,
  gameState,
  ballPos,
  isGrabbing: gameIsGrabbing,
  checkCollision,
  checkWin,
  resetLevel, // Imported resetLevel to fix ball position
} = useGameLogic();

const {
  editingLevel,
  selectedWallIndex,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
} = useLevelEditor();

let animationFrameId: number;
let stream: MediaStream | null = null;

const PINCER_THRESHOLD = 0.05;
const BALL_RADIUS = 0.03;
const GRAB_DISTANCE = 0.05;
const PINCH_GRACE_PERIOD_MS = 1000;

let pinchLostTime = 0;
let wasPinching = false;
const ripples = ref<{ x: number; y: number; age: number; id: number }[]>([]);
let rippleCounter = 0;

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      videoRef.value.onloadeddata = () => {
        gameLoop();
      };
    }
  } catch (err) {
    console.error("Error accessing webcam:", err);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

function getDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function gameLoop() {
  if (!videoRef.value || !canvasRef.value) return;

  const video = videoRef.value;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Match canvas size to video display size
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Detect hands
  detect(video, Date.now());

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Maze
  if (gameState.value === "editing") {
    drawEditor(ctx, canvas.width, canvas.height);
  } else {
    drawMaze(ctx, canvas.width, canvas.height);

    // Process Hand
    if (results.value && results.value.landmarks.length > 0) {
      const landmarks = results.value.landmarks[0];
      if (!landmarks) return;
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];

      if (thumbTip && indexTip) {
        const distance = getDistance(thumbTip, indexTip);
        const cursor = {
          x: 1 - (thumbTip.x + indexTip.x) / 2,
          y: (thumbTip.y + indexTip.y) / 2,
        };

        const isPinching = distance < PINCER_THRESHOLD;

        // Draw Cursor
        ctx.fillStyle = isPinching ? "#00ff00" : "#ffff00";
        ctx.beginPath();
        ctx.arc(
          cursor.x * canvas.width,
          cursor.y * canvas.height,
          10,
          0,
          2 * Math.PI
        );
        ctx.fill();

        // Draw Skeleton
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((1 - thumbTip.x) * canvas.width, thumbTip.y * canvas.height);
        ctx.lineTo((1 - indexTip.x) * canvas.width, indexTip.y * canvas.height);
        ctx.stroke();

        updateGame(cursor, isPinching, canvas.width, canvas.height);

        if (isPinching && !wasPinching) {
          handlePinchClick(cursor);
        }
        wasPinching = isPinching;
      }
    } else {
      wasPinching = false;
      if (gameState.value === "playing") {
        gameState.value = "lost";
      }
    }

    drawBall(ctx, canvas.width, canvas.height);
    drawRipples(ctx, canvas.width, canvas.height);

    // Visual Feedback for slipping
    if (gameState.value === "playing" && pinchLostTime > 0) {
      const elapsed = Date.now() - pinchLostTime;
      const timeLeft = Math.max(0, PINCH_GRACE_PERIOD_MS - elapsed);
      const ratio = timeLeft / PINCH_GRACE_PERIOD_MS;

      ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + 0.5 * (1 - ratio)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(
        ballPos.x * canvas.width,
        ballPos.y * canvas.height,
        BALL_RADIUS * canvas.width + 10,
        0,
        2 * Math.PI * ratio
      );
      ctx.stroke();
    }
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

function updateGame(
  cursor: { x: number; y: number },
  isPinching: boolean,
  width: number,
  height: number
) {
  if (gameState.value === "start") {
    pinchLostTime = 0;
    const distToBall = getDistance(cursor, ballPos);
    if (isPinching && distToBall < GRAB_DISTANCE) {
      gameState.value = "playing";
      gameIsGrabbing.value = true;
    }
  } else if (gameState.value === "playing") {
    if (isPinching) {
      pinchLostTime = 0;
      ballPos.x = cursor.x;
      ballPos.y = cursor.y;

      if (checkCollision(ballPos.x, ballPos.y, BALL_RADIUS, width, height)) {
        gameState.value = "lost";
      }

      if (checkWin(ballPos.x, ballPos.y)) {
        gameState.value = "level_complete";
      }
    } else {
      if (pinchLostTime === 0) {
        pinchLostTime = Date.now();
      }
      const elapsed = Date.now() - pinchLostTime;
      if (elapsed > PINCH_GRACE_PERIOD_MS) {
        gameState.value = "lost";
      }
    }
  }
}

function drawMaze(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  if (!currentLevel.value) return;
  ctx.fillStyle = "rgba(100, 100, 255, 0.5)";
  currentLevel.value.walls.forEach((w) => {
    ctx.save();
    if (w.rotation) {
      const cx = (w.x + w.w / 2) * width;
      const cy = (w.y + w.h / 2) * height;
      ctx.translate(cx, cy);
      ctx.rotate((w.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    ctx.fillRect(w.x * width, w.y * height, w.w * width, w.h * height);
    ctx.restore();
  });

  ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
  const end = currentLevel.value.endZone;
  ctx.fillRect(end.x * width, end.y * height, end.w * width, end.h * height);
  ctx.strokeStyle = "lime";
  ctx.strokeRect(end.x * width, end.y * height, end.w * width, end.h * height);
}

function drawEditor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Draw walls being edited
  editingLevel.walls.forEach((w, index) => {
    if (!w) return;
    ctx.save();
    const cx = (w.x + w.w / 2) * width;
    const cy = (w.y + w.h / 2) * height;

    if (w.rotation) {
      ctx.translate(cx, cy);
      ctx.rotate((w.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.fillStyle =
      index === selectedWallIndex.value
        ? "rgba(255, 100, 100, 0.8)"
        : "rgba(100, 100, 255, 0.5)";
    ctx.fillRect(w.x * width, w.y * height, w.w * width, w.h * height);

    // Draw outline for selected
    if (index === selectedWallIndex.value) {
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 3;
      ctx.strokeRect(w.x * width, w.y * height, w.w * width, w.h * height);

      // Draw resize handles
      const handleSize = 10;
      ctx.fillStyle = "white";
      ctx.fillRect(
        w.x * width - handleSize / 2,
        w.y * height - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.fillRect(
        (w.x + w.w) * width - handleSize / 2,
        (w.y + w.h) * height - handleSize / 2,
        handleSize,
        handleSize
      );

      // Rotation handle
      ctx.fillStyle = "#00AAFF";
      ctx.beginPath();
      const rotHandleX = (w.x + w.w) * width + 20;
      const rotHandleY = w.y * height;
      ctx.arc(rotHandleX, rotHandleY, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // Draw Start Pos
  ctx.fillStyle = "orange";
  ctx.beginPath();
  ctx.arc(
    editingLevel.startPos.x * width,
    editingLevel.startPos.y * height,
    BALL_RADIUS * width,
    0,
    2 * Math.PI
  );
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(
    "START",
    editingLevel.startPos.x * width - 20,
    editingLevel.startPos.y * height - 20
  );

  // Draw End Zone
  ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
  const end = editingLevel.endZone;
  ctx.fillRect(end.x * width, end.y * height, end.w * width, end.h * height);
  ctx.strokeStyle = "lime";
  ctx.strokeRect(end.x * width, end.y * height, end.w * width, end.h * height);
  ctx.fillStyle = "white";
  ctx.fillText("END", end.x * width, end.y * height - 10);
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.fillStyle = gameState.value === "lost" ? "red" : "orange";
  ctx.beginPath();
  ctx.arc(
    ballPos.x * width,
    ballPos.y * height,
    BALL_RADIUS * width,
    0,
    2 * Math.PI
  );
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function handlePinchClick(cursor: { x: number; y: number }) {
  ripples.value.push({
    x: cursor.x,
    y: cursor.y,
    age: 0,
    id: rippleCounter++,
  });

  const screenX = cursor.x * window.innerWidth;
  const screenY = cursor.y * window.innerHeight;

  const el = document.elementFromPoint(screenX, screenY);
  if (el && el instanceof HTMLElement) {
    if (el.tagName === "BUTTON" || el.closest("button")) {
      (el.closest("button") as HTMLElement).click();
    }
  }
}

function drawRipples(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ripples.value = ripples.value.filter((r) => r.age < 30);

  ripples.value.forEach((r) => {
    r.age++;
    const opacity = 1 - r.age / 30;
    const radius = (r.age / 30) * 50;

    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x * width, r.y * height, radius, 0, 2 * Math.PI);
    ctx.stroke();
  });
}

// Mouse Event Handlers wrapper to pass canvas
const onMouseDown = (e: MouseEvent) => handleMouseDown(e, canvasRef.value);
const onMouseMove = (e: MouseEvent) => handleMouseMove(e, canvasRef.value);
const onMouseUp = () => handleMouseUp();

onMounted(async () => {
  resetLevel(); // Reset level on load to fix ball position
  await initHandTracking();
  startCamera();
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  stopCamera();
});
</script>

<template>
  <div class="relative w-full h-full">
    <!-- Video mirrored for natural interaction -->
    <video
      ref="videoRef"
      class="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
      autoplay
      playsinline
      muted
    ></video>

    <!-- Canvas -->
    <canvas
      ref="canvasRef"
      class="absolute inset-0 w-full h-full"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
    ></canvas>

    <!-- UI Layer -->
    <div class="absolute inset-0 pointer-events-none z-10 flex flex-col p-6">
      <!-- Top Bar Area -->
      <div class="w-full flex justify-between items-start min-h-[80px]">
        <TopBar
          v-if="currentLevel && gameState !== 'menu' && gameState !== 'editing'"
        >
          <template #loading>
            <div
              v-if="!isLoaded"
              class="bg-blue-600 text-white px-4 py-2 rounded animate-pulse"
            >
              Loading AI Model...
            </div>
          </template>
        </TopBar>
      </div>

      <!-- Centered Content Area -->
      <div class="flex-1 flex items-center justify-center w-full">
        <!-- Editor UI -->
        <LevelEditorControls v-if="gameState === 'editing'" />

        <!-- Status Screens (Menu, Start, Won, Lost) -->
        <MainMenu v-if="gameState === 'menu'" />
        <GameStatusScreens
          v-if="['start', 'lost', 'won', 'level_complete'].includes(gameState)"
        />
      </div>

      <!-- Bottom Spacer if needed, currently just empty div from before, but removed since flex-1 handles centering -->
    </div>
  </div>
</template>
