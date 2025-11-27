<script setup lang="ts">
import { mdiPlus, mdiDelete, mdiCheck, mdiClose } from "@mdi/js";
import { useLevelEditor } from "../../composables/useLevelEditor";

const {
  selectedWallIndex,
  isSaving,
  newLevelName,
  addWall,
  removeSelectedWall,
  saveCurrentLevel,
  cancelEditing,
  confirmSave,
  cancelSave
} = useLevelEditor();

// Helper to create SVG path
const Icon = (path: string) => path;
</script>

<template>
  <!-- Editor UI Overlay -->
  <div
    class="pointer-events-auto absolute top-0 right-0 p-4 flex flex-col gap-4 items-end"
  >
    <!-- Floating Action Buttons -->
    <div class="flex flex-col gap-3">
      <!-- Add Wall -->
      <button
        @click="addWall"
        class="bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        title="Add Wall"
      >
        <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
          <path :d="Icon(mdiPlus)" />
        </svg>
      </button>

      <!-- Remove Wall (Conditional) -->
      <button
        v-if="selectedWallIndex !== null"
        @click="removeSelectedWall"
        class="bg-red-600 hover:bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        title="Remove Selected Wall"
      >
        <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
          <path :d="Icon(mdiDelete)" />
        </svg>
      </button>

      <!-- Finish/Save -->
      <button
        @click="saveCurrentLevel"
        class="bg-green-600 hover:bg-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        title="Finish Editing"
      >
        <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
          <path :d="Icon(mdiCheck)" />
        </svg>
      </button>

      <!-- Cancel/Exit -->
      <button
        @click="cancelEditing"
        class="bg-gray-600 hover:bg-gray-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        title="Cancel Editing"
      >
        <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
          <path :d="Icon(mdiClose)" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Save Confirmation Dialog -->
  <div
    v-if="isSaving"
    class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto"
  >
    <div
      class="bg-gray-900 p-6 rounded-xl w-96 border border-gray-700 shadow-2xl"
    >
      <h3 class="text-xl font-bold text-white mb-4">Save Level</h3>
      <input
        v-model="newLevelName"
        placeholder="Level Name"
        class="w-full bg-gray-800 text-white border border-gray-600 rounded p-2 mb-6 focus:border-blue-500 outline-none"
        @keyup.enter="confirmSave"
      />
      <div class="flex justify-end gap-3">
        <button
          @click="cancelSave"
          class="text-gray-400 hover:text-white px-4 py-2"
        >
          Cancel
        </button>
        <button
          @click="confirmSave"
          class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold"
        >
          Save
        </button>
      </div>
    </div>
  </div>

  <!-- Instructions Overlay for Editor -->
  <div
    v-if="!isSaving"
    class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white/80 px-4 py-2 rounded-full text-sm pointer-events-none backdrop-blur-sm"
  >
    Drag corners to resize • Drag blue dot to rotate • Drag center to move
  </div>
</template>

