import { ref, reactive, computed } from "vue";

export type Point = { x: number; y: number };
export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
}; // rotation in degrees

export type Level = {
  id: number;
  name: string;
  walls: Rect[];
  startPos: Point;
  endZone: Rect;
  isCustom?: boolean;
};

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "Straight Line",
    walls: [
      { x: 0, y: 0.35, w: 1, h: 0.05 }, // Top
      { x: 0, y: 0.6, w: 1, h: 0.05 }, // Bottom
    ],
    startPos: { x: 0.1, y: 0.5 },
    endZone: { x: 0.85, y: 0.4, w: 0.1, h: 0.2 },
  },
  {
    id: 2,
    name: "The Bend",
    walls: [
      { x: 0, y: 0.2, w: 0.7, h: 0.05 }, // Top Horizontal
      { x: 0, y: 0.4, w: 0.5, h: 0.05 }, // Bottom Horizontal
      { x: 0.5, y: 0.4, w: 0.05, h: 0.3 }, // Vertical Left (Inner)
      { x: 0.7, y: 0.2, w: 0.05, h: 0.6 }, // Vertical Right (Outer)
      { x: 0.5, y: 0.7, w: 0.25, h: 0.05 }, // Bottom Cap
    ],
    startPos: { x: 0.1, y: 0.3 },
    endZone: { x: 0.55, y: 0.5, w: 0.15, h: 0.15 },
  },
  {
    id: 3,
    name: "The ZigZag",
    walls: [
      { x: 0, y: 0.1, w: 1, h: 0.05 }, // Top Border
      { x: 0, y: 0.4, w: 0.85, h: 0.05 }, // Middle Wall 1
      { x: 0.15, y: 0.7, w: 0.85, h: 0.05 }, // Middle Wall 2
      { x: 0, y: 0.95, w: 1, h: 0.05 }, // Bottom Border
      { x: 0.95, y: 0.1, w: 0.05, h: 0.9 }, // Right Border
      { x: 0.4, y: 0.05, w: 0.05, h: 0.6 }, // Left Border (Lower)
    ],
    startPos: { x: 0.1, y: 0.25 },
    endZone: { x: 0.8, y: 0.8, w: 0.1, h: 0.1 },
  },
];

// Shared State (Singleton)
const currentLevelIndex = ref(0);
const gameState = ref<
  "menu" | "start" | "playing" | "won" | "lost" | "level_complete" | "editing"
>("menu");
const ballPos = reactive<Point>({ x: 0, y: 0 });
const isGrabbing = ref(false);
const currentTab = ref<"original" | "custom">("original");
const customLevels = ref<Level[]>([]);

// Load custom levels from storage immediately
try {
  const stored = localStorage.getItem("ramaze_custom_levels");
  if (stored) {
    customLevels.value = JSON.parse(stored);
  }
} catch (e) {
  console.error("Failed to load custom levels", e);
}

export function useGameLogic() {
  const displayedLevels = computed(() => {
    return currentTab.value === "original" ? LEVELS : customLevels.value;
  });

  const currentLevel = computed(
    () => displayedLevels.value[currentLevelIndex.value]
  );

  function resetLevel() {
    if (!currentLevel.value) return;
    ballPos.x = currentLevel.value.startPos.x;
    ballPos.y = currentLevel.value.startPos.y;
    gameState.value = "start";
    isGrabbing.value = false;
  }

  function selectLevel(index: number) {
    if (index >= 0 && index < displayedLevels.value.length) {
      currentLevelIndex.value = index;
      resetLevel();
    }
  }

  function saveLevel(level: Level) {
    // Generate ID
    const newLevel = { ...level, id: Date.now(), isCustom: true };
    customLevels.value.push(newLevel);
    localStorage.setItem(
      "ramaze_custom_levels",
      JSON.stringify(customLevels.value)
    );
  }

  function deleteLevel(index: number) {
    customLevels.value.splice(index, 1);
    localStorage.setItem(
      "ramaze_custom_levels",
      JSON.stringify(customLevels.value)
    );
  }

  function goToMenu() {
    gameState.value = "menu";
  }

  function nextLevel() {
    if (currentLevelIndex.value < displayedLevels.value.length - 1) {
      currentLevelIndex.value++;
      resetLevel();
    } else {
      // Game Won completely
      gameState.value = "won";
    }
  }

  // Simple point in rotated rect check
  function isPointInRotatedRect(
    px: number,
    py: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    angle: number
  ) {
    // Rotate point around rect center by -angle
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;

    // Convert to radians
    const rad = -(angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = px - cx;
    const dy = py - cy;

    const localX = dx * cos - dy * sin + cx;
    const localY = dx * sin + dy * cos + cy;

    return (
      localX >= rx && localX <= rx + rw && localY >= ry && localY <= ry + rh
    );
  }

  function checkCollision(
    ballX: number,
    ballY: number,
    radius: number,
    aspectX: number,
    aspectY: number
  ): boolean {
    // Check walls
    const rX = radius;
    const rY = radius * (aspectX / aspectY);

    if (!currentLevel.value) return false;

    for (const w of currentLevel.value.walls) {
      if (w.rotation && w.rotation !== 0) {
        // Check center
        if (isPointInRotatedRect(ballX, ballY, w.x, w.y, w.w, w.h, w.rotation))
          return true;
        // Check cardinal points for radius approximation
        if (
          isPointInRotatedRect(
            ballX + rX,
            ballY,
            w.x,
            w.y,
            w.w,
            w.h,
            w.rotation
          )
        )
          return true;
        if (
          isPointInRotatedRect(
            ballX - rX,
            ballY,
            w.x,
            w.y,
            w.w,
            w.h,
            w.rotation
          )
        )
          return true;
        if (
          isPointInRotatedRect(
            ballX,
            ballY + rY,
            w.x,
            w.y,
            w.w,
            w.h,
            w.rotation
          )
        )
          return true;
        if (
          isPointInRotatedRect(
            ballX,
            ballY - rY,
            w.x,
            w.y,
            w.w,
            w.h,
            w.rotation
          )
        )
          return true;
      } else {
        // AABB check
        if (
          ballX + rX > w.x &&
          ballX - rX < w.x + w.w &&
          ballY + rY > w.y &&
          ballY - rY < w.y + w.h
        ) {
          return true;
        }
      }
    }

    // Check bounds (0-1)
    if (ballX < 0 || ballX > 1 || ballY < 0 || ballY > 1) return true;

    return false;
  }

  function checkWin(ballX: number, ballY: number) {
    if (!currentLevel.value) return false;
    const z = currentLevel.value.endZone;
    return ballX > z.x && ballX < z.x + z.w && ballY > z.y && ballY < z.y + z.h;
  }

  function resetGame() {
    currentLevelIndex.value = 0;
    resetLevel();
  }

  return {
    LEVELS,
    currentLevel,
    gameState,
    ballPos,
    isGrabbing,
    currentTab,
    customLevels,
    displayedLevels, // Exported for Menu
    resetLevel,
    nextLevel,
    resetGame,
    selectLevel,
    goToMenu,
    saveLevel,
    deleteLevel,
    checkCollision,
    checkWin,
  };
}
