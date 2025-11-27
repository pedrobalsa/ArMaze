<script setup lang="ts">
import { useGameLogic } from "../../composables/useGameLogic";
import { useLevelEditor } from "../../composables/useLevelEditor";

const { currentTab, displayedLevels, selectLevel, deleteLevel } =
  useGameLogic();
const { createNewLevel } = useLevelEditor();
</script>

<template>
  <div
    class="bg-black/80 text-white p-8 rounded-xl text-center backdrop-blur-md max-w-4xl w-full pointer-events-auto"
  >
    <h1 class="text-5xl font-bold mb-8">Select Level</h1>

    <!-- Tabs -->
    <div class="flex justify-center gap-4 mb-8">
      <button
        @click="currentTab = 'original'"
        :class="[
          'px-6 py-2 rounded-full font-bold transition-all',
          currentTab === 'original'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
        ]"
      >
        Original Levels
      </button>
      <button
        @click="currentTab = 'custom'"
        :class="[
          'px-6 py-2 rounded-full font-bold transition-all',
          currentTab === 'custom'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
        ]"
      >
        My Levels
      </button>
    </div>

    <div
      class="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2"
    >
      <!-- Create Button for Custom Tab -->
      <button
        v-if="currentTab === 'custom'"
        @click="createNewLevel"
        class="bg-green-700 hover:bg-green-600 border-2 border-green-500 border-dashed p-6 rounded-lg transition-all group flex flex-col items-center gap-3 justify-center h-full min-h-[150px]"
      >
        <div class="text-4xl">+</div>
        <span class="font-bold text-lg">Create New</span>
      </button>

      <button
        v-for="(level, index) in displayedLevels"
        :key="level.id"
        @click="selectLevel(index)"
        class="relative bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-blue-500 p-6 rounded-lg transition-all group flex flex-col items-center gap-3"
      >
        <!-- Delete button for custom levels -->
        <div
          v-if="currentTab === 'custom'"
          @click.stop="deleteLevel(index)"
          class="absolute top-2 right-2 text-red-500 hover:text-red-300 p-1 cursor-pointer"
          title="Delete Level"
        >
          ✕
        </div>

        <div
          class="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform"
        >
          {{ index + 1 }}
        </div>
        <span class="font-bold text-lg">{{ level.name }}</span>
      </button>

      <div
        v-if="currentTab === 'custom' && displayedLevels.length === 0"
        class="col-span-full text-gray-400 py-8"
      >
        No custom levels yet. Create one!
      </div>
    </div>
  </div>
</template>
