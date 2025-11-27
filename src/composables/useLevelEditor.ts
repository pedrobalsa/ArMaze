import { ref, reactive } from 'vue';
import { useGameLogic, type Level } from './useGameLogic';

// Shared editor state (Singleton)
const editingLevel = reactive<Level>({
  id: 0,
  name: "New Level",
  walls: [],
  startPos: { x: 0.1, y: 0.5 },
  endZone: { x: 0.8, y: 0.4, w: 0.1, h: 0.2 },
  isCustom: true,
});
const selectedWallIndex = ref<number | null>(null);
const isSaving = ref(false);
const newLevelName = ref("");

// Dragging state
let isDragging = false;
let dragTarget: "wall" | "start" | "end" | "resize" | "rotate" | null = null;
let dragOffset = { x: 0, y: 0 };
let dragHandle: "tl" | "br" | null = null;
let initialMouseAngle = 0;
let initialRotation = 0;

export function useLevelEditor() {
  const { gameState, customLevels, saveLevel, currentTab } = useGameLogic();

  function createNewLevel() {
    editingLevel.id = Date.now();
    editingLevel.name = "My Level " + (customLevels.value.length + 1);
    editingLevel.walls = [];
    editingLevel.startPos = { x: 0.1, y: 0.5 };
    editingLevel.endZone = { x: 0.8, y: 0.4, w: 0.1, h: 0.2 };
    gameState.value = "editing";
    selectedWallIndex.value = null;
  }

  function saveCurrentLevel() {
    newLevelName.value = editingLevel.name;
    isSaving.value = true;
  }

  function confirmSave() {
    editingLevel.name = newLevelName.value;
    saveLevel({
      ...editingLevel,
      walls: [...editingLevel.walls.map((w) => ({ ...w }))],
    });
    isSaving.value = false;
    gameState.value = "menu";
    currentTab.value = "custom";
  }

  function cancelSave() {
    isSaving.value = false;
  }

  function cancelEditing() {
    if (isSaving.value) {
      isSaving.value = false;
      return;
    }
    gameState.value = "menu";
  }

  function addWall() {
    editingLevel.walls.push({ x: 0.4, y: 0.4, w: 0.2, h: 0.05, rotation: 0 });
    selectedWallIndex.value = editingLevel.walls.length - 1;
  }

  function removeSelectedWall() {
    if (selectedWallIndex.value !== null) {
      editingLevel.walls.splice(selectedWallIndex.value, 1);
      selectedWallIndex.value = null;
    }
  }

  function getMousePos(e: MouseEvent, canvas: HTMLCanvasElement | null) {
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function handleMouseDown(e: MouseEvent, canvas: HTMLCanvasElement | null) {
    if (gameState.value !== "editing") return;
    const pos = getMousePos(e, canvas);

    // Check Start
    const dStart = Math.sqrt(
      Math.pow(pos.x - editingLevel.startPos.x, 2) +
        Math.pow(pos.y - editingLevel.startPos.y, 2)
    );
    if (dStart < 0.03) {
      isDragging = true;
      dragTarget = "start";
      return;
    }

    // Check End Zone
    const ez = editingLevel.endZone;
    if (
      pos.x > ez.x &&
      pos.x < ez.x + ez.w &&
      pos.y > ez.y &&
      pos.y < ez.y + ez.h
    ) {
      isDragging = true;
      dragTarget = "end";
      dragOffset = { x: pos.x - ez.x, y: pos.y - ez.y };
      return;
    }

    // Check Selected Wall Handles FIRST (Resize/Rotate)
    if (selectedWallIndex.value !== null) {
      const w = editingLevel.walls[selectedWallIndex.value];
      if (w) {
        const cx = w.x + w.w / 2;
        const cy = w.y + w.h / 2;

        const angle = w.rotation || 0;
        const rad = -(angle * Math.PI) / 180;
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;

        const distTL = Math.sqrt(Math.pow(lx - w.x, 2) + Math.pow(ly - w.y, 2));
        const distBR = Math.sqrt(
          Math.pow(lx - (w.x + w.w), 2) + Math.pow(ly - (w.y + w.h), 2)
        );

        const handleOffset = 0.02;
        const distRot = Math.sqrt(
          Math.pow(lx - (w.x + w.w + handleOffset), 2) + Math.pow(ly - w.y, 2)
        );

        if (distRot < 0.03) {
          isDragging = true;
          dragTarget = "rotate";
          initialMouseAngle = Math.atan2(pos.y - cy, pos.x - cx);
          initialRotation = w.rotation || 0;
          return;
        }

        if (distTL < 0.03) {
          isDragging = true;
          dragTarget = "resize";
          dragHandle = "tl";
          return;
        }
        if (distBR < 0.03) {
          isDragging = true;
          dragTarget = "resize";
          dragHandle = "br";
          return;
        }
      }
    }

    // Check Walls (Selection/Move)
    for (let i = editingLevel.walls.length - 1; i >= 0; i--) {
      const w = editingLevel.walls[i];
      if (!w) continue;

      const cx = w.x + w.w / 2;
      const cy = w.y + w.h / 2;

      const angle = w.rotation || 0;
      const rad = -(angle * Math.PI) / 180;
      const dx = pos.x - cx;
      const dy = pos.y - cy;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;

      if (lx > w.x && lx < w.x + w.w && ly > w.y && ly < w.y + w.h) {
        selectedWallIndex.value = i;
        isDragging = true;
        dragTarget = "wall";
        dragOffset = { x: pos.x - cx, y: pos.y - cy };
        return;
      }
    }

    selectedWallIndex.value = null;
  }

  function handleMouseMove(e: MouseEvent, canvas: HTMLCanvasElement | null) {
    if (!isDragging || gameState.value !== "editing") return;
    const pos = getMousePos(e, canvas);

    if (dragTarget === "start") {
      editingLevel.startPos.x = pos.x;
      editingLevel.startPos.y = pos.y;
    } else if (dragTarget === "end") {
      editingLevel.endZone.x = pos.x - dragOffset.x;
      editingLevel.endZone.y = pos.y - dragOffset.y;
    } else if (selectedWallIndex.value !== null) {
      const w = editingLevel.walls[selectedWallIndex.value];
      if (!w) return;

      if (dragTarget === "wall") {
        const newCx = pos.x - dragOffset.x;
        const newCy = pos.y - dragOffset.y;
        w.x = newCx - w.w / 2;
        w.y = newCy - w.h / 2;
      } else if (dragTarget === "resize") {
        const cx = w.x + w.w / 2;
        const cy = w.y + w.h / 2;
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const angle = w.rotation || 0;
        const rad = -(angle * Math.PI) / 180;
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);

        if (dragHandle === "br") {
          w.w = Math.abs(localDx * 2);
          w.h = Math.abs(localDy * 2);
          w.x = cx - w.w / 2;
          w.y = cy - w.h / 2;
        } else if (dragHandle === "tl") {
          w.w = Math.abs(localDx * 2);
          w.h = Math.abs(localDy * 2);
          w.x = cx - w.w / 2;
          w.y = cy - w.h / 2;
        }
      } else if (dragTarget === "rotate") {
        const cx = w.x + w.w / 2;
        const cy = w.y + w.h / 2;
        const currentAngle = Math.atan2(pos.y - cy, pos.x - cx);
        const delta = currentAngle - initialMouseAngle;
        const deg = (delta * 180) / Math.PI;
        w.rotation = (initialRotation + deg) % 360;
      }
    }
  }

  function handleMouseUp() {
    isDragging = false;
    dragTarget = null;
  }

  return {
    editingLevel,
    selectedWallIndex,
    isSaving,
    newLevelName,
    createNewLevel,
    saveCurrentLevel,
    confirmSave,
    cancelSave,
    cancelEditing,
    addWall,
    removeSelectedWall,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
}

